"""Short-term and long-term memory for navanVoyageAI agents."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from backend.application.agent.base import _azure_client
from backend.application.agent.registry import get_agent_config

log = logging.getLogger(__name__)

_ENTITY_PROMPT = """Extract travel entities from this conversation window.
Return ONLY valid JSON (no markdown):
{
  "origin": "IATA code or city or null",
  "destination": "IATA code or city or null",
  "depart_date": "YYYY-MM-DD or null",
  "return_date": "YYYY-MM-DD or null",
  "cabin_class": "Economy|Economy Plus|Business|First or null",
  "max_price": number or null,
  "adults": number or null,
  "search_hotels": false,
  "city_code": "IATA city code or null",
  "check_in": "YYYY-MM-DD or null",
  "check_out": "YYYY-MM-DD or null",
  "hotel_name": "hotel name or null",
  "hotel_rate_usd": number or null,
  "flight_number": "carrier+number or null",
  "carrier": "airline name or null",
  "price_usd": number or null,
  "user_role": "standard or null",
  "is_international": false
}
Merge and carry forward all known entities across turns. Use null for unknowns.
"""


class ShortTermMemory:
    """Extracts and persists structured entities from the conversation window."""

    def __init__(self) -> None:
        cfg = get_agent_config("orchestrator")
        stm_cfg = cfg.get("short_term_memory", {})
        self.window_turns: int = int(stm_cfg.get("window_turns", 5))
        self.max_chars: int = int(stm_cfg.get("max_chars", 2000))
        self._client = _azure_client()
        self._cfg = cfg

    async def extract_and_persist(
        self,
        conversation_id: str,
        recent_turns: list[dict],
        existing_entities: dict,
        db: Any,
    ) -> dict:
        """Extract entities from recent_turns; merge with existing; write to DB."""
        window = recent_turns[-self.window_turns:] if recent_turns else []
        if not window:
            return existing_entities

        # Build conversation text for extraction
        lines: list[str] = []
        chars = 0
        for turn in window:
            role = turn.get("role", "")
            text = turn.get("content", "")
            line = f"{role}: {text}"
            chars += len(line)
            if chars > self.max_chars:
                break
            lines.append(line)

        conversation_text = "\n".join(lines)
        existing_json = json.dumps(existing_entities) if existing_entities else "{}"
        user_prompt = (
            f"Existing entities (carry forward unless explicitly changed):\n{existing_json}\n\n"
            f"Conversation window:\n{conversation_text}"
        )

        deployment = self._cfg.get("deployment", "gpt-4o")
        try:
            resp = await self._client.chat.completions.create(
                model=deployment,
                messages=[
                    {"role": "system", "content": _ENTITY_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,
                max_tokens=512,
            )
            raw = resp.choices[0].message.content or "{}"
            raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
            new_entities = json.loads(raw)
        except Exception as exc:
            log.warning("STM entity extraction failed: %s", exc)
            return existing_entities

        # Merge: new values overwrite existing, but don't clear values with null if already set
        merged = dict(existing_entities)
        for k, v in new_entities.items():
            if v is not None:
                merged[k] = v
            elif k not in merged:
                merged[k] = v

        if db is not None:
            try:
                await db["nva_conversations"].update_one(
                    {"conversation_id": conversation_id},
                    {"$set": {"session_context.entities": merged}},
                )
            except Exception as exc:
                log.warning("STM DB write failed: %s", exc)

        return merged
