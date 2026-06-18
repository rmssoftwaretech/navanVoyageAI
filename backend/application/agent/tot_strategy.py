"""Tree of Thought strategy — BFS 3-branch reasoning for complex travel queries."""
from __future__ import annotations

import asyncio
import logging
from typing import AsyncGenerator

from backend.application.agent.base import _azure_client
from backend.application.agent.registry import get_agent_config
from backend.pipeline.streaming import sse

log = logging.getLogger(__name__)

_COMPLEXITY_KEYWORDS = {
    "compare", "best", "recommend", "versus", "vs", "should i", "which",
    "trade-off", "tradeoff", "pros and cons", "options", "alternatives",
    "both", "all", "multiple", "several",
}

_BRANCH_PROMPT = """You are a corporate travel AI reasoning through a complex request.
Generate a thoughtful reasoning chain exploring ONE angle of the problem.
Be specific, practical, and concise (3–5 sentences).
Angle to explore: {angle}

User request: {message}

Sub-agent results available:
{results_block}
"""

_SCORE_PROMPT = """Score this reasoning chain for a corporate travel AI response (0–10).
Higher scores for: accuracy, practicality, policy awareness, completeness.
Return ONLY JSON: {{"score": 8, "rationale": "one sentence"}}

Reasoning chain:
{branch}
"""

_ANGLES = [
    "Focus on cost efficiency and policy compliance",
    "Focus on traveller convenience and time savings",
    "Focus on risk mitigation and flexibility",
]


def _is_complex(message: str) -> bool:
    lower = message.lower()
    if len(message) > 120:
        return True
    if any(kw in lower for kw in _COMPLEXITY_KEYWORDS):
        return True
    # Multiple agent domains mentioned
    domain_hits = sum([
        any(w in lower for w in ("flight", "fly", "airline", "depart")),
        any(w in lower for w in ("hotel", "stay", "accommodation", "room")),
        any(w in lower for w in ("policy", "allowed", "approved", "reimburse")),
        any(w in lower for w in ("visa", "passport", "destination", "country")),
        any(w in lower for w in ("book", "reserve", "confirm", "purchase")),
    ])
    return domain_hits >= 2


async def _generate_branch(client, deployment: str, angle: str, message: str, results_block: str) -> str:
    prompt = _BRANCH_PROMPT.format(angle=angle, message=message, results_block=results_block)
    resp = await client.chat.completions.create(
        model=deployment,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=512,
    )
    return resp.choices[0].message.content or ""


async def _score_branch(client, deployment: str, branch: str) -> tuple[float, str]:
    import json, re
    prompt = _SCORE_PROMPT.format(branch=branch)
    try:
        resp = await client.chat.completions.create(
            model=deployment,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=128,
        )
        raw = resp.choices[0].message.content or "{}"
        raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        data = json.loads(raw)
        return float(data.get("score", 5.0)), str(data.get("rationale", ""))
    except Exception as exc:
        log.warning("ToT scoring failed: %s", exc)
        return 5.0, ""


async def run_tot(
    message: str,
    results_block: str,
) -> AsyncGenerator[str, None]:
    """
    Runs Tree of Thought: generates 3 branches in parallel, scores each,
    yields SSE events, returns winning branch as the last string in the
    async generator via a StopIteration value trick (not supported in
    async generators) — instead the caller collects the final
    'tot_selected' event to get the winning content.
    """
    cfg = get_agent_config("orchestrator")
    deployment = cfg.get("deployment", "gpt-4o")
    client = _azure_client()

    yield sse({"type": "tot_start", "branches": len(_ANGLES)})

    # Generate all 3 branches in parallel
    try:
        branches = await asyncio.gather(*[
            _generate_branch(client, deployment, angle, message, results_block)
            for angle in _ANGLES
        ])
    except Exception as exc:
        log.error("ToT branch generation failed: %s", exc)
        yield sse({"type": "tot_error", "error": str(exc)})
        return

    for i, (angle, branch) in enumerate(zip(_ANGLES, branches)):
        yield sse({"type": "tot_branch", "index": i, "angle": angle, "content": branch})

    # Score branches in parallel
    try:
        scored = await asyncio.gather(*[
            _score_branch(client, deployment, branch)
            for branch in branches
        ])
    except Exception as exc:
        log.error("ToT scoring failed: %s", exc)
        scored = [(5.0, "")] * len(branches)

    for i, (score, rationale) in enumerate(scored):
        yield sse({"type": "tot_evaluate", "index": i, "score": score, "rationale": rationale})

    # Select winner
    best_idx = max(range(len(scored)), key=lambda i: scored[i][0])
    best_branch = branches[best_idx]
    yield sse({
        "type": "tot_selected",
        "index": best_idx,
        "score": scored[best_idx][0],
        "content": best_branch,
    })
