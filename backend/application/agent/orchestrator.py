"""OrchestratorAgent — intent classification, parallel dispatch, SSE streaming."""
from __future__ import annotations

import asyncio
import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from backend.application.agent.base import AgentContext, AgentResult, BaseAgent, _azure_client, get_prompt
from backend.application.agent.registry import get_agent_config
from backend.pipeline.streaming import build_context_block, sse

log = logging.getLogger(__name__)

CLASSIFY_PROMPT = """You are a travel assistant router. Classify the user's travel request.
Return ONLY valid JSON — no markdown, no explanation:
{
  "intent": "search_flight|search_hotel|check_policy|book|destination_info|support|general",
  "agents": ["search", "policy", "destination", "booking"],
  "reasoning": "one sentence"
}
Only include agents that are directly relevant. Omit agents that add no value for this request.
Examples:
- "Find flights to Paris" → agents: ["search", "policy"]
- "What's the visa policy for Japan?" → agents: ["destination"]
- "Book the AF009 I found earlier" → agents: ["booking", "policy"]
- "Cancel my booking" → agents: ["booking"]
- "Hello" → agents: []
"""

AGGREGATE_PROMPT = """You are navanVoyageAI, a corporate travel assistant.
Synthesise the sub-agent results below into a single, clear response for the traveller.
Be concise. Use markdown for lists and key data. Reference policy verdicts explicitly.
If any agent reported an error, acknowledge it and suggest next steps.

{context_block}

Sub-agent results:
{results_block}
"""

AGGREGATE_PROMPT_WITH_RESULTS = """You are navanVoyageAI, a corporate travel assistant.

Structured flight/hotel/car result cards are already displayed above this text in the UI.
Do NOT re-list or repeat any flight numbers, prices, airlines, hotel names, or car agencies — the traveller can see those cards.

Write a concise Policy Advisory using EXACTLY the following four markdown sections in this order.
Each section header must appear exactly as shown (icon + heading):

## 🛡️ Policy Compliance
One or two sentences: state whether the search results shown above fall within or exceed company limits; cite the specific USD limit.

## 🧳 Baggage & Fare Rules
One or two sentences: summarise company policy on baggage, advance booking windows, or class restrictions relevant to this search.

## ✈️ Type Summary
One or two sentences: note notable characteristics — non-stop vs. connecting, cabin class, room type, vehicle class, or any other relevant detail from the results.

## 💡 Recommendation
One sentence only: recommend the best option given policy compliance and value; say "the options shown above" rather than naming a specific result.

Total word count: 80–120 words. Do not start with "Here are", "I found", or "Based on".
Use **bold** for dollar amounts and policy thresholds. Do not add any extra sections.

{context_block}

Sub-agent data (for advisory context only — results are shown in cards above):
{results_block}
"""


