"""OrchestratorAgent — intent classification, parallel dispatch, SSE streaming."""
from __future__ import annotations

import asyncio
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from backend.application.agent.base import AgentContext, AgentResult, BaseAgent, _azure_client
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

        # Intent classification
        agent_names: list[str] = []
        try:
            agent_names = await self._classify(content, context_block)
        except Exception as exc:
            log.warning("Classification failed: %s", exc)

        # Dispatch sub-agents
        sub_results: dict[str, AgentResult] = {}
        if agent_names:
            for name in agent_names:
                yield sse({"type": "agent_start", "agent": name})

            tasks = {name: asyncio.create_task(self._run_sub(name, ctx)) for name in agent_names}
            for name, task in tasks.items():
                try:
                    sub_results[name] = await task
                except Exception as exc:
                    sub_results[name] = AgentResult(agent=name, content="", success=False)
                    log.warning("Sub-agent %s failed: %s", name, exc)
                # Emit MCP tool call/result events from sub-agent metadata
                for mcp_event in sub_results[name].metadata.get("mcp_events", []):
                    yield sse(mcp_event)
                yield sse({"type": "agent_done", "agent": name})

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
        })

    async def _classify(self, message: str, context_block: str) -> list[str]:
        resp = await self._client.chat.completions.create(
            model=self.deployment,
            messages=[
                {"role": "system", "content": CLASSIFY_PROMPT},
                {"role": "user", "content": f"{context_block}\n\nUser message: {message}"},
            ],
            temperature=0.0,
            max_tokens=256,
        )
        raw = resp.choices[0].message.content or "{}"
        # Strip markdown code fences if present
        raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        parsed = json.loads(raw)
        return parsed.get("agents", [])

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
        results_block = "\n\n".join(
            f"[{name.upper()} AGENT]\n{r.content}" if r.success and r.content
            else f"[{name.upper()} AGENT]\n(no result)"
            for name, r in sub_results.items()
        ) or "(no sub-agents called — responding directly)"

        if tot_context:
            results_block = f"[TREE OF THOUGHT — SELECTED REASONING]\n{tot_context}\n\n{results_block}"

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
                max_tokens=int(self._cfg.get("max_tokens", 2048)),
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
