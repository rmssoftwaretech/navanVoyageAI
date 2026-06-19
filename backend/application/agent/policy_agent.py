"""PolicyAgent — deterministic rule engine against config/policies.json."""
from __future__ import annotations

import json
import logging
import os
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any

from backend.application.agent.base import AgentContext, AgentResult, BaseAgent

log = logging.getLogger(__name__)

_POLICIES_PATH = Path(__file__).parent.parent.parent.parent / "config" / "policies.json"

# Cabin class ordinal (lower = cheaper)
_CABIN_ORDER = {"Economy": 0, "Economy Plus": 1, "Business": 2, "First": 3}


@dataclass
class PolicyVerdict:
    compliant: bool
    violations: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    applicable_policy: str = ""
    approved_cabin: str = "Economy"
    max_flight_usd: float = 0.0
    max_hotel_rate_usd: float = 0.0
    meal_per_diem_usd: float = 0.0


def _load_policies_sync() -> list[dict]:
    try:
        return json.loads(_POLICIES_PATH.read_text())
    except Exception as exc:
        log.warning("Could not load policies.json: %s", exc)
        return []


async def _load_policies(db: Any) -> list[dict]:
    if db is not None:
        try:
            docs = await db["nva_policies"].find({}).to_list(length=50)
            if docs:
                return docs
        except Exception as exc:
            log.warning("DB policy load failed, falling back to file: %s", exc)
    return _load_policies_sync()


def _select_policy(policies: list[dict], entities: dict) -> dict | None:
    """Pick the best matching policy for the travel context."""
    user_role = entities.get("user_role", "all").lower()
    is_international = entities.get("is_international", False)
    destination = entities.get("destination", "")

    # Detect international by common non-US destination codes
    if not is_international and destination:
        domestic_prefixes = {"JFK", "LAX", "ORD", "DFW", "ATL", "SFO", "SEA", "MIA", "BOS", "DEN"}
        if destination.upper() not in domestic_prefixes and len(destination) == 3:
            is_international = True

    # Company executive — C-suite, highest priority
    if user_role in ("company_executive", "ceo", "cto", "coo", "cfo", "president", "managing_director", "md", "c-suite"):
        pol = next((p for p in policies if p.get("applies_to") == "company_executive"), None)
        if pol:
            return pol

    # Legacy executive / VP / Director
    if user_role in ("executive", "vp", "director", "vice_president"):
        pol = next((p for p in policies if p.get("applies_to") == "executive"), None)
        if pol:
            return pol

    # Sales executive
    if user_role in ("sales_executive", "sales", "account_executive", "ae", "sales_rep", "se", "account_manager"):
        pol = next((p for p in policies if p.get("applies_to") == "sales_executive"), None)
        if pol:
            return pol

    # Conference traveller
    if user_role in ("conference_traveller", "conference", "attendee", "conference_attendee", "delegate"):
        pol = next((p for p in policies if p.get("applies_to") == "conference_traveller"), None)
        if pol:
            return pol

    if is_international:
        pol = next((p for p in policies if p.get("applies_to") == "international"), None)
        if pol:
            return pol

    return next((p for p in policies if p.get("applies_to") == "all"), None)


def _days_until(date_str: str | None) -> int | None:
    if not date_str:
        return None
    try:
        travel = datetime.strptime(date_str, "%Y-%m-%d").date()
        return (travel - date.today()).days
    except ValueError:
        return None


