"""BookingAgent — creates/cancels/looks up bookings with NVA-YYYY-NNNNN IDs."""
from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.application.agent.base import AgentContext, AgentResult, BaseAgent

log = logging.getLogger(__name__)

_BOOK_KEYWORDS = {"book", "confirm", "reserve", "purchase", "buy"}
_CANCEL_KEYWORDS = {"cancel", "refund", "void", "remove"}
_STATUS_KEYWORDS = {"status", "where", "my booking", "find my", "look up", "details"}


def _detect_intent(message: str) -> str:
    lower = message.lower()
    if any(kw in lower for kw in _CANCEL_KEYWORDS):
        return "cancel"
    if any(kw in lower for kw in _STATUS_KEYWORDS):
        return "status"
    if any(kw in lower for kw in _BOOK_KEYWORDS):
        return "book"
    return "book"  # default when called by orchestrator


def _extract_booking_id(message: str) -> str | None:
    m = re.search(r"NVA-\d{4}-\d{5}", message, re.IGNORECASE)
    return m.group(0).upper() if m else None


async def _next_sequence(db: Any, year: int) -> int:
    if db is None:
        return 1
    try:
        count = await db["nva_bookings"].count_documents({"booking_id": {"$regex": f"^NVA-{year}-"}})
        return count + 1
    except Exception:
        return 1


def _make_booking_id(year: int, seq: int) -> str:
    return f"NVA-{year}-{seq:05d}"


def _booking_year(entities: dict) -> int:
    date_str = entities.get("depart_date") or entities.get("check_in") or ""
    try:
        return int(date_str[:4])
    except (ValueError, TypeError):
        return datetime.now(timezone.utc).year


def _format_confirmation(booking: dict) -> str:
    bid = booking["booking_id"]
    lines = [
        f"## Booking Confirmed",
        f"**Booking ID:** `{bid}`",
        "",
    ]
    if booking.get("flight"):
        f = booking["flight"]
        lines += [
            "**Flight**",
            f"- {f.get('carrier', '')} {f.get('flight_number', '')}  "
            f"{f.get('origin', '')} → {f.get('destination', '')}",
            f"- Depart: {f.get('depart_date', 'TBD')}  •  Cabin: {f.get('cabin_class', 'Economy')}",
            f"- Price: ${f.get('price_usd', 0):.0f}",
            "",
        ]
    if booking.get("hotel"):
        h = booking["hotel"]
        lines += [
            "**Hotel**",
            f"- {h.get('name', 'TBD')}  ({h.get('rating', '?')})",
            f"- {h.get('check_in', 'TBD')} → {h.get('check_out', 'TBD')}  •  ${h.get('nightly_rate_usd', 0):.0f}/night",
            "",
        ]
    lines += [
        f"**Status:** {booking.get('status', 'confirmed').upper()}",
        f"*A confirmation has been logged. Reference this ID for any changes.*",
    ]
    return "\n".join(lines)


def _format_cancellation(booking: dict) -> str:
    bid = booking["booking_id"]
    return (
        f"## Booking Cancelled\n"
        f"**Booking ID:** `{bid}`\n\n"
        f"Your booking has been cancelled. If you paid by corporate card, "
        f"refunds typically appear within 5–7 business days.\n\n"
        f"**Status:** CANCELLED"
    )


def _format_status(booking: dict) -> str:
    bid = booking["booking_id"]
    status = booking.get("status", "unknown").upper()
    lines = [f"## Booking Status", f"**Booking ID:** `{bid}`  •  **Status:** {status}", ""]
    if booking.get("flight"):
        f = booking["flight"]
        lines += [
            f"**Flight:** {f.get('carrier', '')} {f.get('flight_number', '')} — "
            f"{f.get('origin', '')} → {f.get('destination', '')} on {f.get('depart_date', 'TBD')}",
        ]
    if booking.get("hotel"):
        h = booking["hotel"]
        lines += [f"**Hotel:** {h.get('name', 'TBD')} ({h.get('check_in', '')} – {h.get('check_out', '')})"]
    return "\n".join(lines)


