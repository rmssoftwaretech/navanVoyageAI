"""Unit tests for ToTStrategy — mocks LLM calls."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.application.agent.tot_strategy import _is_complex, run_tot


# ── _is_complex ───────────────────────────────────────────────────────────────

def test_complex_by_length():
    assert _is_complex("a" * 121) is True


def test_complex_by_keyword_compare():
    assert _is_complex("Compare business vs economy class for this trip") is True


def test_complex_by_keyword_recommend():
    assert _is_complex("Which hotel would you recommend?") is True


def test_complex_by_multi_domain():
    assert _is_complex("Find me a flight and hotel, and check the policy") is True


def test_not_complex_simple():
    assert _is_complex("Hello") is False


def test_not_complex_single_domain():
    assert _is_complex("What flights are available to Paris?") is False


# ── run_tot async generator ───────────────────────────────────────────────────

def _make_llm_response(content: str):
    choice = MagicMock()
    choice.message.content = content
    resp = MagicMock()
    resp.choices = [choice]
    return resp


@pytest.mark.asyncio
async def test_run_tot_emits_all_event_types():
    import json

    branch_content = "This is a reasoning branch."
    score_json = '{"score": 8.0, "rationale": "Good reasoning"}'

    call_count = 0

    async def fake_create(**kwargs):
        nonlocal call_count
        call_count += 1
        # First 3 calls are branch generation (temp=0.7), next 3 are scoring (temp=0.0)
        if kwargs.get("temperature", 0) == 0.7:
            return _make_llm_response(branch_content)
        else:
            return _make_llm_response(score_json)

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=fake_create)

    with patch("backend.application.agent.tot_strategy._azure_client", return_value=mock_client), \
         patch("backend.application.agent.tot_strategy.get_agent_config",
               return_value={"deployment": "gpt-4o"}):

        events = []
        async for evt_str in run_tot("Compare business vs economy for JFK-CDG", "no sub-agent results"):
            events.append(json.loads(evt_str[6:]))  # strip "data: "

    types = [e["type"] for e in events]
    assert "tot_start" in types
    assert types.count("tot_branch") == 3
    assert types.count("tot_evaluate") == 3
    assert "tot_selected" in types


@pytest.mark.asyncio
async def test_run_tot_selects_highest_score():
    import json

    scores = [3.0, 9.0, 6.0]
    call_count = 0

    async def fake_create(**kwargs):
        nonlocal call_count
        if kwargs.get("temperature", 0) == 0.7:
            return _make_llm_response("branch reasoning text")
        else:
            idx = call_count % 3
            call_count += 1
            return _make_llm_response(f'{{"score": {scores[idx]}, "rationale": "ok"}}')

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=fake_create)

    with patch("backend.application.agent.tot_strategy._azure_client", return_value=mock_client), \
         patch("backend.application.agent.tot_strategy.get_agent_config",
               return_value={"deployment": "gpt-4o"}):

        events = []
        async for evt_str in run_tot("Which is best?", ""):
            events.append(json.loads(evt_str[6:]))

    selected = next(e for e in events if e["type"] == "tot_selected")
    assert selected["index"] == 1  # highest score was index 1 (9.0)
    assert selected["score"] == 9.0


@pytest.mark.asyncio
async def test_run_tot_handles_branch_generation_failure():
    import json

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=Exception("LLM down"))

    with patch("backend.application.agent.tot_strategy._azure_client", return_value=mock_client), \
         patch("backend.application.agent.tot_strategy.get_agent_config",
               return_value={"deployment": "gpt-4o"}):

        events = []
        async for evt_str in run_tot("Complex query", ""):
            events.append(json.loads(evt_str[6:]))

    types = [e["type"] for e in events]
    assert "tot_start" in types
    assert "tot_error" in types
    assert "tot_selected" not in types


@pytest.mark.asyncio
async def test_run_tot_handles_malformed_score_json():
    import json

    async def fake_create(**kwargs):
        if kwargs.get("temperature", 0) == 0.7:
            return _make_llm_response("branch text")
        return _make_llm_response("not valid json {{{")

    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=fake_create)

    with patch("backend.application.agent.tot_strategy._azure_client", return_value=mock_client), \
         patch("backend.application.agent.tot_strategy.get_agent_config",
               return_value={"deployment": "gpt-4o"}):

        events = []
        async for evt_str in run_tot("Which hotel is better?", ""):
            events.append(json.loads(evt_str[6:]))

    # Should still complete — malformed scores default to 5.0
    types = [e["type"] for e in events]
    assert "tot_selected" in types
    evaluations = [e for e in events if e["type"] == "tot_evaluate"]
    assert all(e["score"] == 5.0 for e in evaluations)