def evaluate_policy(policy: dict, entities: dict) -> PolicyVerdict:
    """Run deterministic rule checks. Returns PolicyVerdict."""
    violations: list[str] = []
    warnings: list[str] = []

    flight_cfg = policy.get("flight", {})
    hotel_cfg = policy.get("hotel", {})
    allowed_classes: list[str] = flight_cfg.get("allowed_classes", ["Economy"])
    min_advance: int = flight_cfg.get("min_advance_booking_days", 7)
    max_one_way: float = float(flight_cfg.get("max_one_way_usd", 500))
    max_roundtrip: float = float(flight_cfg.get("max_roundtrip_usd", 900))
    max_hotel: float = float(hotel_cfg.get("max_nightly_rate_usd", 200))
    meal_diem: float = float(policy.get("meal_per_diem_usd", 60))

    # Cabin class check
    cabin = entities.get("cabin_class", "Economy")
    if cabin not in allowed_classes:
        violations.append(
            f"Cabin class '{cabin}' not permitted. Allowed: {', '.join(allowed_classes)}."
        )

    # Price cap
    price = float(entities.get("price_usd", 0) or 0)
    return_date = entities.get("return_date")
    is_roundtrip = bool(return_date)
    if price > 0:
        cap = max_roundtrip if is_roundtrip else max_one_way
        if price > cap:
            trip_label = "round-trip" if is_roundtrip else "one-way"
            violations.append(
                f"Flight price ${price:.0f} exceeds {trip_label} cap of ${cap:.0f}."
            )

    # Advance booking
    days_out = _days_until(entities.get("depart_date"))
    if days_out is not None:
        if days_out < min_advance:
            if days_out < 2:
                violations.append(
                    f"Departure in {days_out} day(s) — minimum advance booking is {min_advance} days."
                )
            else:
                warnings.append(
                    f"Departure in {days_out} day(s) — policy recommends at least {min_advance} days advance."
                )

    # Hotel rate check
    hotel_rate = float(entities.get("hotel_rate_usd", 0) or 0)
    if hotel_rate > 0 and hotel_rate > max_hotel:
        violations.append(
            f"Hotel rate ${hotel_rate:.0f}/night exceeds policy cap of ${max_hotel:.0f}/night."
        )
    elif hotel_rate > max_hotel * 0.9:
        warnings.append(
            f"Hotel rate ${hotel_rate:.0f}/night is within 10% of policy cap (${max_hotel:.0f}/night)."
        )

    approved_cabin = allowed_classes[-1] if allowed_classes else "Economy"
    return PolicyVerdict(
        compliant=len(violations) == 0,
        violations=violations,
        warnings=warnings,
        applicable_policy=policy.get("name", "Unknown Policy"),
        approved_cabin=approved_cabin,
        max_flight_usd=max_roundtrip if is_roundtrip else max_one_way,
        max_hotel_rate_usd=max_hotel,
        meal_per_diem_usd=meal_diem,
    )


def _format_verdict(verdict: PolicyVerdict) -> str:
    status = "COMPLIANT" if verdict.compliant else "NON-COMPLIANT"
    icon = "" if verdict.compliant else ""
    lines = [f"**Policy Check: {icon} {status}**", f"*Policy: {verdict.applicable_policy}*", ""]

    if verdict.violations:
        lines.append("**Violations:**")
        for v in verdict.violations:
            lines.append(f"- {v}")
        lines.append("")

    if verdict.warnings:
        lines.append("**Warnings:**")
        for w in verdict.warnings:
            lines.append(f"- {w}")
        lines.append("")

    lines.append("**Policy Limits:**")
    lines.append(f"- Max flight: ${verdict.max_flight_usd:.0f}")
    lines.append(f"- Approved cabin: {verdict.approved_cabin}")
    lines.append(f"- Max hotel rate: ${verdict.max_hotel_rate_usd:.0f}/night")
    lines.append(f"- Meal per diem: ${verdict.meal_per_diem_usd:.0f}/day")

    return "\n".join(lines)


class PolicyAgent(BaseAgent):
    name = "policy"

    async def run(self, context: AgentContext) -> AgentResult:
        policies = await _load_policies(context.db)
        entities = context.session_context.get("entities", {})

        if not policies:
            return AgentResult(
                agent="policy",
                content="**Policy Check**\nNo policy rules found — skipping compliance check.",
                metadata={"verdict": None},
            )

        policy = _select_policy(policies, entities)
        if policy is None:
            return AgentResult(
                agent="policy",
                content="**Policy Check**\nNo applicable policy found for this travel request.",
                metadata={"verdict": None},
            )

        verdict = evaluate_policy(policy, entities)
        return AgentResult(
            agent="policy",
            content=_format_verdict(verdict),
            metadata={"verdict": asdict(verdict)},
        )
