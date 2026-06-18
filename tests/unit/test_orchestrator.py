"""Unit tests for OrchestratorAgent — mocks LLM calls."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.application.agent.orchestrator import OrchestratorAgent
from backend.pipeline.streaming import build_context_block


# ── build_context_block ───────────────────────────────────────────────────────

def test_context_block_empty():
    block = build_context_block({}, [])
    assert "CONVERSATION HISTORY" in block
    assert "USER CONTEXT" in block


def test_context_block_with_entities():
    ctx = {
        "entities": {"origin": "JFK", "destination": "CDG", "max_price": 800},
        "preferences": {"seat": "window"},
    }
    block = build_context_block(ctx, [])
    assert "JFK" in block
    assert "$800" in block
    assert "window" in block


def test_context_block_truncation():
    long_ctx = {"preferences": {"note": "x" * 3000}}
    block = build_context_block(long_ctx, [], max_chars=500)
    assert len(block) <= 550  # allow some overshoot from truncation marker


# ── Intent classification ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_classify_flight_search():
    agent = OrchestratorAgent.__new__(OrchestratorAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.0, "max_tokens": 256}

    mock_resp = MagicMock()
    mock_resp.choices[0].message.content = json.dumps({
        "intent": "search_flight",
        "agents": ["search", "policy"],
        "reasoning": "User wants to find flights",
    })

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)
    agent._client = mock_client

    result = await agent._classify("Find me a flight to Paris under $800", "")
    assert "search" in result
    assert "policy" in result


@pytest.mark.asyncio
async def test_classify_destination_only():
    agent = OrchestratorAgent.__new__(OrchestratorAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.0, "max_tokens": 256}

    mock_resp = MagicMock()
    mock_resp.choices[0].message.content = json.dumps({
        "intent": "destination_info",
        "agents": ["destination"],
        "reasoning": "User wants destination information",
    })

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)
    agent._client = mock_client

    result = await agent._classify("What are the visa requirements for Japan?", "")
    assert result == ["destination"]


@pytest.mark.asyncio
async def test_classify_handles_malformed_json():
    agent = OrchestratorAgent.__new__(OrchestratorAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.0, "max_tokens": 256}

    mock_resp = MagicMock()
    mock_resp.choices[0].message.content = "```json\n{\"agents\": [\"search\"]}\n```"

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)
    agent._client = mock_client

    result = await agent._classify("find flights", "")
    assert result == ["search"]


@pytest.mark.asyncio
async def test_classify_empty_agents_for_greeting():
    agent = OrchestratorAgent.__new__(OrchestratorAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.0, "max_tokens": 256}

    mock_resp = MagicMock()
    mock_resp.choices[0].message.content = json.dumps({
        "intent": "general",
        "agents": [],
        "reasoning": "Simple greeting",
    })

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)
    agent._client = mock_client

    result = await agent._classify("Hello!", "")
    assert result == []


# ── Registry ──────────────────────────────────────────────────────────────────

def test_registry_returns_orchestrator_config():
    from backend.application.agent.registry import get_agent_config
    cfg = get_agent_config("orchestrator")
    assert isinstance(cfg, dict)
    # Should have at least model and temperature from agents.json
    assert "model" in cfg or "deployment" in cfg or cfg == {}


def test_registry_reload():
    from backend.application.agent.registry import get_full_config, reload_agent_config
    config = reload_agent_config()
    assert isinstance(config, dict)
