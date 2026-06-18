"""Smoke tests for Pydantic models."""
from backend.db.models import (
    AuditLog,
    Booking,
    BookingSegment,
    Conversation,
    EvalScore,
    EvalCriteria,
    MemoryEntry,
    Policy,
    Turn,
    UserMemory,
)


def test_turn_defaults():
    t = Turn(role="user", content="hello")
    assert t.role == "user"
    assert t.agents == []
    assert t.eval_score is None


def test_conversation_defaults():
    c = Conversation(conversation_id="abc", user="traveller")
    assert c.title == "New conversation"
    assert c.turns == []
    assert c.turns_count == 0


def test_policy_model():
    p = Policy(policy_id="POL-001", name="Test Policy")
    assert p.flight.max_one_way_usd == 500.0
    assert p.hotel.max_nightly_rate_usd == 200.0
    assert p.applies_to == "all"


def test_eval_score_passed():
    criteria = EvalCriteria(
        accuracy=0.9, policy_compliance=0.85, helpfulness=0.8, tone=0.9, safety=1.0
    )
    score = EvalScore(
        score_id="s1",
        conversation_id="c1",
        turn_index=0,
        user="traveller",
        overall_score=0.89,
        criteria=criteria,
        passed=True,
    )
    assert score.passed is True
    assert score.overall_score == 0.89


def test_booking_defaults():
    b = Booking(booking_id="NVA-2027-00001", conversation_id="c1", user="traveller")
    assert b.status == "confirmed"
    assert b.policy_compliant is True


def test_user_memory_defaults():
    m = UserMemory(user="traveller")
    assert m.memory_entries == []
    assert m.home_airport == ""


def test_memory_entry():
    e = MemoryEntry(fact="Prefers window seats", source="explicit", confidence=1.0)
    assert e.reinforcement_count == 1
    assert e.source == "explicit"
