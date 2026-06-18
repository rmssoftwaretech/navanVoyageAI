"""SSE utilities for navanVoyageAI streaming responses."""
from __future__ import annotations

import json
from typing import Any


def sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event)}\n\n"


def build_context_block(
    session_context: dict,
    recent_turns: list[dict],
    max_chars: int = 2000,
    ltm_block: str = "",
) -> str:
    """Format session_context + recent turns + long-term memory into a system prompt block."""
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
Destination: {ents.get('destination', 'not stated')}
Depart date: {ents.get('depart_date', 'not stated')}
Cabin preference: {ents.get('cabin_class', 'not stated')}
Budget: {'$' + str(ents['max_price']) if ents.get('max_price') else 'not stated'}
Preferences: {json.dumps(prefs) if prefs else 'none stated'}
"""
    if ltm_block:
        block += f"\n{ltm_block}\n"

    if len(block) > max_chars:
        block = block[:max_chars] + "\n[... truncated ...]"
    return block
