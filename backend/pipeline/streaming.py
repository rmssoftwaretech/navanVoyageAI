"""SSE utilities for navanVoyageAI streaming responses."""
from __future__ import annotations

import json
from typing import Any


def sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event)}\n\n"


def build_context_block(session_context: dict, recent_turns: list[dict], max_chars: int = 2000) -> str:
    """Format session_context + recent turns into a system prompt block."""
    ctx = session_context or {}
    prefs = ctx.get("preferences", {})
    ents = ctx.get("entities", {})

    history_lines = [
        f"{t['role'].upper()} ({t.get('timestamp', '')[:16]}): {t['content'][:200]}"
        for t in recent_turns[-5:]
    ]
    history_block = "\n".join(history_lines)

    block = f"""=== CONVERSATION HISTORY (last {len(recent_turns)} turns) ===
{history_block}

=== USER CONTEXT (this session) ===
Origin: {ents.get('origin', 'not stated')}
Destinations: {', '.join(ents.get('destinations', [])) or 'not stated'}
Travel dates: {ents.get('travel_dates', 'not stated')}
Cabin preference: {ents.get('cabin_class', 'not stated')}
Budget: {'$' + str(ents['budget_usd']) if ents.get('budget_usd') else 'not stated'}
Preferences: {json.dumps(prefs) if prefs else 'none stated'}
"""
    if len(block) > max_chars:
        block = block[:max_chars] + "\n[... truncated ...]"
    return block
