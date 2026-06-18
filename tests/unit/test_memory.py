"""Unit tests for ShortTermMemory — mocks Azure OpenAI client."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.application.agent.memory import ShortTermMemory


def _make_llm_response(content: str):
    choice = MagicMock()
    choice.message.content = content
    resp = MagicMock()
    resp.choices = [choice]
    return resp


_EXTRACTED = {
    "origin": "JFK", "destination": "CDG", "depart_date": "2027-01-15",
    "return_date": None, "cabin_class": "Economy Plus", "max_price": 800,
    "adults": 1, "search_hotels": False, "city_code": None,
    "check_in": None, "check_out": None, "hotel_name": None,
    "hotel_rate_usd": None, "flight_number": "AF009", "carrier": "Air France",
    "price_usd": 742.0, "user_role": "standard", "is_international": True,
}


def _make_stm(mock_client) -> ShortTermMemory:
    stm = ShortTermMemory.__new__(ShortTermMemory)
    stm.window_turns = 5
    stm.max_chars = 2000
    stm._cfg = {"deployment": "gpt-4o"}
    stm._client = mock_client
    return stm


@pytest.mark.asyncio
async def test_extract_and_persist_basic():
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_make_llm_response(json.dumps(_EXTRACTED))
    )
    mock_db = MagicMock()
    mock_db["nva_conversations"].update_one = AsyncMock()

    stm = _make_stm(mock_client)
    turns = [
        {"role": "user", "content": "Find me flights from JFK to Paris under $800 Economy Plus"},
        {"role": "assistant", "content": "Here are flights from JFK to CDG…"},
    ]
    result = await stm.extract_and_persist("conv-1", turns, {}, mock_db)

    assert result["origin"] == "JFK"
    assert result["destination"] == "CDG"
    assert result["cabin_class"] == "Economy Plus"
    assert result["is_international"] is True
    mock_db["nva_conversations"].update_one.assert_awaited_once()


@pytest.mark.asyncio
async def test_extract_merges_with_existing():
    mock_client = MagicMock()
    # LLM only returns partial new data
    partial = {"origin": "JFK", "destination": "CDG", "depart_date": "2027-01-15",
               "cabin_class": None, "hotel_name": None, "price_usd": None,
               "return_date": None, "max_price": None, "adults": None,
               "search_hotels": False, "city_code": None, "check_in": None,
               "check_out": None, "hotel_rate_usd": None, "flight_number": None,
               "carrier": None, "user_role": None, "is_international": False}
    mock_client.chat.completions.create = AsyncMock(
        return_value=_make_llm_response(json.dumps(partial))
    )
    mock_db = MagicMock()
    mock_db["nva_conversations"].update_one = AsyncMock()

    existing = {"cabin_class": "Business", "adults": 2}
    stm = _make_stm(mock_client)
    result = await stm.extract_and_persist("conv-2", [{"role": "user", "content": "hi"}], existing, mock_db)

    # null from LLM should NOT overwrite existing non-null values
    assert result["cabin_class"] == "Business"
    assert result["adults"] == 2
    # non-null from LLM should be written
    assert result["origin"] == "JFK"


@pytest.mark.asyncio
async def test_extract_no_turns_returns_existing():
    mock_client = MagicMock()
    stm = _make_stm(mock_client)
    existing = {"origin": "LAX"}
    result = await stm.extract_and_persist("conv-3", [], existing, None)

    assert result == existing
    mock_client.chat.completions.create.assert_not_called()


@pytest.mark.asyncio
async def test_extract_llm_failure_returns_existing():
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=Exception("timeout"))

    stm = _make_stm(mock_client)
    existing = {"origin": "SFO", "destination": "NRT"}
    result = await stm.extract_and_persist(
        "conv-4", [{"role": "user", "content": "Tokyo flights"}], existing, None
    )

    assert result == existing


@pytest.mark.asyncio
async def test_extract_malformed_json_returns_existing():
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_make_llm_response("not json {{{{")
    )

    stm = _make_stm(mock_client)
    existing = {"destination": "LHR"}
    result = await stm.extract_and_persist(
        "conv-5", [{"role": "user", "content": "London trip"}], existing, None
    )
    assert result == existing


@pytest.mark.asyncio
async def test_extract_strips_markdown_fences():
    mock_client = MagicMock()
    fenced = f"```json\n{json.dumps(_EXTRACTED)}\n```"
    mock_client.chat.completions.create = AsyncMock(
        return_value=_make_llm_response(fenced)
    )
    mock_db = MagicMock()
    mock_db["nva_conversations"].update_one = AsyncMock()

    stm = _make_stm(mock_client)
    result = await stm.extract_and_persist(
        "conv-6", [{"role": "user", "content": "JFK to CDG"}], {}, mock_db
    )
    assert result["destination"] == "CDG"


@pytest.mark.asyncio
async def test_extract_db_none_does_not_raise():
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_make_llm_response(json.dumps(_EXTRACTED))
    )

    stm = _make_stm(mock_client)
    result = await stm.extract_and_persist(
        "conv-7", [{"role": "user", "content": "flights to Paris"}], {}, None
    )
    assert result["origin"] == "JFK"


@pytest.mark.asyncio
async def test_extract_respects_window_size():
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_make_llm_response(json.dumps(_EXTRACTED))
    )

    stm = _make_stm(mock_client)
    stm.window_turns = 2

    turns = [{"role": "user", "content": f"message {i}"} for i in range(10)]
    await stm.extract_and_persist("conv-8", turns, {}, None)

    call_args = mock_client.chat.completions.create.call_args
    user_msg = call_args.kwargs["messages"][1]["content"]
    # Only last 2 turns should appear in prompt
    assert "message 8" in user_msg
    assert "message 9" in user_msg
    assert "message 0" not in user_msg
