"""JudgeAgent — 5-criteria LLM scoring, fire-and-forget via asyncio.create_task()."""
from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.application.agent.base import AgentContext, AgentResult, BaseAgent, get_prompt
from backend.application.agent.registry import get_agent_config

log = logging.getLogger(__name__)

_CRITERIA = [
    ("relevance", "Did the response directly address the user's actual request?"),
    ("accuracy", "Are the flight, hotel, or policy facts accurate given the provided context?"),
    ("policy_compliance", "Did the response correctly identify and flag any policy violations?"),
    ("completeness", "Were all aspects of the request covered (flights, hotels, policy, destination)?"),
    ("tone", "Is the response professional, concise, and appropriate for a corporate traveller?"),
]

_JUDGE_PROMPT = """You are an evaluator for a corporate travel AI assistant named navanVoyageAI.
Score the AI response below on 5 criteria, each from 0.0 to 1.0.
Return ONLY valid JSON (no markdown):
{
  "relevance": 0.0,
  "accuracy": 0.0,
  "policy_compliance": 0.0,
  "completeness": 0.0,
  "tone": 0.0,
  "reasoning": "one sentence overall assessment"
}

Criteria:
""" + "\n".join(f"- {name}: {desc}" for name, desc in _CRITERIA)


async def _llm_score_azure(cfg: dict, user_msg: str, ai_response: str) -> dict:
    from backend.application.agent.base import _azure_client
    client = _azure_client()
    deployment = cfg.get("deployment", os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o"))
    user_content = f"User message:\n{user_msg}\n\nAI response:\n{ai_response}"
    resp = await client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": get_prompt("judge")},
            {"role": "user", "content": user_content},
        ],
        temperature=0.0,
        max_completion_tokens=int(cfg.get("max_tokens", 512)),
    )
    raw = resp.choices[0].message.content or "{}"
    raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
    return json.loads(raw)


async def _llm_score_claude(cfg: dict, user_msg: str, ai_response: str) -> dict:
    import anthropic
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    user_content = f"User message:\n{user_msg}\n\nAI response:\n{ai_response}"
    msg = await client.messages.create(
        model="claude-opus-4-7",
        max_tokens=int(cfg.get("max_tokens", 512)),
        system=get_prompt("judge"),
        messages=[{"role": "user", "content": user_content}],
    )
    raw = msg.content[0].text if msg.content else "{}"
    raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
    return json.loads(raw)


def _compute_total(scores: dict) -> float:
    keys = [name for name, _ in _CRITERIA]
    values = [float(scores.get(k, 0.0)) for k in keys]
    return round(sum(values) / len(values), 4)


class JudgeAgent(BaseAgent):
    name = "judge"

    async def run(self, context: AgentContext) -> AgentResult:
        raise NotImplementedError("Use evaluate() for JudgeAgent")

    async def evaluate(
        self,
        conversation_id: str,
        user_msg: str,
        ai_response: str,
        db: Any,
    ) -> None:
        cfg = get_agent_config("judge")
        use_claude = cfg.get("use_claude_opus", False)
        threshold = float(cfg.get("eval_threshold", 0.75))

        try:
            if use_claude:
                scores = await _llm_score_claude(cfg, user_msg, ai_response)
            else:
                scores = await _llm_score_azure(cfg, user_msg, ai_response)
        except Exception as exc:
            log.warning("JudgeAgent scoring failed: %s", exc)
            return

        total = _compute_total(scores)
        passed = total >= threshold
        now = datetime.now(timezone.utc).isoformat()

        eval_doc = {
            "eval_id": str(uuid.uuid4()),
            "conversation_id": conversation_id,
            "scores": {k: float(scores.get(k, 0.0)) for k, _ in _CRITERIA},
            "total_score": total,
            "passed": passed,
            "reasoning": scores.get("reasoning", ""),
            "model": "claude-opus-4-7" if use_claude else cfg.get("deployment", "gpt-4o"),
            "timestamp": now,
        }

        if db is not None:
            try:
                await db["nva_eval_scores"].insert_one(eval_doc)
                # Stamp the last assistant turn with the score
                await db["nva_conversations"].update_one(
                    {"conversation_id": conversation_id},
                    {"$set": {
                        "turns.$[last].eval_score": total,
                        "turns.$[last].eval_passed": passed,
                    }},
                    array_filters=[{"last.role": "assistant"}],
                )
            except Exception as exc:
                log.warning("JudgeAgent DB write failed: %s", exc)

        log.info(
            "JudgeAgent eval conv=%s total=%.3f passed=%s",
            conversation_id, total, passed,
        )
