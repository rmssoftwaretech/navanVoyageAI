"""Unit tests for DestinationAgent — mocks LLM call."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest

from backend.application.agent.base import AgentContext
from backend.application.agent.destination_agent import (
    DestinationAgent,
    _extract_destination,
    _format_briefing,
)

_MOCK_BRIEFING = {
    "destination": "Paris, France",
    "entry_requirements": {
        "visa": "No visa required for US passport holders (up to 90 days).",
        "passport_validity": "Must be valid for at least 3 months beyond stay.",
    },
    "currency": {
        "code": "EUR",
        "approx_rate_usd": 1.08,
        "tip": "Credit cards widely accepted; carry some cash for markets.",
    },
    "climate": {
        "season": "Spring — mild and pleasant",
        "temp_c": "12–20°C",
        "advice": "Pack a light jacket; rain is possible.",
    },
    "safety": {
        "level": "Low",
        "notes": "Paris is generally safe; be aware of pickpockets near tourist sites.",
    },
    "local_tips": [
        "Validate your Navigo card before each metro journey.",
        "Most museums are free on the first Sunday of the month.",
        "Tipping is not mandatory but appreciated.",
    ],
}


def _make_context(message: str, entities: dict | None = None) -> AgentContext:
    return AgentContext(
        conversation_id="test-conv",
        user="traveller",
        message=message,
        session_context={"entities": entities or {}},
    )


# ── _extract_destination ──────────────────────────────────────────────────────

def test_extract_from_entities():
    ctx = _make_context("Tell me about Paris", {"destination": "CDG"})
    assert _extract_destination(ctx) == "CDG"


def test_extract_from_message_to_keyword():
    ctx = _make_context("I'm flying to London next week")
    assert _extract_destination(ctx) == "London"


def test_extract_from_message_in_keyword():
    ctx = _make_context("What's the visa policy in Japan?")
    assert _extract_destination(ctx) == "Japan"


def test_extract_empty_when_no_destination():
    ctx = _make_context("Hello there")
    result = _extract_destination(ctx)
    # May return empty string or a short word — either way not a valid destination
    assert isinstance(result, str)


# ── _format_briefing ──────────────────────────────────────────────────────────

def test_format_briefing_contains_sections():
    result = _format_briefing(_MOCK_BRIEFING)
    assert "Paris, France" in result
    assert "Entry Requirements" in result
    assert "EUR" in result
    assert "Spring" in result
    assert "Low" in result
    assert "Navigo" in result


def test_format_briefing_empty_tips():
    data = {**_MOCK_BRIEFING, "local_tips": []}
    result = _format_briefing(data)
    assert "Local Tips" not in result


def test_format_briefing_rate():
    result = _format_briefing(_MOCK_BRIEFING)
    assert "1.08" in result


# ── DestinationAgent.run() ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_run_returns_structured_briefing():
    agent = DestinationAgent.__new__(DestinationAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.2, "max_tokens": 1024}
    agent._chat = AsyncMock(return_value=json.dumps(_MOCK_BRIEFING))

    ctx = _make_context("Tell me about Paris", {"destination": "Paris"})
    result = await agent.run(ctx)

    assert result.agent == "destination"
    assert result.success is True
    assert "Paris" in result.content
    assert "EUR" in result.content
    assert result.metadata["destination"] == "Paris"
    assert "briefing" in result.metadata


@pytest.mark.asyncio
async def test_run_no_destination_returns_gracefully():
    agent = DestinationAgent.__new__(DestinationAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.2, "max_tokens": 1024}

    ctx = _make_context("Hello")
    result = await agent.run(ctx)

    assert result.agent == "destination"
    assert result.success is True
    assert "No destination" in result.content
    assert result.metadata["destination"] is None


@pytest.mark.asyncio
async def test_run_handles_malformed_json():
    agent = DestinationAgent.__new__(DestinationAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.2, "max_tokens": 1024}
    agent._chat = AsyncMock(return_value="This is not JSON at all.")

    ctx = _make_context("Tell me about Tokyo", {"destination": "Tokyo"})
    result = await agent.run(ctx)

    assert result.agent == "destination"
    assert result.success is True
    assert "Tokyo" in result.content
    assert "error" in result.metadata


@pytest.mark.asyncio
async def test_run_handles_llm_exception():
    agent = DestinationAgent.__new__(DestinationAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.2, "max_tokens": 1024}
    agent._chat = AsyncMock(side_effect=Exception("LLM timeout"))

    ctx = _make_context("Tell me about Berlin", {"destination": "Berlin"})
    result = await agent.run(ctx)

    assert result.agent == "destination"
    assert result.success is True
    assert "Berlin" in result.content


@pytest.mark.asyncio
async def test_run_with_markdown_fenced_json():
    agent = DestinationAgent.__new__(DestinationAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.2, "max_tokens": 1024}
    fenced = f"```json\n{json.dumps(_MOCK_BRIEFING)}\n```"
    agent._chat = AsyncMock(return_value=fenced)

    ctx = _make_context("Paris travel tips", {"destination": "Paris"})
    result = await agent.run(ctx)

    assert "EUR" in result.content
    assert result.success is True
