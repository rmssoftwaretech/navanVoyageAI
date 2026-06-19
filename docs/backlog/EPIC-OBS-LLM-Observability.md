# EPIC-OBS — LLM Observability & Developer Experience

**Status:** ✅ Done  
**Sprint:** Sprint NVA-G  
**Stories:** NVA-34, NVA-35, NVA-36, NVA-37  
**Total Points:** 9

---

## Goal

Surface what the LLM is actually doing behind every assistant message. This epic adds four layers of visibility to the navanVoyageAI chat UI:

1. **Extended model support** — GPT-5.4 available in Azure OpenAI and OpenAI provider dropdowns
2. **Debug Mode** — collapsible per-message panel listing agents invoked, tool calls with inputs/outputs, token counts, and model used
3. **Performance Metrics** — always-visible latency, input/output token chips, and model label below each assistant bubble
4. **Feedback Controls** — 👍 👎 🚩 reactions per message with an optional comment, written to the database for offline analysis

Collectively these features let developers demo the system at a CMU capstone level — showing the multi-agent pipeline in action — and give product owners a feedback signal from day-one users.

---

## Motivation

navanVoyageAI is a **demo platform** as much as a product. The audience includes faculty, TA evaluators, and industry partners who want to see the AI reasoning process, not just the final answer. Without observability, the multi-agent architecture is invisible. With it, the platform shows:

- Which sub-agents fired (SearchAgent, PolicyAgent, DestinationAgent…)
- What the Amadeus MCP tool received and returned
- How long the whole pipeline took
- How many tokens were consumed (cost awareness for enterprise context)
- Whether users found the response helpful

---

## Stories

| Story | Title | Points | Status |
|---|---|---|---|
| NVA-34 | GPT-5.4 Model Support | 1 pt | ✅ Done |
| NVA-35 | Debug Mode — Per-Message Reasoning Panel | 3 pts | ✅ Done |
| NVA-36 | LLM Performance Metrics Row | 2 pts | ✅ Done |
| NVA-37 | Message Feedback Controls | 3 pts | ✅ Done |

---

## Design Contracts

- Debug panel gated by `debugMode` state, persisted in `localStorage` under key `nva_debug_mode`
- Perf metrics always visible (not gated) when `turn.perf` is present
- Feedback submitted to `POST /api/chat/feedback` → `nva_feedback` MongoDB collection
- `done` SSE event carries `model: self.deployment` from OrchestratorAgent
- `latency_ms` computed frontend-side: `Date.now() - sendTimeRef.current` at `done` event
- All post-bubble sections (debug, perf, feedback) render only when `!isStreaming && turn.content`

---

## Out of Scope

- Per-agent token breakdown (only total)
- Streaming debug events in real-time during SSE
- Feedback analytics dashboard (separate story, planned for Sprint NVA-H)
- Sentiment analysis on feedback comments
