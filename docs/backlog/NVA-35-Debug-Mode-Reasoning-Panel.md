# NVA-35 — Debug Mode: Per-Message Reasoning Panel

**Epic:** EPIC-OBS  
**Points:** 3  
**Status:** ✅ Done  
**Sprint:** Sprint NVA-G

---

## Goal

Add an EDA-style **Debug Mode** toggle to the app header that, when enabled, reveals a collapsible reasoning panel below each assistant message showing the agents invoked, tool calls (inputs + outputs + latency), and token/model summary.

---

## Problem

The multi-agent pipeline — Orchestrator → SearchAgent → PolicyAgent → BookingAgent — is completely invisible to the user. There is no way for a demo evaluator or developer to see what happened inside the system for a given response.

---

## Solution

### Toggle
A `🐛 Debug` button in `AppHeader` (right side, next to theme picker). Click toggles `debugMode` boolean state, persisted in `localStorage` under key `nva_debug_mode`. Button shows yellow highlight and `🐛 Debug ON` label when active.

### Per-Message Debug Panel (`DebugPanel` component in `MessageBubble.tsx`)
Rendered below each assistant bubble when `debugMode === true && !isStreaming && turn.content`.

Collapsed by default (▶ trigger). Expands to show:

| Section | Data |
|---|---|
| Agents invoked | Comma-separated list from `turn.agents[]` |
| Model / Tokens | `turn.perf.model`, `input_tokens↑`, `output_tokens↓`, `latency_ms` |
| Tool calls | Each entry: tool name, latency, `in: <JSON>`, `out: <JSON>` (truncated at 480 chars) |

### SSE Capture
`ChatPage.tsx` listens for `mcp_tool_call` and `mcp_tool_result` events during streaming, building a `toolCallLog[]` that is attached to the `MessageTurn` as `tool_calls` when the `done` event fires. The `done` event from the backend now includes `"model": self.deployment`.

---

## Files Changed

| File | Action |
|---|---|
| `frontend/src/components/AppHeader.tsx` | Add `debugMode`, `onDebugToggle` props; render 🐛 Debug toggle button |
| `frontend/src/components/AppLayout.tsx` | Thread `debugMode`, `onDebugToggle` from App down to AppHeader |
| `frontend/src/components/Chat/MessageBubble.tsx` | Add `DebugPanel` component; render when `debugMode` |
| `frontend/src/components/Chat/ChatWindow.tsx` | Add `debugMode?` prop; pass to each `MessageBubble` |
| `frontend/src/pages/ChatPage.tsx` | Add `debugMode` state + localStorage; `toolCallLog` capture; `sendTimeRef` |
| `frontend/src/types/nva.ts` | Extend `MessageTurn` with `tool_calls?`; add `AgentEvent` fields |
| `backend/application/agent/orchestrator.py` | Include `"model": self.deployment` in `done` SSE event |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | 🐛 Debug button visible in header; click toggles yellow highlight |
| 2 | State persists across page reloads (localStorage) |
| 3 | Debug panel absent when `debugMode` is false |
| 4 | Panel present and collapsed by default when `debugMode` is true |
| 5 | Expanding panel shows agents invoked (or "no data" if none) |
| 6 | Tool calls show tool name, latency, truncated input/output |
| 7 | Model name from `done` event appears in debug panel |
| 8 | `npx tsc --noEmit` exits 0 |

---

## Out of Scope

- Streaming debug events in real-time (all data surfaces after `done`)
- Copy-to-clipboard for debug JSON
- Per-agent token breakdown
