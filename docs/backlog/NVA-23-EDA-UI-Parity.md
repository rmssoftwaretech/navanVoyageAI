# NVA-23 — EDA UI Parity: Classic Theme, Token System, Inspector Panel & Chat UX

**Epic:** EPIC-NVA
**Points:** 8
**Status:** ✅ Done
**Sprint:** Sprint NVA-F
**Depends on:** NVA-22

---

## Goal

Migrate the navanVoyageAI Tailwind frontend (`frontend/`) to match the full UI experience of the EnterpriseDataAgent (EDA) chat and admin apps. This covers five pillars: (1) the CSS design-token system with the Classic theme as default and a live theme-switcher supporting all 6 built-in themes + dark mode, (2) the MCP Inspector Panel with resizable columns, tabbed layout, and tooltip-on-hover output cells, (3) the InputBar with auto-resize textarea, Think Mode selector, char-count badge, and Send/Stop button pair, (4) the Conversation History sidebar styled identically to the EDA sidebar with eval badges, and (5) the Debug Console tab inside the Inspector Panel showing raw LLM events (tool call JSON, token counts, SSE frames). The result is a navanVoyageAI UI that feels like a native EDA product variant.

---

## Current State

| Area | Problem |
|---|---|
| CSS / tokens | Uses ad-hoc inline styles and a small set of `--nva-navy`/`--nva-gold` vars; no design-token cascade, no shadow/radius/type-scale system |
| Theme switching | None — single hard-coded navy/gold colour scheme; no dark mode |
| MCP Inspector Panel | Placeholder text only: "Tool calls appear here during streaming" |
| Chat InputBar | Basic `<textarea>` + Send button; no auto-resize, no Think Mode, no char count, no Stop button |
| Conversation History | Minimal sidebar with title + turn count; no eval badges, no search, no date grouping |
| Debug Console | No raw LLM event viewer; no way to inspect SSE frames or tool JSON during a turn |

---

## Target Design / Specification

### 1 — CSS Design-Token System

Port the EDA Admin Design System v5 token set into `frontend/src/index.css`. Tokens control every colour, spacing, shadow, and radius used in the app. Theme switching overwrites tokens on `document.documentElement` at runtime.

```css
/* ── Brand (overridden by applyTheme()) ───── */
--brand:          #1473e6;        /* Classic default */
--brand-hover:    #0d66d0;
--brand-light:    rgba(20,115,230,0.08);
--brand-medium:   rgba(20,115,230,0.15);
--brand-gradient: #1473e6;        /* flat for Classic; gradient for other themes */

/* ── Surfaces ──────────────────────────────── */
--bg-page:    #f5f5f5;
--bg-surface: #ffffff;
--bg-raised:  #ffffff;
--bg-hover:   rgba(20,115,230,0.05);

/* ── Text ──────────────────────────────────── */
--text-primary:   #2c2c2c;
--text-secondary: #4a4a4a;
--text-muted:     #6b6b6b;
--text-dim:       #9a9a9a;

/* ── Borders ───────────────────────────────── */
--border:        rgba(20,115,230,0.18);
--border-light:  rgba(20,115,230,0.10);
--border-strong: rgba(20,115,230,0.40);

/* ── Semantic ──────────────────────────────── */
--success: #16a34a;   --success-bg: rgba(22,163,74,0.08);
--warning: #d97706;   --warning-bg: rgba(217,119,6,0.08);
--danger:  #dc2626;   --danger-bg:  rgba(220,38,38,0.08);
--info:    #2563eb;   --info-bg:    rgba(37,99,235,0.08);

/* ── Type scale ────────────────────────────── */
--text-xs: 11px;  --text-sm: 12px;  --text-base: 13px;
--text-md: 14px;  --text-lg: 15px;  --text-xl: 18px;  --text-2xl: 22px;

/* ── Spacing (4px grid) ────────────────────── */
--sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px;
--sp-5:20px; --sp-6:24px; --sp-8:32px; --sp-10:40px;

/* ── Radius ────────────────────────────────── */
--r-sm:4px; --r-md:6px; --r-lg:8px; --r-xl:12px; --r-2xl:16px; --r-full:9999px;

/* ── Shadows ───────────────────────────────── */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
--shadow-lg: 0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06);

/* ── Font ──────────────────────────────────── */
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
```

**Dark mode:** When `html.dark` class is set, override surface/text/border tokens (same selectors as EDA).

### 2 — Built-in Theme Switcher

Six built-in themes — identical to EDA. Theme state persists to `localStorage` under key `nva_theme`. Applied on first paint (sync read) and on user selection.

| ID | Name | Brand | Dark | Gradient |
|---|---|---|---|---|
| `classic` | Classic | `#1473e6` | No | Flat (default for NVA) |
| `verna` | Verna | `#7154fa` | No | `135deg #7154fa→#b93fd3→#eb1000` |
| `midnight` | Midnight | `#8b78fb` | Yes | `135deg #1e1e2e→#2d2b55` |
| `material` | Material | `#6750a4` | No | `135deg #6750a4→#7965af` |
| `grey` | Grey | `#64748b` | No | `135deg #64748b→#94a3b8` |
| `slate` | Slate | `#94a3b8` | Yes | `135deg #0f172a→#1e293b` |

