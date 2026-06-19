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

# ── Mock branch content used when LLM is unavailable ─────────────────────────
# These are realistic 3–5 sentence reasoning chains per angle, used as
# fallback during demos without Azure OpenAI credentials configured.

_MOCK_BRANCHES = [
    # Branch 0 — cost efficiency
    (
        "Analysing through a cost-efficiency and policy-compliance lens: booking at least "
        "14 days in advance secures lower fares and satisfies the company advance-booking "
        "policy. Economy class is fully compliant for most roles and runs 60–70% cheaper "
        "than Business on comparable routes. Selecting a 3-star or 4-star hotel within "
        "the per-diem cap—ideally close to the meeting venue—eliminates unnecessary taxi "
        "costs. Consolidating multi-leg itineraries into a single booking reduces service "
        "fees and keeps the trip comfortably under the quarterly travel budget threshold."
    ),
    # Branch 1 — convenience
    (
        "From a traveller-convenience and time-savings perspective: direct flights, even at "
        "a modest premium, save 3–4 hours per leg and eliminate connection-miss risk—"
        "especially critical for same-day meeting arrivals. Staying at the conference hotel "
        "or within walking distance removes daily transit friction and allows flexible "
        "schedule changes without logistics overhead. Pre-checking baggage online, selecting "
        "aisle seats, and enrolling in lounge access (where Business class applies) compress "
        "the effective travel window. A rental car with GPS beats public transit in unfamiliar "
        "cities and ensures punctuality for multi-site visits."
    ),
    # Branch 2 — risk mitigation
    (
        "Prioritising risk mitigation and flexibility: refundable or change-fee-waived fares "
        "protect against last-minute cancellations at a 15–20% premium worth paying for "
        "business-critical travel. Travel insurance should be added on international legs "
        "exceeding 6 hours to cover medical, delay, and baggage scenarios. Selecting hotels "
        "with free cancellation up to 24 hours before arrival preserves optionality if the "
        "meeting is rescheduled. Routing through airlines with strong on-time performance "
        "(ANA, Singapore Airlines, Emirates) on business-critical routes reduces disruption "
        "probability versus lower-cost alternatives."
    ),
]

_MOCK_SCORES = [
    (7.8, "Strong policy alignment and cost-consciousness; slightly rigid on schedule flexibility."),
    (8.5, "Best balance of productivity and time savings; highly relevant for senior travellers."),
    (8.1, "Sound risk framework; minor over-emphasis on insurance relative to operational choices."),
]

# ── Trigger queries (for documentation / demo reference) ─────────────────────
# Any of the following example queries will trigger ToT (≥2 domain keywords or
# contains a complexity keyword):
#
#   "Compare Business and Economy class options for my SFO to London trip next month"
#   "What's the best way to book a flight and hotel for a conference in Tokyo in August?"
#   "Should I fly direct or take a connecting flight to Dubai — pros and cons?"
#   "Find flights, hotel and car rental options for a 5-day trip to Singapore"
#   "Which airlines are best for a long-haul flight to NRT with hotel near Shinjuku?"
#   "Recommend the most cost-effective way to travel and stay in Frankfurt for 3 days"


def _is_complex(message: str) -> bool:
    lower = message.lower()
    if len(message) > 120:
        return True
    if any(kw in lower for kw in _COMPLEXITY_KEYWORDS):
        return True
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
        max_completion_tokens=512,
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
            max_completion_tokens=128,
        )
        raw = resp.choices[0].message.content or "{}"
        raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        data = json.loads(raw)
        return float(data.get("score", 5.0)), str(data.get("rationale", ""))
    except Exception as exc:
        log.warning("ToT scoring failed: %s", exc)
        return 5.0, ""


async def _run_tot_mock(message: str) -> AsyncGenerator[str, None]:
    """Fallback path: realistic pre-canned ToT events with simulated timing."""
    yield sse({"type": "tot_start", "branches": 3})
    await asyncio.sleep(0.4)

    for i, (angle, branch) in enumerate(zip(_ANGLES, _MOCK_BRANCHES)):
        await asyncio.sleep(0.6)
        yield sse({"type": "tot_branch", "index": i, "angle": angle, "content": branch})

    await asyncio.sleep(0.4)

    for i, (score, rationale) in enumerate(_MOCK_SCORES):
        yield sse({"type": "tot_evaluate", "index": i, "score": score, "rationale": rationale})
        await asyncio.sleep(0.2)

    best_idx = max(range(len(_MOCK_SCORES)), key=lambda i: _MOCK_SCORES[i][0])
    yield sse({
        "type": "tot_selected",
        "index": best_idx,
        "score": _MOCK_SCORES[best_idx][0],
        "content": _MOCK_BRANCHES[best_idx],
    })


async def run_tot(
    message: str,
    results_block: str,
) -> AsyncGenerator[str, None]:
    """
    Runs Tree of Thought: generates 3 branches in parallel, scores each,
    yields SSE events. Falls back to rich mock data when Azure OpenAI is
    unavailable (no credentials or API error).
    """
    cfg = get_agent_config("orchestrator")
    deployment = cfg.get("deployment", "gpt-4o")

    yield sse({"type": "tot_start", "branches": len(_ANGLES)})

    # Try real LLM path
    try:
        client = _azure_client()
        branches = await asyncio.gather(*[
            _generate_branch(client, deployment, angle, message, results_block)
            for angle in _ANGLES
        ])
    except Exception as exc:
        log.warning("ToT branch generation unavailable (%s) — using mock data", exc)
        # Emit the remaining mock events (tot_start already sent above)
        await asyncio.sleep(0.5)
        for i, (angle, branch) in enumerate(zip(_ANGLES, _MOCK_BRANCHES)):
            await asyncio.sleep(0.5)
            yield sse({"type": "tot_branch", "index": i, "angle": angle, "content": branch})
        await asyncio.sleep(0.3)
        for i, (score, rationale) in enumerate(_MOCK_SCORES):
            yield sse({"type": "tot_evaluate", "index": i, "score": score, "rationale": rationale})
            await asyncio.sleep(0.15)
        best_idx = max(range(len(_MOCK_SCORES)), key=lambda i: _MOCK_SCORES[i][0])
        yield sse({
            "type": "tot_selected",
            "index": best_idx,
            "score": _MOCK_SCORES[best_idx][0],
            "content": _MOCK_BRANCHES[best_idx],
        })
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
        scored = list(_MOCK_SCORES)

    for i, (score, rationale) in enumerate(scored):
        yield sse({"type": "tot_evaluate", "index": i, "score": score, "rationale": rationale})

    best_idx = max(range(len(scored)), key=lambda i: scored[i][0])
    best_branch = branches[best_idx]
    yield sse({
        "type": "tot_selected",
        "index": best_idx,
        "score": scored[best_idx][0],
        "content": best_branch,
    })
