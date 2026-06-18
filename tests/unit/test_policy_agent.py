"""Unit tests for PolicyAgent — pure deterministic logic, no DB/LLM calls."""
from __future__ import annotations

import pytest

from backend.application.agent.policy_agent import (
    PolicyVerdict,
    _load_policies_sync,
    _select_policy,
    evaluate_policy,
)


# ── Policy loading ────────────────────────────────────────────────────────────

def test_load_policies_returns_list():
    policies = _load_policies_sync()
    assert isinstance(policies, list)
    assert len(policies) >= 1
    assert all("policy_id" in p for p in policies)


# ── Policy selection ──────────────────────────────────────────────────────────

def _policies():
    return _load_policies_sync()


def test_select_all_policy_for_default():
    pol = _select_policy(_policies(), {})
    assert pol is not None
    assert pol["applies_to"] == "all"


def test_select_international_policy():
    pol = _select_policy(_policies(), {"is_international": True})
    assert pol is not None
    assert pol["applies_to"] == "international"


def test_select_executive_policy():
    pol = _select_policy(_policies(), {"user_role": "executive"})
    assert pol is not None
    assert pol["applies_to"] == "executive"


def test_select_international_by_destination_code():
    # CDG is not in the domestic set → triggers international
    pol = _select_policy(_policies(), {"destination": "CDG"})
    assert pol is not None
    assert pol["applies_to"] == "international"


def test_select_domestic_by_known_code():
    # JFK is in domestic prefixes → falls through to "all" policy
    pol = _select_policy(_policies(), {"destination": "JFK"})
    assert pol is not None
    assert pol["applies_to"] == "all"


# ── evaluate_policy — Standard Domestic (POL-001) ────────────────────────────

def _std_policy():
    return next(p for p in _policies() if p["applies_to"] == "all")


def test_compliant_economy_domestic():
    verdict = evaluate_policy(_std_policy(), {"cabin_class": "Economy", "price_usd": 400})
    assert verdict.compliant is True
    assert verdict.violations == []


def test_violation_cabin_business_on_domestic():
    verdict = evaluate_policy(_std_policy(), {"cabin_class": "Business"})
    assert verdict.compliant is False
    assert any("Business" in v for v in verdict.violations)


def test_violation_price_exceeds_one_way_cap():
    verdict = evaluate_policy(_std_policy(), {"cabin_class": "Economy", "price_usd": 750})
    assert verdict.compliant is False
    assert any("500" in v for v in verdict.violations)


def test_compliant_roundtrip_under_cap():
    verdict = evaluate_policy(_std_policy(), {
        "cabin_class": "Economy", "price_usd": 850, "return_date": "2027-02-01"
    })
    assert verdict.compliant is True


def test_violation_roundtrip_over_cap():
    verdict = evaluate_policy(_std_policy(), {
        "cabin_class": "Economy", "price_usd": 950, "return_date": "2027-02-01"
    })
    assert verdict.compliant is False
    assert any("900" in v for v in verdict.violations)


def test_warning_advance_booking_short():
    # 5 days — below 7-day min but >= 2 → warning, not violation
    from datetime import date, timedelta
    depart = (date.today() + timedelta(days=5)).isoformat()
    verdict = evaluate_policy(_std_policy(), {"cabin_class": "Economy", "depart_date": depart})
    assert verdict.compliant is True
    assert any("5 day" in w for w in verdict.warnings)


def test_violation_advance_booking_critical():
    from datetime import date, timedelta
    depart = (date.today() + timedelta(days=1)).isoformat()
    verdict = evaluate_policy(_std_policy(), {"cabin_class": "Economy", "depart_date": depart})
    assert verdict.compliant is False
    assert any("minimum advance booking" in v for v in verdict.violations)


def test_violation_hotel_rate_over_cap():
    verdict = evaluate_policy(_std_policy(), {"hotel_rate_usd": 250})
    assert verdict.compliant is False
    assert any("200" in v for v in verdict.violations)


def test_warning_hotel_rate_near_cap():
    # $185 is within 10% of $200 cap
    verdict = evaluate_policy(_std_policy(), {"hotel_rate_usd": 185})
    assert verdict.compliant is True
    assert any("200" in w for w in verdict.warnings)


# ── evaluate_policy — International (POL-002) ─────────────────────────────────

def _intl_policy():
    return next(p for p in _policies() if p["applies_to"] == "international")


def test_business_allowed_international():
    verdict = evaluate_policy(_intl_policy(), {"cabin_class": "Business", "price_usd": 1400})
    assert verdict.compliant is True


def test_first_class_violation_international():
    verdict = evaluate_policy(_intl_policy(), {"cabin_class": "First"})
    assert verdict.compliant is False


def test_intl_price_cap():
    verdict = evaluate_policy(_intl_policy(), {"cabin_class": "Economy", "price_usd": 1600})
    assert verdict.compliant is False
    assert any("1500" in v for v in verdict.violations)


# ── evaluate_policy — Executive (POL-003) ────────────────────────────────────

def _exec_policy():
    return next(p for p in _policies() if p["applies_to"] == "executive")


def test_executive_first_class_allowed():
    verdict = evaluate_policy(_exec_policy(), {"cabin_class": "First", "price_usd": 4000})
    assert verdict.compliant is True


def test_policy_limits_in_verdict():
    verdict = evaluate_policy(_std_policy(), {"cabin_class": "Economy"})
    assert verdict.max_hotel_rate_usd == 200.0
    assert verdict.meal_per_diem_usd == 60.0
    assert verdict.approved_cabin == "Economy Plus"