**UI:** A `ThemePicker` dropdown in the app header (swatch + name + sun/moon badge). Matches the EDA ThemePicker component design — no edit/delete for built-ins.

```
┌────────────────────────────────────────────────────────┐
│ ✈ navanVoyageAI                    [🎨 Theme▾] [Sign Out] │
└────────────────────────────────────────────────────────┘
        ┌──────────────────────────┐
        │ ● Classic           ☀   ✓│
        │ ○ Verna             ☀    │
        │ ○ Midnight          🌙   │
        │ ○ Material          ☀    │
        │ ○ Grey              ☀    │
        │ ○ Slate             🌙   │
        └──────────────────────────┘
```

### 3 — InputBar (matching EDA chat UX)

Replace the current `ChatInput` with a full EDA-parity `InputBar`:

```
┌─────────────────────────────────────────────────────────┐
│  Ask about flights, hotels, or travel policy…           │
│                                                         │
│  0/2000            [💡 Think▾]   [⏹ Stop] [➤ Send]    │
└─────────────────────────────────────────────────────────┘
```

| Feature | Behaviour |
|---|---|
| Auto-resize | `<textarea>` grows up to 240px as user types; resets after send |
| Char count | Live `n/2000` badge, bottom-left |
| Think Mode | Dropdown with 6 modes (Shorter, Longer, Deeper, Smart, Study, Search); appends suffix to message |
| Send button | Submits; icon matches EDA (arrow icon, brand-coloured) |
| Stop button | Visible during streaming; calls `AbortController.abort()`; hidden otherwise |
| Enter to send | Enter = send; Shift+Enter = newline |

### 4 — MCP Inspector Panel

Replace the placeholder with the full EDA InspectorPanel (adapted for NVA agent events). Resizable-column table, 8 tabs:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔌 MCP Inspector                                          [✕]   │
│ [Tools ●3] [Tokens] [Context] [Console] [Network] [Perf] [Eval] │
├─────────────────────────────────────────────────────────────────┤
│ #  │ Agent      │ Tool          │ Input (hover→tooltip)         │
│ 1  │ search     │ search_flights│ {"origin":"SFO","dest":"NRT"} │
│ 2  │ policy     │ check_cabin   │ {"class":"business"}          │
│ 3  │ destination│ get_briefing  │ {"city":"Tokyo"}              │
└─────────────────────────────────────────────────────────────────┘
```

| Tab | Content |
|---|---|
| **Tools** | Resizable table: #, Agent, Tool name, Input (tooltip on hover), Output (tooltip), Status, Latency ms |
| **Tokens** | Session totals + last-turn breakdown (input/output/cache read/write) matching EDA token tab |
| **Context** | Scrollable pre-formatted context window with section labels |
| **Console** | Raw SSE event log — `agent_start`, `token`, `mcp_tool_call`, `mcp_tool_result`, `done`, `error`; colour-coded by type |
| **Network** | HTTP request log for MCP sidecar calls (method, URL, status, duration) |
| **Perf** | Per-agent latency bar chart (same CSS bar approach as EDA) |
| **Eval** | JudgeAgent 5-criteria scores inline (relevance / accuracy / policy / completeness / tone) |

**Debug Console tab detail:** Each row: timestamp · event type badge (colour-coded) · label · JSON payload (truncated, click to expand). Mirrors EDA's `console-entry--info/warn/error` CSS classes.

### 5 — Conversation History Sidebar

Replace the minimal sidebar with EDA-parity list:

```
┌──────────────────────────┐
│ [+ New Chat]             │
│ ──────────────────────── │
│ 🔍 Search conversations  │
│ ──────────────────────── │
│ Today                    │
│ ┌──────────────────────┐ │
│ │Tokyo business trip   │ │
│ │ 6 turns · ✓ 91%     │ │
│ └──────────────────────┘ │
│ Yesterday                │
│ ┌──────────────────────┐ │
│ │NYC hotel options     │ │
│ │ 4 turns · ✕ 68%     │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

| Feature | Behaviour |
|---|---|
| Date grouping | Today / Yesterday / This Week / Earlier |
| Search | Client-side filter on conversation title |
| Eval badge | Green ✓ + score if eval_passed; red ✕ + score if failed; grey dot if no eval yet |
| Active highlight | Left border `--brand` + `--brand-light` background |
| Hover | `--bg-hover` background transition |

---

## Tasks

