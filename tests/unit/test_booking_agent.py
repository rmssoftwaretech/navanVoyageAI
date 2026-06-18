"""Unit tests for BookingAgent — mocks DB, tests ID gen and all intent paths."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.application.agent.base import AgentContext
from backend.application.agent.booking_agent import (
    BookingAgent,
    _booking_year,
    _detect_intent,
    _extract_booking_id,
    _make_booking_id,
)


# ── Pure helpers ───────────────────────────────────────────────────────────────

def test_make_booking_id():
    assert _make_booking_id(2027, 1) == "NVA-2027-00001"
    assert _make_booking_id(2027, 42) == "NVA-2027-00042"
    assert _make_booking_id(2028, 999) == "NVA-2028-00999"


def test_detect_intent_book():
    assert _detect_intent("I'd like to book the AF009 flight") == "book"
    assert _detect_intent("confirm my reservation") == "book"
    assert _detect_intent("reserve a seat please") == "book"


def test_detect_intent_cancel():
    assert _detect_intent("cancel my booking NVA-2027-00001") == "cancel"
    assert _detect_intent("I want a refund") == "cancel"


def test_detect_intent_status():
    assert _detect_intent("what is the status of NVA-2027-00001") == "status"
    assert _detect_intent("where is my booking") == "status"


def test_detect_intent_defaults_to_book():
    assert _detect_intent("Hello, I need help") == "book"


def test_extract_booking_id_found():
    assert _extract_booking_id("Cancel NVA-2027-00042 please") == "NVA-2027-00042"
    assert _extract_booking_id("nva-2028-00001 status") == "NVA-2028-00001"


def test_extract_booking_id_not_found():
    assert _extract_booking_id("I want to cancel my flight") is None


def test_booking_year_from_depart_date():
    assert _booking_year({"depart_date": "2027-03-15"}) == 2027


def test_booking_year_from_check_in():
    assert _booking_year({"check_in": "2028-06-01"}) == 2028


def test_booking_year_fallback():
    from datetime import datetime
    year = _booking_year({})
    assert year == datetime.now().year


# ── BookingAgent.run() — book intent ─────────────────────────────────────────

def _make_context(message: str, entities: dict | None = None, db=None) -> AgentContext:
    return AgentContext(
        conversation_id="test-conv",
        user="traveller",
        message=message,
        session_context={"entities": entities or {}},
        db=db,
    )


@pytest.mark.asyncio
async def test_book_no_db_returns_confirmation():
    agent = BookingAgent.__new__(BookingAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 512}

    ctx = _make_context(
        "Book the AF009 flight",
        entities={
            "carrier": "Air France", "flight_number": "AF009",
            "origin": "JFK", "destination": "CDG",
            "depart_date": "2027-01-15", "cabin_class": "Economy Plus",
            "price_usd": 742.0,
        },
    )
    result = await agent.run(ctx)

    assert result.agent == "booking"
    assert result.success is True
    assert "NVA-2027-" in result.content
    assert "AF009" in result.content
    assert result.metadata["action"] == "book"
    assert result.metadata["booking_id"].startswith("NVA-2027-")


@pytest.mark.asyncio
async def test_book_with_db_inserts_document():
    agent = BookingAgent.__new__(BookingAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 512}

    mock_db = MagicMock()
    mock_db["nva_bookings"].count_documents = AsyncMock(return_value=5)
    mock_db["nva_bookings"].insert_one = AsyncMock()

    ctx = _make_context(
        "Please book this flight",
        entities={"origin": "JFK", "destination": "CDG", "depart_date": "2027-03-10"},
        db=mock_db,
    )
    result = await agent.run(ctx)

    assert result.metadata["booking_id"] == "NVA-2027-00006"
    mock_db["nva_bookings"].insert_one.assert_awaited_once()


@pytest.mark.asyncio
async def test_book_with_flight_and_hotel():
    agent = BookingAgent.__new__(BookingAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 512}

    ctx = _make_context(
        "Book my flight and hotel",
        entities={
            "origin": "JFK", "destination": "CDG", "depart_date": "2027-01-15",
            "flight_number": "AF009", "carrier": "Air France", "price_usd": 742.0,
            "hotel_name": "Marriott City Center", "city_code": "PAR",
            "check_in": "2027-01-15", "check_out": "2027-01-22",
            "hotel_rate_usd": 189.0,
        },
    )
    result = await agent.run(ctx)

    assert "AF009" in result.content
    assert "Marriott" in result.content


# ── cancel intent ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cancel_no_id_asks_for_id():
    agent = BookingAgent.__new__(BookingAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 512}

    ctx = _make_context("I want to cancel my booking")
    result = await agent.run(ctx)

    assert "NVA-YYYY-NNNNN" in result.content
    assert result.metadata["booking_id"] is None


@pytest.mark.asyncio
async def test_cancel_with_id_no_db():
    agent = BookingAgent.__new__(BookingAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 512}

    ctx = _make_context("cancel NVA-2027-00001 please")
    result = await agent.run(ctx)

    assert "NVA-2027-00001" in result.content
    assert "CANCELLED" in result.content
    assert result.metadata["action"] == "cancel"


@pytest.mark.asyncio
async def test_cancel_with_db_found():
    agent = BookingAgent.__new__(BookingAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 512}

    existing = {"booking_id": "NVA-2027-00001", "status": "confirmed", "flight": None, "hotel": None}
    mock_db = MagicMock()
    mock_db["nva_bookings"].find_one = AsyncMock(return_value=existing)
    mock_db["nva_bookings"].update_one = AsyncMock()

    ctx = _make_context("cancel NVA-2027-00001", db=mock_db)
    result = await agent.run(ctx)

    mock_db["nva_bookings"].update_one.assert_awaited_once()
    assert "CANCELLED" in result.content


@pytest.mark.asyncio
async def test_cancel_with_db_not_found():
    agent = BookingAgent.__new__(BookingAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 512}

    mock_db = MagicMock()
    mock_db["nva_bookings"].find_one = AsyncMock(return_value=None)

    ctx = _make_context("cancel NVA-2027-99999", db=mock_db)
    result = await agent.run(ctx)

    assert "not found" in result.content


# ── status intent ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_status_no_id_asks_for_id():
    agent = BookingAgent.__new__(BookingAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 512}

    ctx = _make_context("what is the status of my booking")
    result = await agent.run(ctx)

    assert "NVA-YYYY-NNNNN" in result.content


@pytest.mark.asyncio
async def test_status_with_db_found():
    agent = BookingAgent.__new__(BookingAgent)
    agent._cfg = {"deployment": "gpt-4o", "temperature": 0.1, "max_tokens": 512}

    doc = {
        "booking_id": "NVA-2027-00003",
        "status": "confirmed",
        "flight": {"carrier": "Delta", "flight_number": "DL401", "origin": "JFK",
                   "destination": "CDG", "depart_date": "2027-02-01"},
        "hotel": None,
    }
    mock_db = MagicMock()
    mock_db["nva_bookings"].find_one = AsyncMock(return_value=doc)

    ctx = _make_context("status of NVA-2027-00003", db=mock_db)
    result = await agent.run(ctx)

    assert "NVA-2027-00003" in result.content
    assert "CONFIRMED" in result.content
    assert "DL401" in result.content
