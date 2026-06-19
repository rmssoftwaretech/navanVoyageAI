# NVA-33 — Admin Panel: Prompt Editor, Dark Mode, Exports & Live Refresh

**Epic:** EPIC-NVA
**Points:** 5
**Status:** ✅ Done
**Sprint:** Sprint NVA-G

---

## Goal

Four targeted improvements to the Admin Panel: (1) implement the Agent Prompt Editor tab (partially designed in NVA-26 but not yet built), (2) expose a dark-mode toggle persisted per admin user, (3) add CSV/JSON export buttons to Audit Log and Billing tabs, and (4) add live auto-refresh to Audit Log, Billing, and Eval tabs.

---

## Feature Breakdown

### 1 — Agent Prompt Editor Tab (from NVA-26 spec)

A **Prompts** tab (6th tab, replacing the current empty History slot if not yet occupied):

```
Agent  ▾ orchestrator
┌────────────────────────────────────────────────────────────────┐
│ You are navanVoyageAI, a corporate travel assistant.           │
│ Synthesise the sub-agent results below into a single,          │
│ clear response for the traveller…                              │
└────────────────────────────────────────────────────────────────┘
                                  [Reset to Default]  [Save & Reload]
```

| Feature | Behaviour |
|---|---|
| Agent selector | Dropdown: orchestrator, search, policy, destination, booking, judge |
| Textarea | Monospace font; auto-grows to 400px max |
| Unsaved indicator | Tab label shows `●` dot when there are unsaved changes |
| Save & Reload | `PUT /api/admin/agent-prompts/{agent}` — writes `config/prompts.json`; backend hot-reloads on next request |
| Reset to Default | Restores the hard-coded default prompt for that agent |

Backend:
- `GET /api/admin/agent-prompts` → `{agent: prompt}` dict (falls back to hard-coded defaults if `config/prompts.json` is absent)
- `PUT /api/admin/agent-prompts/{agent}` → writes `config/prompts.json`; returns 200
- Each agent loads its prompt from `config/prompts.json` at request time via `get_prompt(agent_name)`

### 2 — Dark Mode Toggle

A ☀/🌙 toggle button in the Admin Panel header (top-right, next to Close):
- Calls `applyTheme(theme)` from `services/themes.ts`.
- Persists to `localStorage` under `nva_theme`.
- Applies immediately without page reload.
- Resets to the user's current theme preference on panel close.

### 3 — CSV / JSON Export

| Tab | Export Formats |
|---|---|
| Audit Log | **Export CSV** — columns: timestamp, user, action, agent, details |
| Billing | **Export CSV** — columns: period, agent, input_tokens, output_tokens, cost_usd |
| Eval Scores | **Export JSON** — array of eval score documents |

Each tab gets an **Export ▾** dropdown button in its top-right corner with the format options. Exports are client-side (no new endpoint needed) — data already in state is serialised and downloaded via `URL.createObjectURL`.

### 4 — Auto-Refresh

| Tab | Behaviour |
|---|---|
| Audit Log | Polls `GET /api/admin/audit-log` every 10s while the tab is active; shows "Last updated: Xs ago" |
| Billing | Refresh button + auto-refresh every 60s |
| Eval Scores | Polls every 15s; new row animates in with a brief highlight |

A shared `usePolling(fn, intervalMs)` hook handles the polling lifecycle (starts on mount, clears on unmount/tab-switch).

---

## Files to Create / Modify

| File | Action |
|---|---|
| `frontend/src/components/admin/AgentPromptsTab.tsx` | **New** — prompt editor tab |
| `frontend/src/components/admin/AdminPanel.tsx` | Add Prompts tab; add dark mode toggle |
| `frontend/src/hooks/usePolling.ts` | **New** — shared polling hook |
| `frontend/src/components/admin/AuditLogTab.tsx` | Add Export ▾ dropdown; wire `usePolling` |
| `frontend/src/components/admin/BillingTab.tsx` | Add Export ▾ dropdown; wire `usePolling` |
| `frontend/src/components/admin/EvalMetricsTab.tsx` | Wire `usePolling`; highlight new rows |
| `frontend/src/services/admin.ts` | Add `getAgentPrompts()`, `updateAgentPrompt()` |
| `backend/api/routers/admin.py` | Add `GET/PUT /agent-prompts` endpoints |
| `backend/application/agent/base.py` | Add `get_prompt(agent_name)` with `config/prompts.json` fallback |
| `backend/application/agent/*.py` | Load system prompt via `get_prompt()` instead of hard-coded string |
| `config/prompts.json` | **New** — empty `{}` on first run; written by backend on save |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | Admin → Prompts tab shows current orchestrator prompt by default |
| 2 | Editing prompt and clicking Save & Reload persists it; next chat turn uses new prompt |
| 3 | Tab label shows `●` dot when there are unsaved changes |
| 4 | Reset to Default restores hard-coded default without saving |
| 5 | Dark mode toggle in Admin Panel header switches theme immediately |
| 6 | Audit Log Export CSV downloads a valid CSV file |
| 7 | Billing Export CSV downloads with correct column headings |
| 8 | Audit Log auto-refreshes every 10s; shows "Last updated Xs ago" |
| 9 | New eval rows animate in with brief yellow highlight |

---

## Out of Scope

- Prompt versioning / history / diff
- Per-user dark mode sync across browsers (localStorage only)
- Real-time WebSocket push (polling is sufficient for MVP)