| # | Task | Layer | Status |
|---|---|---|---|
| 1 | Replace `frontend/src/index.css` with full EDA token system; set Classic as default | Frontend | ⬜ |
| 2 | Create `frontend/src/services/themes.ts` — `BUILTIN_THEMES`, `applyTheme()`, `migrateLegacyThemeFlags()` | Frontend | ⬜ |
| 3 | Create `frontend/src/components/ThemePicker.tsx` — dropdown with swatch, name, sun/moon badge | Frontend | ⬜ |
| 4 | Wire ThemePicker into `AppLayout`/header; persist + restore theme on load | Frontend | ⬜ |
| 5 | Add Inter font import and `html.dark` CSS block to `index.css` | Frontend | ⬜ |
| 6 | Rewrite `frontend/src/components/ChatInput.tsx` → `InputBar.tsx` with auto-resize, Think Mode, char count, Stop button | Frontend | ⬜ |
| 7 | Wire `AbortController` into `sendMessage()` in `chat.ts` SSE stream; expose `abort()` to InputBar | Frontend | ⬜ |
| 8 | Rewrite `frontend/src/components/McpInspectorPanel.tsx` — 7-tab layout, resizable columns, OutputCell tooltip | Frontend | ⬜ |
| 9 | Add Console tab: capture raw SSE events in `ChatPage`; pass `consoleLog[]` to Inspector | Frontend | ⬜ |
| 10 | Add Network tab: log `fetch()` calls to amadeus-mcp from SSE stream metadata | Frontend | ⬜ |
| 11 | Add Perf tab: per-agent latency bars from `agent_start`/`agent_done` timestamps | Frontend | ⬜ |
| 12 | Rewrite conversation sidebar with date grouping, search input, eval badges | Frontend | ⬜ |
| 13 | Apply token CSS vars throughout all existing components (replace inline hex colours) | Frontend | ⬜ |
| 14 | Smoke-test all 6 themes + dark mode on login, chat, inspector, and admin modal | Frontend | ⬜ |

---

## Files to Create / Modify

| File | Action |
|---|---|
| `frontend/src/index.css` | Modified — replace with full EDA token system + dark mode block + Inter font |
| `frontend/src/services/themes.ts` | New — `BUILTIN_THEMES`, `applyTheme()`, `deriveTokens()`, `migrateLegacyThemeFlags()` |
| `frontend/src/components/ThemePicker.tsx` | New — theme dropdown, swatch, sun/moon badges |
| `frontend/src/components/InputBar.tsx` | New — replaces ChatInput; auto-resize, Think Mode, Stop button |
| `frontend/src/services/chat.ts` | Modified — add `AbortController` support to `sendMessage()` |
| `frontend/src/components/McpInspectorPanel.tsx` | Modified — full 7-tab EDA-parity inspector |
| `frontend/src/components/ConversationSidebar.tsx` | New — replaces inline sidebar in ChatPage; date groups, search, eval badges |
| `frontend/src/pages/ChatPage.tsx` | Modified — wire InputBar, ConversationSidebar, Inspector consoleLog/networkLog props |
| `frontend/src/types/nva.ts` | Modified — add `ConsoleEntry`, `NetworkEntry`, `PerformanceEntry` types |

---

## Acceptance Criteria

| # | Check | Status |
|---|---|---|
| 1 | Classic theme is applied on first load (navy → `#1473e6`); no inline colour styles remain | ⬜ |
| 2 | Theme picker in header shows all 6 themes; switching updates the full UI instantly and persists across refresh | ⬜ |
| 3 | Midnight and Slate themes apply dark mode (`html.dark`); all surfaces, borders, and text update correctly | ⬜ |
| 4 | InputBar auto-resizes from 1 to max 240px; char count shows live; Enter sends; Shift+Enter inserts newline | ⬜ |
| 5 | Stop button appears during streaming and aborts the SSE stream cleanly | ⬜ |
| 6 | Think Mode appends correct suffix to message (verified in Console tab raw event log) | ⬜ |
| 7 | Inspector Panel opens/closes via toggle; Tools tab shows one row per MCP tool call during a live turn | ⬜ |
| 8 | Hovering the Input or Output cell in the Tools table shows a full-text tooltip (portal-rendered) | ⬜ |
| 9 | Console tab shows colour-coded SSE event rows (agent_start=blue, token=grey, done=green, error=red) | ⬜ |
| 10 | Eval tab in Inspector shows JudgeAgent criteria scores matching the `nva_eval_scores` document | ⬜ |
| 11 | Conversation sidebar groups conversations by Today / Yesterday / This Week / Earlier | ⬜ |
| 12 | Conversation sidebar search filters by title client-side with no flicker | ⬜ |
| 13 | Eval badge (✓ green / ✕ red / dot grey) renders correctly on each conversation row | ⬜ |
| 14 | All 6 themes look correct on Login page, Chat page, Inspector Panel, and Admin Modal | ⬜ |

---

## Out of Scope

- Custom theme builder / ThemeBuilder component (EDA-only feature — not needed for NVA demo)
- Spectrum 2 (`frontend-spectrum/`) and Angular M3 (`frontend-angular/`) variants — covered separately in NVA-24 and NVA-25
- Backend changes — all work is pure frontend CSS and TypeScript
- Token budget progress bar and HyperParams tab (EDA-specific, no equivalent in NVA backend)
- Connections tab (EDA MCP server list — NVA uses a single fixed sidecar)
