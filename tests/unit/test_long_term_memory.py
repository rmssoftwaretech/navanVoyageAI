"""Unit tests for MemoryRetriever and MemoryUpdater (long-term memory)."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.application.agent.memory import MemoryRetriever, MemoryUpdater


# ── MemoryRetriever ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_retriever_load_returns_docs():
    docs = [
        {"user": "alice", "category": "travel_preferences", "fact": "Prefers aisle seats", "confidence": 0.95},
        {"user": "alice", "category": "loyalty_programs", "fact": "United MileagePlus Gold", "confidence": 0.9},
    ]
    mock_db = MagicMock()
    cursor = MagicMock()
    cursor.to_list = AsyncMock(return_value=docs)
    mock_db["nva_user_memory"].find.return_value = cursor

    retriever = MemoryRetriever()
    result = await retriever.load("alice", mock_db)

    assert len(result) == 2
    assert result[0]["fact"] == "Prefers aisle seats"


@pytest.mark.asyncio
async def test_retriever_load_no_db_returns_empty():
    result = await MemoryRetriever().load("alice", None)
    assert result == []


@pytest.mark.asyncio
async def test_retriever_load_db_error_returns_empty():
    mock_db = MagicMock()
    mock_db["nva_user_memory"].find.side_effect = Exception("connection error")

    result = await MemoryRetriever().load("alice", mock_db)
    assert result == []


def test_retriever_format_block_empty():
    result = MemoryRetriever().format_block([])
    assert result == ""


def test_retriever_format_block_groups_by_category():
    memories = [
        {"category": "travel_preferences", "fact": "Always books aisle seats"},
        {"category": "travel_preferences", "fact": "Prefers morning departures"},
        {"category": "loyalty_programs",   "fact": "United MileagePlus Gold"},
        {"category": "dietary",            "fact": "Vegetarian"},
    ]
    block = MemoryRetriever().format_block(memories)

    assert "=== USER LONG-TERM MEMORY ===" in block
    assert "TRAVEL PREFERENCES" in block
    assert "Always books aisle seats" in block
    assert "Prefers morning departures" in block
    assert "LOYALTY PROGRAMS" in block
    assert "DIETARY" in block
    assert "Vegetarian" in block


def test_retriever_format_block_unknown_category():
    memories = [{"category": "general", "fact": "Based in New York"}]
    block = MemoryRetriever().format_block(memories)
    assert "GENERAL" in block
    assert "Based in New York" in block


# ── MemoryUpdater ─────────────────────────────────────────────────────────────

def _make_llm_response(content: str):
    choice = MagicMock()
    choice.message.content = content
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def _make_updater(mock_client) -> MemoryUpdater:
    updater = MemoryUpdater.__new__(MemoryUpdater)
    updater._cfg = {"deployment": "gpt-4o"}
    updater._client = mock_client
    return updater


@pytest.mark.asyncio
async def test_updater_upserts_extracted_facts():
    entries = [
        {"category": "travel_preferences", "fact": "Prefers Business class for long-haul", "confidence": 0.9},
        {"category": "frequent_routes",    "fact": "Regularly travels JFK to CDG",        "confidence": 0.85},
    ]
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_make_llm_response(json.dumps(entries))
    )
    mock_db = MagicMock()
    mock_db["nva_user_memory"].update_one = AsyncMock()

    updater = _make_updater(mock_client)
    await updater.update("alice", "conv-1", "Book Business to Paris", "Here are Business options…", mock_db)

    assert mock_db["nva_user_memory"].update_one.await_count == 2


@pytest.mark.asyncio
async def test_updater_no_db_does_not_raise():
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock()

    updater = _make_updater(mock_client)
    await updater.update("alice", "conv-2", "Hello", "Hi there", None)

    mock_client.chat.completions.create.assert_not_called()


@pytest.mark.asyncio
async def test_updater_llm_failure_does_not_raise():
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=Exception("timeout"))

    mock_db = MagicMock()
    mock_db["nva_user_memory"].update_one = AsyncMock()

    updater = _make_updater(mock_client)
    await updater.update("alice", "conv-3", "msg", "resp", mock_db)

    mock_db["nva_user_memory"].update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_updater_skips_empty_facts():
    entries = [
        {"category": "general", "fact": "", "confidence": 0.5},
        {"category": "general", "fact": "Valid fact", "confidence": 0.8},
    ]
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_make_llm_response(json.dumps(entries))
    )
    mock_db = MagicMock()
    mock_db["nva_user_memory"].update_one = AsyncMock()

    updater = _make_updater(mock_client)
    await updater.update("alice", "conv-4", "msg", "resp", mock_db)

    # Only the non-empty fact should be upserted
    assert mock_db["nva_user_memory"].update_one.await_count == 1


@pytest.mark.asyncio
async def test_updater_normalises_unknown_category():
    entries = [{"category": "unknown_category_xyz", "fact": "Some fact", "confidence": 0.7}]
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_make_llm_response(json.dumps(entries))
    )
    mock_db = MagicMock()
    mock_db["nva_user_memory"].update_one = AsyncMock()

    updater = _make_updater(mock_client)
    await updater.update("alice", "conv-5", "msg", "resp", mock_db)

    call_kwargs = mock_db["nva_user_memory"].update_one.call_args[0][1]
    assert call_kwargs["$set"]["category"] == "general"


@pytest.mark.asyncio
async def test_updater_empty_list_no_upserts():
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_make_llm_response("[]")
    )
    mock_db = MagicMock()
    mock_db["nva_user_memory"].update_one = AsyncMock()

    updater = _make_updater(mock_client)
    await updater.update("alice", "conv-6", "Hello", "Hi", mock_db)

    mock_db["nva_user_memory"].update_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_updater_strips_markdown_fences():
    entries = [{"category": "dietary", "fact": "Vegetarian", "confidence": 0.95}]
    fenced = f"```json\n{json.dumps(entries)}\n```"
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock(
        return_value=_make_llm_response(fenced)
    )
    mock_db = MagicMock()
    mock_db["nva_user_memory"].update_one = AsyncMock()

    updater = _make_updater(mock_client)
    await updater.update("alice", "conv-7", "msg", "resp", mock_db)

    assert mock_db["nva_user_memory"].update_one.await_count == 1
