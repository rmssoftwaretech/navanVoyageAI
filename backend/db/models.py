"""Pydantic models for navanVoyageAI MongoDB collections."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Conversations / nva_conversations ─────────────────────────────────────────

class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=_now)
    agents: list[str] = Field(default_factory=list)
    eval_score: float | None = None
    eval_passed: bool | None = None


class SessionContext(BaseModel):
    traveller: str = ""
    preferences: dict[str, Any] = Field(default_factory=dict)
    entities: dict[str, Any] = Field(default_factory=dict)
    last_search: dict[str, Any] = Field(default_factory=dict)
    last_policy: dict[str, Any] = Field(default_factory=dict)
    booking_ids: list[str] = Field(default_factory=list)


class Conversation(BaseModel):
    conversation_id: str
    user: str
    title: str = "New conversation"
    turns: list[Turn] = Field(default_factory=list)
    turns_count: int = 0
    session_context: SessionContext = Field(default_factory=SessionContext)
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ── Audit log / nva_audit_log ─────────────────────────────────────────────────

class AuditLog(BaseModel):
    log_id: str
    conversation_id: str
    user: str
    agent: str
    action: str
    input_summary: str = ""
    output_summary: str = ""
    latency_ms: int = 0
    token_in: int = 0
    token_out: int = 0
    model: str = ""
    timestamp: datetime = Field(default_factory=_now)


# ── Eval scores / nva_eval_scores ─────────────────────────────────────────────

class EvalCriteria(BaseModel):
    accuracy: float = 0.0
    policy_compliance: float = 0.0
    helpfulness: float = 0.0
    tone: float = 0.0
    safety: float = 0.0


class EvalScore(BaseModel):
    score_id: str
    conversation_id: str
    turn_index: int
    user: str
    overall_score: float
    criteria: EvalCriteria
    passed: bool
    reasoning: str = ""
    model_used: str = ""
    scored_at: datetime = Field(default_factory=_now)


# ── Bookings / nva_bookings ──────────────────────────────────────────────────

class BookingSegment(BaseModel):
    type: Literal["flight", "hotel", "car"]
    carrier: str = ""
    origin: str = ""
    destination: str = ""
    depart_date: str = ""
    return_date: str = ""
    cabin_class: str = ""
    price_usd: float = 0.0
    confirmation: str = ""


class Booking(BaseModel):
    booking_id: str                          # format: NVA-YYYY-NNNNN
    conversation_id: str
    user: str
    status: Literal["confirmed", "cancelled", "modified"] = "confirmed"
    segments: list[BookingSegment] = Field(default_factory=list)
    total_usd: float = 0.0
    policy_compliant: bool = True
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


# ── Policies / nva_policies ──────────────────────────────────────────────────

class FlightPolicy(BaseModel):
    allowed_classes: list[str] = Field(default_factory=list)
    max_advance_booking_days: int = 90
    min_advance_booking_days: int = 7
    max_one_way_usd: float = 500.0
    max_roundtrip_usd: float = 900.0
    business_eligible_hours: int = 8
    preferred_airlines: list[str] = Field(default_factory=list)


class HotelPolicy(BaseModel):
    max_nightly_rate_usd: float = 200.0
    allowed_tiers: list[str] = Field(default_factory=list)
    preferred_chains: list[str] = Field(default_factory=list)


class CarPolicy(BaseModel):
    allowed_classes: list[str] = Field(default_factory=list)
    max_daily_rate_usd: float = 75.0


class Policy(BaseModel):
    policy_id: str
    name: str
    description: str = ""
    flight: FlightPolicy = Field(default_factory=FlightPolicy)
    hotel: HotelPolicy = Field(default_factory=HotelPolicy)
    car_rental: CarPolicy = Field(default_factory=CarPolicy)
    meal_per_diem_usd: float = 60.0
    applies_to: str = "all"


# ── Billing / nva_billing ────────────────────────────────────────────────────

class BillingEntry(BaseModel):
    entry_id: str
    date: str                                # YYYY-MM-DD
    model: str
    agent: str
    token_in: int = 0
    token_out: int = 0
    cost_usd: float = 0.0
    conversation_id: str = ""
    created_at: datetime = Field(default_factory=_now)


# ── User memory / nva_user_memory (NVA-19) ───────────────────────────────────

class MemoryEntry(BaseModel):
    fact: str
    source: Literal["explicit", "inferred"] = "inferred"
    confidence: float = 0.8
    first_seen: datetime = Field(default_factory=_now)
    last_reinforced: datetime = Field(default_factory=_now)
    reinforcement_count: int = 1


class FrequentDestination(BaseModel):
    city: str
    count: int = 1
    last_visit: str = ""


class BookingSummary(BaseModel):
    total_bookings: int = 0
    last_booking_date: str = ""
    avg_flight_price_usd: float = 0.0


class UserMemory(BaseModel):
    user: str
    last_updated: datetime = Field(default_factory=_now)
    preferences: dict[str, Any] = Field(default_factory=dict)
    frequent_destinations: list[FrequentDestination] = Field(default_factory=list)
    typical_trip_length_days: int | None = None
    home_airport: str = ""
    booking_summary: BookingSummary = Field(default_factory=BookingSummary)
    memory_entries: list[MemoryEntry] = Field(default_factory=list)
