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
                max_completion_tokens=512,
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


# ── Long-Term Memory ──────────────────────────────────────────────────────────

_LTM_EXTRACT_PROMPT = """You are extracting durable long-term facts about a corporate traveller from a conversation.
Return ONLY valid JSON array (no markdown). Each item is a memory entry:
[
  {
    "category": "travel_preferences|frequent_routes|loyalty_programs|dietary|general",
    "fact": "concise factual statement about the user, max 100 chars",
    "confidence": 0.9
  }
]
Only include facts that are likely to be useful in future conversations.
Ignore one-off requests. Return [] if nothing durable was learned.
"""

_CATEGORIES = {"travel_preferences", "frequent_routes", "loyalty_programs", "dietary", "general"}


class MemoryRetriever:
    """Loads long-term memory for a user from nva_user_memory."""

    async def load(self, username: str, db: Any) -> list[dict]:
        if db is None:
            return []
        try:
            cursor = db["nva_user_memory"].find(
                {"user": username},
                {"_id": 0},
                sort=[("updated_at", -1)],
                limit=50,
            )
            return await cursor.to_list(length=50)
        except Exception as exc:
            log.warning("LTM load failed: %s", exc)
            return []

    def format_block(self, memories: list[dict]) -> str:
        if not memories:
            return ""
        by_category: dict[str, list[str]] = {}
        for m in memories:
            cat = m.get("category", "general")
            by_category.setdefault(cat, []).append(m.get("fact", ""))

        lines = ["=== USER LONG-TERM MEMORY ==="]
        for cat, facts in by_category.items():
            lines.append(f"\n[{cat.upper().replace('_', ' ')}]")
            for f in facts:
                lines.append(f"- {f}")
        return "\n".join(lines)


class MemoryUpdater:
    """Extracts durable facts from a turn and upserts into nva_user_memory."""

    def __init__(self) -> None:
        cfg = get_agent_config("orchestrator")
        self._cfg = cfg
        self._client = _azure_client()

    async def update(
        self,
        username: str,
        conversation_id: str,
        user_message: str,
        ai_response: str,
        db: Any,
    ) -> None:
        if db is None:
            return

        deployment = self._cfg.get("deployment", "gpt-4o")
        user_prompt = (
            f"User message: {user_message[:500]}\n\n"
            f"AI response: {ai_response[:500]}"
        )
        try:
            resp = await self._client.chat.completions.create(
                model=deployment,
                messages=[
                    {"role": "system", "content": _LTM_EXTRACT_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,
                max_completion_tokens=512,
            )
            raw = resp.choices[0].message.content or "[]"
            raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
            entries: list[dict] = json.loads(raw)
        except Exception as exc:
            log.warning("LTM extraction failed: %s", exc)
            return

        if not isinstance(entries, list):
            return

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()

        for entry in entries:
            category = entry.get("category", "general")
            if category not in _CATEGORIES:
                category = "general"
            fact = str(entry.get("fact", "")).strip()
            if not fact:
                continue
            confidence = float(entry.get("confidence", 0.8))

            try:
                await db["nva_user_memory"].update_one(
                    {"user": username, "category": category, "fact": fact},
                    {"$set": {
                        "user": username,
                        "category": category,
                        "fact": fact,
                        "confidence": confidence,
                        "conversation_id": conversation_id,
                        "updated_at": now,
                    }, "$setOnInsert": {"created_at": now}},
                    upsert=True,
                )
            except Exception as exc:
                log.warning("LTM upsert failed for fact '%s': %s", fact[:40], exc)
