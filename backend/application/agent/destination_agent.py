"""DestinationAgent — structured JSON travel briefing via LLM."""
from __future__ import annotations

import json
import logging
import re

from backend.application.agent.base import AgentContext, AgentResult, BaseAgent

log = logging.getLogger(__name__)

_BRIEF_PROMPT = """You are a corporate travel information specialist.
Given a destination, return ONLY valid JSON (no markdown) with this exact structure:
{
  "destination": "City, Country",
  "entry_requirements": {
    "visa": "one sentence on visa requirements for US passport holders",
    "passport_validity": "minimum validity required"
  },
  "currency": {
    "code": "ISO currency code",
    "approx_rate_usd": 1.0,
    "tip": "one practical tip for cash/cards"
  },
  "climate": {
    "season": "current season description",
    "temp_c": "typical temperature range",
    "advice": "one packing/weather tip"
  },
  "safety": {
    "level": "Low or Medium or High",
    "notes": "one sentence safety summary"
  },
  "local_tips": ["tip 1", "tip 2", "tip 3"]
}
Be concise. All fields required. Use real, accurate information.
"""


def _extract_destination(context: AgentContext) -> str:
    entities = context.session_context.get("entities", {})
    dest = entities.get("destination", "")
    if dest:
        return dest
    # Simple keyword extraction from message as fallback
    msg = context.message
    for kw in ("to ", "in ", "for ", "visiting "):
        idx = msg.lower().find(kw)
        if idx != -1:
            candidate = msg[idx + len(kw):].split()[0].rstrip(".,?!").strip()
            if len(candidate) >= 2:
                return candidate
    return ""


def _format_briefing(data: dict) -> str:
    dest = data.get("destination", "Unknown")
    lines = [f"## Destination Briefing: {dest}", ""]

    entry = data.get("entry_requirements", {})
    if entry:
        lines += ["**Entry Requirements**"]
        lines += [f"- Visa: {entry.get('visa', 'N/A')}"]
        lines += [f"- Passport validity: {entry.get('passport_validity', 'N/A')}"]
        lines += [""]

    currency = data.get("currency", {})
    if currency:
        lines += ["**Currency**"]
        lines += [f"- {currency.get('code', '?')} (≈ ${currency.get('approx_rate_usd', 0):.2f} USD)"]
        lines += [f"- {currency.get('tip', '')}"]
        lines += [""]

    climate = data.get("climate", {})
    if climate:
        lines += ["**Climate**"]
        lines += [f"- {climate.get('season', '')} — {climate.get('temp_c', '')}"]
        lines += [f"- {climate.get('advice', '')}"]
        lines += [""]

    safety = data.get("safety", {})
    if safety:
        level = safety.get("level", "Unknown")
        lines += [f"**Safety:** {level}"]
        lines += [f"{safety.get('notes', '')}"]
        lines += [""]

    tips = data.get("local_tips", [])
    if tips:
        lines += ["**Local Tips**"]
        for tip in tips[:5]:
            lines += [f"- {tip}"]

    return "\n".join(lines)


class DestinationAgent(BaseAgent):
    name = "destination"

    async def run(self, context: AgentContext) -> AgentResult:
        destination = _extract_destination(context)
        if not destination:
            return AgentResult(
                agent="destination",
                content="**Destination Info**\nNo destination specified — please mention where you're travelling.",
                metadata={"destination": None},
            )

        user_prompt = (
            f"Provide a travel briefing for: {destination}\n"
            f"User message for context: {context.message}"
        )
        try:
            raw = await self._chat(_BRIEF_PROMPT, user_prompt)
            raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
            data = json.loads(raw)
            content = _format_briefing(data)
            return AgentResult(
                agent="destination",
                content=content,
                metadata={"destination": destination, "briefing": data},
            )
        except Exception as exc:
            log.warning("Destination briefing parse failed: %s", exc)
            return AgentResult(
                agent="destination",
                content=f"**Destination: {destination}**\nUnable to retrieve structured briefing. Please check official travel advisories at travel.state.gov.",
                metadata={"destination": destination, "error": str(exc)},
            )
