"""Unit tests for JudgeAgent — mocks LLM calls, tests scoring and DB writes."""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.application.agent.judge_agent import JudgeAgent, _compute_total, _llm_score_azure


# ── _compute_total ────────────────────────────────────────────────────────────

def test_compute_total_perfect():
    scores = {"relevance": 1.0, "accuracy": 1.0, "policy_compliance": 1.0,
              "completeness": 1.0, "tone": 1.0}
    assert _compute_total(scores) == 1.0


def test_compute_total_zero():
    scores = {"relevance": 0.0, "accuracy": 0.0, "policy_compliance": 0.0,
              "completeness": 0.0, "tone": 0.0}
    assert _compute_total(scores) == 0.0


def test_compute_total_mixed():
    scores = {"relevance": 1.0, "accuracy": 0.5, "policy_compliance": 0.8,
              "completeness": 0.6, "tone": 1.0}
    result = _compute_total(scores)
    assert abs(result - 0.78) < 0.01


def test_compute_total_missing_key_defaults_zero():
    scores = {"relevance": 1.0}  # missing 4 keys → each defaults to 0.0
    result = _compute_total(scores)
    assert abs(result - 0.2) < 0.01


# ── evaluate() — Azure path ───────────────────────────────────────────────────

_GOOD_SCORES = {
    "relevance": 0.9, "accuracy": 0.85, "policy_compliance": 0.95,
    "completeness": 0.8, "tone": 1.0,
    "reasoning": "Response was clear, accurate, and policy-aware.",
}


@pytest.mark.asyncio
async def test_evaluate_azure_writes_to_db():
    agent = JudgeAgent.__new__(JudgeAgent)
    agent._cfg = {}

    mock_db = MagicMock()
    mock_db["nva_eval_scores"].insert_one = AsyncMock()
    mock_db["nva_conversations"].update_one = AsyncMock()

    with patch("backend.application.agent.judge_agent.get_agent_config",
               return_value={"deployment": "gpt-4o", "use_claude_opus": False,
                             "eval_threshold": 0.75, "max_tokens": 512}), \
         patch("backend.application.agent.judge_agent._llm_score_azure",
               AsyncMock(return_value=_GOOD_SCORES)):

        await agent.evaluate("conv-1", "Find flights to Paris", "Here are flights...", mock_db)

    mock_db["nva_eval_scores"].insert_one.assert_awaited_once()
    call_arg = mock_db["nva_eval_scores"].insert_one.call_args[0][0]
    assert call_arg["passed"] is True
    assert call_arg["total_score"] > 0.75
    assert "scores" in call_arg
    assert call_arg["conversation_id"] == "conv-1"


@pytest.mark.asyncio
async def test_evaluate_below_threshold_marks_failed():
    agent = JudgeAgent.__new__(JudgeAgent)
    agent._cfg = {}

    low_scores = {k: 0.3 for k, _ in [
        ("relevance", ""), ("accuracy", ""), ("policy_compliance", ""),
        ("completeness", ""), ("tone", ""),
    ]}
    low_scores["reasoning"] = "Poor response"

    mock_db = MagicMock()
    mock_db["nva_eval_scores"].insert_one = AsyncMock()
    mock_db["nva_conversations"].update_one = AsyncMock()

    with patch("backend.application.agent.judge_agent.get_agent_config",
               return_value={"deployment": "gpt-4o", "use_claude_opus": False,
                             "eval_threshold": 0.75, "max_tokens": 512}), \
         patch("backend.application.agent.judge_agent._llm_score_azure",
               AsyncMock(return_value=low_scores)):

        await agent.evaluate("conv-2", "Help me", "...", mock_db)

    call_arg = mock_db["nva_eval_scores"].insert_one.call_args[0][0]
    assert call_arg["passed"] is False


