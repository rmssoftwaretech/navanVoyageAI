"""Unit tests for SearchAgent — mocks httpx and LLM calls."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.application.agent.search_agent import SearchAgent, _format_flights, _format_hotels
from backend.application.agent.base import AgentContext


# ── Formatter helpers ─────────────────────────────────────────────────────────

def test_format_flights_empty():
    result = _format_flights([], "Economy")
    assert "No flights found" in result


def test_format_flights_single():
    flights = [{
        "carrier": "Air France", "flight_number": "AF009",
        "origin": "JFK", "destination": "CDG",
        "price_usd": 742.0, "stops": 0, "duration_minutes": 430,
    }]
    result = _format_flights(flights, "Economy Plus")
    assert "AF009" in result
    assert "$742" in result
    assert "Non-stop" in result


def test_format_flights_with_stop():
    flights = [{
        "carrier": "Delta", "flight_number": "DL401",
        "origin": "JFK", "destination": "CDG",
        "price_usd": 650.0, "stops": 1, "duration_minutes": 520,
    }]
    result = _format_flights(flights, "Economy")
    assert "1 stop" in result


def test_format_hotels_empty():
    result = _format_hotels([])
    assert "No hotels found" in result


def test_format_hotels():
    hotels = [{
        "name": "Marriott City Center", "rating": "4-star",
        "nightly_rate_usd": 189.0, "check_in": "2027-01-15", "check_out": "2027-01-22",
    }]
    result = _format_hotels(hotels)
    assert "Marriott" in result
    assert "$189" in result
    assert "4-star" in result


# ── SearchAgent.run() with mocked httpx ──────────────────────────────────────

def _make_context(message: str, entities: dict | None = None) -> AgentContext:
    return AgentContext(
        conversation_id="test-conv",
        user="traveller",
        message=message,
        session_context={"entities": entities or {}},
    )


@pytest.mark.asyncio
async def test_run_returns_flight_results():
    agent = SearchAgent.__new__(SearchAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 1024}

    # Mock _extract_params to return structured params
    agent._extract_params = AsyncMock(return_value={
        "origin": "JFK", "destination": "CDG", "depart_date": "2027-01-15",
        "cabin_class": "Economy Plus", "max_price": 800, "adults": 1,
        "search_hotels": False,
    })

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "flights": [
            {"carrier": "Air France", "flight_number": "AF009", "origin": "JFK",
             "destination": "CDG", "price_usd": 742.0, "stops": 0,
             "duration_minutes": 430, "depart_date": "2027-01-15"},
        ],
        "source": "mock",
    }

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        ctx = _make_context("Find me flights from JFK to Paris under $800 Economy Plus")
        result = await agent.run(ctx)

    assert result.agent == "search"
    assert result.success is True
    assert "AF009" in result.content
    assert len(result.metadata["mcp_events"]) == 2
    assert result.metadata["mcp_events"][0]["type"] == "mcp_tool_call"
    assert result.metadata["mcp_events"][0]["tool"] == "search_flights"
    assert result.metadata["mcp_events"][1]["type"] == "mcp_tool_result"
    assert result.metadata["mcp_events"][1]["latency_ms"] >= 0


@pytest.mark.asyncio
async def test_run_no_params_returns_gracefully():
    agent = SearchAgent.__new__(SearchAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 1024}
    agent._extract_params = AsyncMock(return_value={})

    ctx = _make_context("Hello there")
    result = await agent.run(ctx)

    assert result.agent == "search"
    assert "No search results" in result.content
    assert result.metadata["mcp_events"] == []


@pytest.mark.asyncio
async def test_run_handles_sidecar_error():
    agent = SearchAgent.__new__(SearchAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 1024}
    agent._extract_params = AsyncMock(return_value={
        "origin": "JFK", "destination": "CDG", "depart_date": "2027-01-15",
        "cabin_class": "Economy", "adults": 1, "search_hotels": False,
    })

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(side_effect=Exception("connection refused"))
        mock_client_cls.return_value = mock_client

        ctx = _make_context("Find flights to Paris")
        result = await agent.run(ctx)

    # Should still return a result, not raise
    assert result.agent == "search"
    mcp_events = result.metadata["mcp_events"]
    assert any(e["type"] == "mcp_tool_result" and "error" in e.get("output", {}) for e in mcp_events)
