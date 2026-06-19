# NVA-26 — Admin: Agent Prompt Editor & Multi-Provider Model Selection

**Epic:** EPIC-NVA
**Points:** 5
**Status:** ✅ Done
**Sprint:** Sprint NVA-F

---

## Goal

Extend the Admin Panel with two new capabilities: (1) an **Agent Prompt Editor** tab where admins can view and edit the system prompt for each agent (Orchestrator, Search, Policy, Destination, Booking, Judge) with live hot-reload — no container restart; and (2) a **Model Selection** tab that replaces the current placeholder with a fully-featured provider matrix supporting OpenAI, Azure OpenAI, Anthropic, and open-source (Ollama) models, configurable per-agent, persisted to `agents.json`.

---

## Current State

| Area | Problem |
|---|---|
| Model Selection tab | Placeholder only — shows agent list but no provider dropdown, no model picker |
| Prompt editing | No UI exists; system prompts are hard-coded in Python source files |
| Provider support | Only Azure OpenAI wired; OpenAI direct, Anthropic, and Ollama require manual `agents.json` edits |

---

## Target Design

### Tab 1 — Agent Prompts

A new **Prompts** tab in AdminPanel (6th tab, replacing the current empty slot):

```
┌──────────────────────────────────────────────────────────────────┐
│ Admin                                             [✕]            │
│ [Models] [Prompts] [Audit] [Billing] [Eval] [History]            │
├──────────────────────────────────────────────────────────────────┤
│ Agent   ▾ orchestrator                                           │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ You are navanVoyageAI, a corporate travel assistant.         │ │
│ │ Synthesise the sub-agent results below into a single,        │ │
│ │ clear response for the traveller…                            │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                              [Reset to Default]  [Save & Reload]  │
└──────────────────────────────────────────────────────────────────┘
```

| Feature | Behaviour |
|---|---|
| Agent selector | Dropdown: orchestrator, search, policy, destination, booking, judge |
| Prompt textarea | Full system prompt; monospace font; auto-grows to 400px |
| Save & Reload | `PUT /api/admin/agent-prompts/{agent}` — writes to `config/prompts.json`; backend hot-reloads on next request |
| Reset to Default | Restores the hard-coded default prompt for the selected agent |
| Unsaved indicator | Tab label shows `●` dot when prompt has unsaved changes |

### Tab 2 — Model Selection (full replacement)

```
┌──────────────────────────────────────────────────────────────────┐
│ Agent          Provider            Model                Temp      │
│ orchestrator   [Azure OpenAI  ▾]   [gpt-4o         ▾]  [0.3]    │
│ search         [Azure OpenAI  ▾]   [gpt-4o         ▾]  [0.1]    │
│ policy         [Azure OpenAI  ▾]   [gpt-4o         ▾]  [0.0]    │
│ destination    [Azure OpenAI  ▾]   [gpt-4o         ▾]  [0.5]    │
│ booking        [Azure OpenAI  ▾]   [gpt-4o         ▾]  [0.1]    │
│ judge          [Anthropic     ▾]   [claude-opus-4-7▾]  [0.0]    │
│                                                  [Save All]       │
└──────────────────────────────────────────────────────────────────┘
```

**Providers and available models:**

| Provider ID | Display Name | Models |
|---|---|---|
| `azure_openai` | Azure OpenAI | `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo` |
| `openai` | OpenAI | `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `o1`, `o1-mini` |
| `anthropic` | Anthropic | `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001` |
| `ollama` | Ollama (local) | `llama3`, `mistral`, `qwen2.5`, `deepseek-r1` |

**Judge agent special toggle:** "Use Claude Opus for Eval (premium)" — when Anthropic is selected for judge, shows toggle that maps to `use_claude_opus: true` in agents.json (existing behaviour preserved).

---

## Backend Tasks

| # | Task | File |
|---|---|---|
| 1 | `GET /api/admin/agent-prompts` — returns `{agent: prompt}` dict from `config/prompts.json` (fallback to hard-coded defaults) | `backend/api/routers/admin.py` |
| 2 | `PUT /api/admin/agent-prompts/{agent}` — writes updated prompt to `config/prompts.json`; returns 200 | `backend/api/routers/admin.py` |
| 3 | Update all 6 agents to load system prompt from `config/prompts.json` at request time (hot-reload via `get_prompt(agent_name)`) | `backend/application/agent/*.py` |
| 4 | `GET /api/admin/model-config` — returns current `agents.json` (already exists, verify) | `backend/api/routers/admin.py` |
| 5 | `PUT /api/admin/model-config` — accepts `{agent: {provider, model, temperature}}` and writes to `agents.json`; update `_azure_client()` / routing in `base.py` to honour provider field | `backend/api/routers/admin.py`, `backend/application/agent/base.py` |

## Frontend Tasks

| # | Task | File |
|---|---|---|
| 6 | Create `AgentPromptsTab.tsx` — agent selector dropdown, monospace textarea, Save & Reload button, Reset button, unsaved-changes dot | `frontend/src/components/admin/AgentPromptsTab.tsx` |
| 7 | Create `ModelSelectionTab.tsx` (full replacement) — per-agent provider + model dropdowns + temperature input; Save All; Claude Opus toggle for judge | `frontend/src/components/admin/ModelSelectionTab.tsx` |
| 8 | Wire both new tabs into `AdminPanel.tsx` tab list | `frontend/src/components/admin/AdminPanel.tsx` |

---

## Files to Create / Modify

| File | Action |
|---|---|
| `config/prompts.json` | New — stores per-agent prompt overrides; empty `{}` on first run |
| `backend/api/routers/admin.py` | Modified — add prompt endpoints; update model-config endpoint |
| `backend/application/agent/base.py` | Modified — `get_prompt()` helper; multi-provider client routing |
| `backend/application/agent/orchestrator.py` | Modified — load AGGREGATE_PROMPT from `get_prompt("orchestrator")` |
| `backend/application/agent/search_agent.py` | Modified — load `_EXTRACT_PROMPT` from `get_prompt("search")` |
| `backend/application/agent/policy_agent.py` | Modified — load prompt from `get_prompt("policy")` |
| `backend/application/agent/destination_agent.py` | Modified — load prompt from `get_prompt("destination")` |
| `backend/application/agent/booking_agent.py` | Modified — load prompt from `get_prompt("booking")` |
| `backend/application/agent/judge_agent.py` | Modified — load prompt from `get_prompt("judge")` |
| `frontend/src/components/admin/AgentPromptsTab.tsx` | New |
| `frontend/src/components/admin/ModelSelectionTab.tsx` | New — full replacement of placeholder |
| `frontend/src/components/admin/AdminPanel.tsx` | Modified — add Prompts tab, replace Model Selection tab |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | Admin → Prompts tab shows current system prompt for orchestrator by default |
| 2 | Editing a prompt and clicking Save & Reload persists it; next chat turn uses the new prompt (no restart) |
| 3 | Reset to Default restores the hard-coded default prompt |
| 4 | Admin → Model Selection shows all 6 agents with provider + model dropdowns pre-filled from `agents.json` |
| 5 | Switching judge to Anthropic shows the "Use Claude Opus" toggle |
| 6 | Save All writes updated config to `agents.json`; next request uses the new model |
| 7 | Ollama provider shows local model options; backend falls back gracefully if Ollama is unreachable |

---

## Out of Scope

- Fine-tuning or LoRA configuration
- Streaming model comparison (side-by-side diff)
- Prompt versioning / history