class OrchestratorAgent(BaseAgent):
    name = "orchestrator"

    def __init__(self) -> None:
        self._cfg = get_agent_config("orchestrator")
        self._client = _azure_client()

    async def run(self, context: AgentContext) -> AgentResult:
        raise NotImplementedError("Use stream() for the orchestrator")

    async def stream(
        self,
        conversation_id: str,
        content: str,
        user: str,
        db: Any,
        custom_context: str | None = None,
    ) -> AsyncGenerator[str, None]:
        yield sse({"type": "agent_start", "agent": "orchestrator"})

        # Load recent turns + session context
        recent_turns: list[dict] = []
        session_context: dict = {}
        if db is not None:
            doc = await db["nva_conversations"].find_one({"conversation_id": conversation_id})
            if doc:
                recent_turns = doc.get("turns", [])[-5:]
                session_context = doc.get("session_context", {})

        ctx = AgentContext(
            conversation_id=conversation_id,
            user=user,
            message=content,
            session_context=session_context,
            recent_turns=recent_turns,
            db=db,
        )

        # Load long-term memory for this user
        ltm_block = ""
        try:
            from backend.application.agent.memory import MemoryRetriever
            memories = await MemoryRetriever().load(user, db)
            ltm_block = MemoryRetriever().format_block(memories)
        except Exception as exc:
            log.warning("LTM load failed: %s", exc)

        context_block = build_context_block(session_context, recent_turns, ltm_block=ltm_block)

        if custom_context:
            context_block = f"=== USER SESSION CONTEXT ===\n{custom_context}\n\n" + context_block

        # Response cache — serve identical requests without re-running agents
        _cache_key = ""
        try:
            from backend.db.response_cache import get_cached_response, get_key as _ck_fn, store_response as _store_cache  # noqa: PLC0415
            _cache_key = _ck_fn(content, user)
            cached = await get_cached_response(db, content, user)
            if cached:
                cached_content = cached.get("content", "")
                yield sse({"type": "cache_hit", "cache_key": _cache_key})
                chunk = 40
                for i in range(0, len(cached_content), chunk):
                    yield sse({"type": "token", "data": cached_content[i : i + chunk]})
                # Persist AI turn to conversation history
                _now = datetime.now(timezone.utc).isoformat()
                _ai_turn: dict = {
                    "role": "assistant",
                    "content": cached_content,
                    "timestamp": _now,
                    "agents": [],
                    "from_cache": True,
                    "cache_key": _cache_key,
                }
                if db is not None:
                    _upd: dict = {
                        "$push": {"turns": _ai_turn},
                        "$inc": {"turns_count": 1},
                        "$set": {"updated_at": _now},
                    }
                    _doc = await db["nva_conversations"].find_one({"conversation_id": conversation_id})
                    if _doc and _doc.get("title") in ("New conversation", ""):
                        _upd["$set"]["title"] = content[:60]
                    await db["nva_conversations"].update_one({"conversation_id": conversation_id}, _upd)
                yield sse({"type": "agent_done", "agent": "orchestrator"})
                yield sse({
                    "type": "done",
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "total_tokens": 0,
                    "model": "cache",
                    "from_cache": True,
                    "cache_key": _cache_key,
                })
                return
        except Exception as _exc:
            log.warning("Response cache check failed: %s", _exc)

        # Intent classification
        agent_names: list[str] = []
        classify_meta: dict = {}
        try:
            agent_names, classify_meta = await self._classify(content, context_block)
        except Exception as exc:
            log.warning("Classification failed: %s", exc)

        # Emit routing decision as handshake event
        yield sse({
            "type": "agent_route",
            "from": "orchestrator",
            "agents": agent_names,
            "intent": classify_meta.get("intent", "general"),
            "reasoning": classify_meta.get("reasoning", ""),
            "input_preview": content[:200],
        })

        # Dispatch sub-agents
        sub_results: dict[str, AgentResult] = {}
        if agent_names:
            agent_dispatch_ts: dict[str, float] = {}
            for name in agent_names:
                agent_dispatch_ts[name] = time.monotonic()
                yield sse({
                    "type": "agent_start",
                    "agent": name,
                    "input": {
                        "message": content[:300],
                        "user": user,
                        "recent_turns": len(recent_turns),
                        "session_keys": list(session_context.keys()),
                        "conversation_id": conversation_id,
                    },
                })

            tasks = {name: asyncio.create_task(self._run_sub(name, ctx)) for name in agent_names}
            for name, task in tasks.items():
                try:
                    sub_results[name] = await task
                except Exception as exc:
                    sub_results[name] = AgentResult(agent=name, content="", success=False)
                    log.warning("Sub-agent %s failed: %s", name, exc)
                latency_ms = int((time.monotonic() - agent_dispatch_ts.get(name, time.monotonic())) * 1000)
                # Emit MCP tool call/result events from sub-agent metadata
                for mcp_event in sub_results[name].metadata.get("mcp_events", []):
                    yield sse(mcp_event)
                yield sse({
                    "type": "agent_done",
                    "agent": name,
                    "latency_ms": latency_ms,
                    "output": {
                        "content": (sub_results[name].content or "")[:400],
                        "success": sub_results[name].success,
                        "has_metadata": bool(sub_results[name].metadata),
                    },
                })

        # Emit structured flight/hotel/car results for rich UI rendering
        if "search" in sub_results:
            _smeta = sub_results["search"].metadata
            _flights = _smeta.get("flight_results", [])
            if _flights:
                _max_usd = 0.0
                if "policy" in sub_results:
                    _v = sub_results["policy"].metadata.get("verdict")
                    if _v is not None:
                        _max_usd = float(getattr(_v, "max_flight_usd", 0) or 0)
                _annotated = [
                    {**f, "within_policy": (_max_usd <= 0 or f.get("price_usd", 0) <= _max_usd), "policy_limit_usd": _max_usd}
                    for f in _flights
                ]
                yield sse({"type": "flight_results", "results": _annotated})
            _hotels = _smeta.get("hotel_results", [])
            if _hotels:
                yield sse({"type": "hotel_results", "results": _hotels})
            _cars = _smeta.get("car_results", [])
            if _cars:
                yield sse({"type": "car_results", "results": _cars})

        # Tree of Thought (optional — gated by config + complexity)
        tot_context: str = ""
        if self._cfg.get("tot_enabled", False):
            try:
                from backend.application.agent.tot_strategy import _is_complex, run_tot
                if _is_complex(content):
                    results_block = "\n\n".join(
                        f"[{n.upper()}]\n{r.content}" if r.success and r.content else f"[{n.upper()}]\n(no result)"
                        for n, r in sub_results.items()
                    ) or "(no sub-agent results)"
                    async for tot_event in run_tot(content, results_block):
                        yield tot_event
                        # Capture the winning branch to inject into aggregation
                        if '"type": "tot_selected"' in tot_event:
                            try:
                                d = json.loads(tot_event[6:])
                                tot_context = d.get("content", "")
                            except Exception:
                                pass
            except Exception as exc:
                log.warning("ToT pipeline failed: %s", exc)

        # Aggregate + stream tokens
        assembled = ""
        usage: dict = {}
        async for token_event in self._aggregate_stream(content, context_block, sub_results, tot_context):
            if '"type": "token"' in token_event:
                try:
                    data = json.loads(token_event[6:])
                    assembled += data.get("data", "")
                except Exception:
                    pass
            elif '"type": "usage"' in token_event:
                try:
                    usage = json.loads(token_event[6:])
                except Exception:
                    pass
                continue  # don't forward usage event to client
            yield token_event

        # Store fresh response in cache for future identical requests
        if assembled:
            try:
                from backend.db.response_cache import store_response as _store_cache, get_key as _ck_fn  # noqa: PLC0415
                _cache_key = await _store_cache(db, content, user, assembled)
            except Exception as _exc:
                log.warning("Response cache store failed: %s", _exc)

        # Persist AI turn + update title
        now = datetime.now(timezone.utc).isoformat()
        ai_turn = {
            "role": "assistant",
            "content": assembled,
            "timestamp": now,
            "agents": [n for n in agent_names if n != "judge"],
        }
        if db is not None:
            update: dict = {
                "$push": {"turns": ai_turn},
                "$inc": {"turns_count": 1},
                "$set": {"updated_at": now},
            }
            # Set title from first user message if still default
            doc = await db["nva_conversations"].find_one({"conversation_id": conversation_id})
            if doc and doc.get("title") in ("New conversation", ""):
                update["$set"]["title"] = content[:60]
            await db["nva_conversations"].update_one({"conversation_id": conversation_id}, update)

        # Short-term memory: extract entities from window, persist to session_context
        if assembled:
            try:
                from backend.application.agent.memory import MemoryUpdater, ShortTermMemory
                all_turns = recent_turns + [
                    {"role": "user", "content": content},
                    {"role": "assistant", "content": assembled},
                ]
                await ShortTermMemory().extract_and_persist(
                    conversation_id,
                    all_turns,
                    session_context.get("entities", {}),
                    db,
                )
                # Long-term memory: fire-and-forget durable fact extraction
                asyncio.create_task(
                    MemoryUpdater().update(user, conversation_id, content, assembled, db)
                )
            except Exception as exc:
                log.warning("Memory update failed: %s", exc)

            # Audit log
            await db["nva_audit_log"].insert_one({
                "log_id": str(uuid.uuid4()),
                "conversation_id": conversation_id,
                "user": user,
                "agent": "orchestrator",
                "action": "respond",
                "input_summary": content[:200],
                "output_summary": assembled[:200],
                "latency_ms": 0,
                "token_in": 0,
                "token_out": 0,
                "model": self.deployment,
                "timestamp": now,
            })

        # Fire-and-forget JudgeAgent evaluation (non-blocking)
        if assembled:
            try:
                from backend.application.agent.judge_agent import JudgeAgent
                asyncio.create_task(
                    JudgeAgent().evaluate(conversation_id, content, assembled, db)
                )
            except Exception as exc:
                log.warning("JudgeAgent task creation failed: %s", exc)

        yield sse({"type": "agent_done", "agent": "orchestrator"})
        # Emit token counts from usage if captured, else estimate from text length
        input_tok = usage.get("input_tokens") or max(1, (len(content) + len(context_block)) // 4)
        output_tok = usage.get("output_tokens") or max(1, len(assembled) // 4)
        yield sse({
            "type": "done",
            "input_tokens": input_tok,
            "output_tokens": output_tok,
            "total_tokens": input_tok + output_tok,
            "model": self.deployment,
            "cache_key": _cache_key,
        })

    async def _classify(self, message: str, context_block: str) -> tuple[list[str], dict]:
        resp = await self._client.chat.completions.create(
            model=self.deployment,
            messages=[
                {"role": "system", "content": CLASSIFY_PROMPT},
                {"role": "user", "content": f"{context_block}\n\nUser message: {message}"},
            ],
            temperature=0.0,
            max_completion_tokens=256,
        )
        raw = resp.choices[0].message.content or "{}"
        # Strip markdown code fences if present
        raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        parsed = json.loads(raw)
        return parsed.get("agents", []), parsed

    async def _run_sub(self, name: str, ctx: AgentContext) -> AgentResult:
        """Dynamically import and run a sub-agent by name."""
        try:
            if name == "search":
                from backend.application.agent.search_agent import SearchAgent
                return await SearchAgent().run(ctx)
            if name == "policy":
                from backend.application.agent.policy_agent import PolicyAgent
                return await PolicyAgent().run(ctx)
            if name == "destination":
                from backend.application.agent.destination_agent import DestinationAgent
                return await DestinationAgent().run(ctx)
            if name == "booking":
                from backend.application.agent.booking_agent import BookingAgent
                return await BookingAgent().run(ctx)
        except ImportError:
            pass
        return AgentResult(agent=name, content="", success=False)

    async def _aggregate_stream(
        self,
        message: str,
        context_block: str,
        sub_results: dict[str, AgentResult],
        tot_context: str = "",
    ) -> AsyncGenerator[str, None]:
        # Check if structured result cards are being shown in the UI
        _smeta = sub_results.get("search", AgentResult(agent="search", content="")).metadata
        _has_structured = bool(
            _smeta.get("flight_results") or _smeta.get("hotel_results") or _smeta.get("car_results")
        )

        if _has_structured:
            # Build a compact context block for the LLM — no raw flight lists
            parts: list[str] = []
            for name, r in sub_results.items():
                if name == "search":
                    _fl = _smeta.get("flight_results", [])
                    _ht = _smeta.get("hotel_results", [])
                    _cr = _smeta.get("car_results", [])
                    summary_lines: list[str] = []
                    if _fl:
                        summary_lines.append(f"{len(_fl)} flights ({_fl[0].get('origin')}→{_fl[0].get('destination')}, {_fl[0].get('depart_date')}, {_fl[0].get('cabin_class')})")
                    if _ht:
                        summary_lines.append(f"{len(_ht)} hotels in {_ht[0].get('city', _ht[0].get('location', ''))}")
                    if _cr:
                        summary_lines.append(f"{len(_cr)} car rentals in {_cr[0].get('city', '')}")
                    parts.append("[SEARCH — results shown in cards]\n" + "\n".join(summary_lines))
                elif r.success and r.content:
                    parts.append(f"[{name.upper()} AGENT]\n{r.content}")
                else:
                    parts.append(f"[{name.upper()} AGENT]\n(no result)")
            results_block = "\n\n".join(parts) or "(no results)"
            if tot_context:
                results_block = f"[TREE OF THOUGHT]\n{tot_context}\n\n{results_block}"
            try:
                system = get_prompt("orchestrator").format(
                    context_block=context_block,
                    results_block=results_block,
                )
            except KeyError:
                system = AGGREGATE_PROMPT_WITH_RESULTS.format(
                    context_block=context_block,
                    results_block=results_block,
                )
        else:
            results_block = "\n\n".join(
                f"[{name.upper()} AGENT]\n{r.content}" if r.success and r.content
                else f"[{name.upper()} AGENT]\n(no result)"
                for name, r in sub_results.items()
            ) or "(no sub-agents called — responding directly)"
            if tot_context:
                results_block = f"[TREE OF THOUGHT — SELECTED REASONING]\n{tot_context}\n\n{results_block}"
            try:
                system = get_prompt("orchestrator").format(
                    context_block=context_block,
                    results_block=results_block,
                )
            except KeyError:
                system = AGGREGATE_PROMPT.format(
                    context_block=context_block,
                    results_block=results_block,
                )

        try:
            stream = await self._client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": message},
                ],
                temperature=float(self._cfg.get("temperature", 0.3)),
                max_completion_tokens=int(self._cfg.get("max_tokens", 2048)),
                stream=True,
                stream_options={"include_usage": True},
            )
            async for chunk in stream:
                if hasattr(chunk, "usage") and chunk.usage:
                    yield sse({
                        "type": "usage",
                        "input_tokens": chunk.usage.prompt_tokens,
                        "output_tokens": chunk.usage.completion_tokens,
                    })
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield sse({"type": "token", "data": delta})
        except Exception as exc:
            log.error("Aggregation stream error: %s", exc)
            yield sse({"type": "token", "data": f"I encountered an error: {exc}"})