@pytest.mark.asyncio
async def test_evaluate_no_db_does_not_raise():
    agent = JudgeAgent.__new__(JudgeAgent)
    agent._cfg = {}

    with patch("backend.application.agent.judge_agent.get_agent_config",
               return_value={"deployment": "gpt-4o", "use_claude_opus": False,
                             "eval_threshold": 0.75, "max_tokens": 512}), \
         patch("backend.application.agent.judge_agent._llm_score_azure",
               AsyncMock(return_value=_GOOD_SCORES)):

        # Should complete without raising even with db=None
        await agent.evaluate("conv-3", "Find hotels", "Here are hotels...", None)


@pytest.mark.asyncio
async def test_evaluate_llm_exception_does_not_raise():
    agent = JudgeAgent.__new__(JudgeAgent)
    agent._cfg = {}

    mock_db = MagicMock()
    mock_db["nva_eval_scores"].insert_one = AsyncMock()

    with patch("backend.application.agent.judge_agent.get_agent_config",
               return_value={"deployment": "gpt-4o", "use_claude_opus": False,
                             "eval_threshold": 0.75, "max_tokens": 512}), \
         patch("backend.application.agent.judge_agent._llm_score_azure",
               AsyncMock(side_effect=Exception("timeout"))):

        # Must not raise — fire-and-forget must be resilient
        await agent.evaluate("conv-4", "msg", "resp", mock_db)

    mock_db["nva_eval_scores"].insert_one.assert_not_awaited()


@pytest.mark.asyncio
async def test_evaluate_claude_flag_routes_to_claude():
    agent = JudgeAgent.__new__(JudgeAgent)
    agent._cfg = {}

    mock_db = MagicMock()
    mock_db["nva_eval_scores"].insert_one = AsyncMock()
    mock_db["nva_conversations"].update_one = AsyncMock()

    with patch("backend.application.agent.judge_agent.get_agent_config",
               return_value={"deployment": "gpt-4o", "use_claude_opus": True,
                             "eval_threshold": 0.75, "max_tokens": 512}), \
         patch("backend.application.agent.judge_agent._llm_score_claude",
               AsyncMock(return_value=_GOOD_SCORES)) as mock_claude, \
         patch("backend.application.agent.judge_agent._llm_score_azure",
               AsyncMock(return_value=_GOOD_SCORES)) as mock_azure:

        await agent.evaluate("conv-5", "msg", "resp", mock_db)

    mock_claude.assert_awaited_once()
    mock_azure.assert_not_awaited()


@pytest.mark.asyncio
async def test_evaluate_stores_model_name_azure():
    agent = JudgeAgent.__new__(JudgeAgent)
    agent._cfg = {}

    mock_db = MagicMock()
    mock_db["nva_eval_scores"].insert_one = AsyncMock()
    mock_db["nva_conversations"].update_one = AsyncMock()

    with patch("backend.application.agent.judge_agent.get_agent_config",
               return_value={"deployment": "gpt-4o", "use_claude_opus": False,
                             "eval_threshold": 0.75, "max_tokens": 512}), \
         patch("backend.application.agent.judge_agent._llm_score_azure",
               AsyncMock(return_value=_GOOD_SCORES)):

        await agent.evaluate("conv-6", "msg", "resp", mock_db)

    doc = mock_db["nva_eval_scores"].insert_one.call_args[0][0]
    assert doc["model"] == "gpt-4o"


@pytest.mark.asyncio
async def test_evaluate_malformed_json_from_llm_does_not_raise():
    agent = JudgeAgent.__new__(JudgeAgent)
    agent._cfg = {}

    mock_db = MagicMock()

    with patch("backend.application.agent.judge_agent.get_agent_config",
               return_value={"deployment": "gpt-4o", "use_claude_opus": False,
                             "eval_threshold": 0.75, "max_tokens": 512}), \
         patch("backend.application.agent.judge_agent._llm_score_azure",
               AsyncMock(side_effect=json.JSONDecodeError("bad", "", 0))):

        await agent.evaluate("conv-7", "msg", "resp", mock_db)


# ── run() raises NotImplementedError ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_run_raises():
    from backend.application.agent.base import AgentContext
    agent = JudgeAgent.__new__(JudgeAgent)
    agent._cfg = {}
    ctx = AgentContext(conversation_id="x", user="u", message="m")
    with pytest.raises(NotImplementedError):
        await agent.run(ctx)