class BookingAgent(BaseAgent):
    name = "booking"

    async def run(self, context: AgentContext) -> AgentResult:
        intent = _detect_intent(context.message)

        if intent == "cancel":
            return await self._handle_cancel(context)
        if intent == "status":
            return await self._handle_status(context)
        return await self._handle_book(context)

    async def _handle_book(self, context: AgentContext) -> AgentResult:
        entities = context.session_context.get("entities", {})
        year = _booking_year(entities)
        seq = await _next_sequence(context.db, year)
        booking_id = _make_booking_id(year, seq)
        now = datetime.now(timezone.utc).isoformat()

        # Build booking doc from session entities
        flight = None
        if entities.get("flight_number") or entities.get("origin"):
            flight = {
                "carrier": entities.get("carrier", ""),
                "flight_number": entities.get("flight_number", ""),
                "origin": entities.get("origin", ""),
                "destination": entities.get("destination", ""),
                "depart_date": entities.get("depart_date", ""),
                "return_date": entities.get("return_date"),
                "cabin_class": entities.get("cabin_class", "Economy"),
                "price_usd": float(entities.get("price_usd", 0) or 0),
            }

        hotel = None
        if entities.get("hotel_name") or entities.get("city_code"):
            hotel = {
                "name": entities.get("hotel_name", ""),
                "city": entities.get("city_code", ""),
                "check_in": entities.get("check_in", ""),
                "check_out": entities.get("check_out", ""),
                "nightly_rate_usd": float(entities.get("hotel_rate_usd", 0) or 0),
                "rating": entities.get("hotel_rating", ""),
            }

        booking = {
            "booking_id": booking_id,
            "log_id": str(uuid.uuid4()),
            "conversation_id": context.conversation_id,
            "user": context.user,
            "status": "confirmed",
            "flight": flight,
            "hotel": hotel,
            "created_at": now,
            "updated_at": now,
        }

        if context.db is not None:
            try:
                await context.db["nva_bookings"].insert_one(booking)
            except Exception as exc:
                log.warning("Booking DB write failed: %s", exc)

        return AgentResult(
            agent="booking",
            content=_format_confirmation(booking),
            metadata={"booking_id": booking_id, "action": "book", "booking": booking},
        )

    async def _handle_cancel(self, context: AgentContext) -> AgentResult:
        booking_id = _extract_booking_id(context.message)
        if not booking_id:
            return AgentResult(
                agent="booking",
                content="**Cancellation**\nPlease provide your booking ID (format: `NVA-YYYY-NNNNN`) to cancel.",
                metadata={"action": "cancel", "booking_id": None},
            )

        booking: dict = {"booking_id": booking_id, "status": "cancelled"}
        if context.db is not None:
            try:
                doc = await context.db["nva_bookings"].find_one({"booking_id": booking_id})
                if doc:
                    booking = {**doc, "status": "cancelled"}
                    await context.db["nva_bookings"].update_one(
                        {"booking_id": booking_id},
                        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}},
                    )
                else:
                    return AgentResult(
                        agent="booking",
                        content=f"**Cancellation**\nBooking `{booking_id}` not found.",
                        metadata={"action": "cancel", "booking_id": booking_id},
                    )
            except Exception as exc:
                log.warning("Booking cancel DB error: %s", exc)

        return AgentResult(
            agent="booking",
            content=_format_cancellation(booking),
            metadata={"action": "cancel", "booking_id": booking_id},
        )

    async def _handle_status(self, context: AgentContext) -> AgentResult:
        booking_id = _extract_booking_id(context.message)
        if not booking_id:
            return AgentResult(
                agent="booking",
                content="**Booking Status**\nPlease provide your booking ID (format: `NVA-YYYY-NNNNN`).",
                metadata={"action": "status", "booking_id": None},
            )

        if context.db is not None:
            try:
                doc = await context.db["nva_bookings"].find_one({"booking_id": booking_id})
                if doc:
                    return AgentResult(
                        agent="booking",
                        content=_format_status(doc),
                        metadata={"action": "status", "booking_id": booking_id, "booking": doc},
                    )
            except Exception as exc:
                log.warning("Booking status DB error: %s", exc)

        return AgentResult(
            agent="booking",
            content=f"**Booking Status**\nBooking `{booking_id}` not found in the system.",
            metadata={"action": "status", "booking_id": booking_id},
        )
