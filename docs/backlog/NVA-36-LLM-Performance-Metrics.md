# NVA-36 — LLM Performance Metrics Row

**Epic:** EPIC-OBS  
**Points:** 2  
**Status:** ✅ Done  
**Sprint:** Sprint NVA-G

---

## Goal

Show a compact performance metrics row beneath each completed assistant message, displaying end-to-end latency, input/output token counts, and the model name — always visible (not gated by debug mode).

---

## Problem

Enterprise travel AI demos need to communicate cost awareness and speed. Without any token or latency display, stakeholders cannot evaluate the system's efficiency or project per-query costs. The EDA reference application surfaced this data at the message level.

---

## Solution

### `TurnPerf` type
```typescript
interface TurnPerf {
  latency_ms: number
  input_tokens: number
  output_tokens: number
  model?: string
}
```
Attached to `MessageTurn` as optional `perf?` field.

### `PerfBar` component (`MessageBubble.tsx`)
Renders a flex row of chip-style spans:

| Chip | Format |
|---|---|
| Latency | `⏱ 1.2s` (≥1000ms) or `⏱ 840ms` |
| Input tokens | `↑ 1,234 tokens` |
| Output tokens | `↓ 456 tokens` |
| Model | monospace chip, e.g. `gpt-4o` |

Chips use `var(--bg-page)` fill, `var(--border)` stroke, `var(--text-muted)` text — consistent with the existing chip design system.

### Data flow
- `ChatPage.tsx` records `sendTimeRef.current = Date.now()` at send time
- On `done` SSE event: `latency_ms = Date.now() - sendTimeRef.current`
- `input_tokens`, `output_tokens` parsed from `done` event payload
- `model` from `done` event payload (added by orchestrator)
- `perf` object attached to the assistant `MessageTurn` before adding to turns list

---

## Files Changed

| File | Action |
|---|---|
| `frontend/src/types/nva.ts` | Add `TurnPerf` interface; add `perf?` to `MessageTurn` |
| `frontend/src/components/Chat/MessageBubble.tsx` | Add `PerfBar` component; render after assistant bubble when `turn.perf` present |
| `frontend/src/pages/ChatPage.tsx` | Add `sendTimeRef`; populate `perf` from `done` event |
| `backend/application/agent/orchestrator.py` | Include `model`, `input_tokens`, `output_tokens` in `done` SSE payload |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | After each assistant response, a perf row appears below the bubble |
| 2 | Latency ≥1s shown as `X.Xs`; <1s shown as `Xms` |
| 3 | Token counts formatted with locale comma separators |
| 4 | Model chip shows the model name from the `done` event |
| 5 | Perf row absent during streaming (only shows after `done`) |
| 6 | Perf row visible regardless of debug mode setting |
| 7 | `npx tsc --noEmit` exits 0 |

---

## Out of Scope

- Cost estimate in dollars (requires per-model pricing table)
- Per-agent token breakdown
- Token budget warning thresholds
