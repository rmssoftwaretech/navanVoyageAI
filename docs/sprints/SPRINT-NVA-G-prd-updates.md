# Sprint NVA-G — PRD Updates

**Sprint:** NVA-G — UX Polish & MCP Integration Hardening
**Date:** 2026-06-19
**Type:** Sprint Closure / PRD Delta

---

## Changes from Original Specification

### NVA-38 Scope Adjustments

The original NVA-38 spec called for a dedicated **MCP Servers tab** in the Admin panel (separate from the existing MCP Bindings tab). During implementation, the MCP connectivity information was consolidated into the existing **MCP Bindings tab** (`McpBindingsTab.tsx`) rather than creating a new tab. This decision avoids tab overflow in the 12-tab admin header while providing the same live server status, tool listing, and agent-binding information.

**Original:** New "MCP Servers" admin tab with live ping latency
**Delivered:** MCP Bindings tab extended with dynamic tool chips for all 3 servers; MCP Inspector "Connect" tab extended with all 3 servers in dropdown

### Service Count Increase

The original NVA-38 spec targeted 7 Docker services. The final deployment ships 8:

| Service | Port | Note |
|---|---|---|
| nginx | 3010 | Unchanged |
| frontend (React/Vite) | 5210 | Unchanged |
| frontend-spectrum | 5211 | Added in NVA-28 |
| frontend-angular | 4210 | Added in NVA-27 |
| backend (FastAPI) | 8100 | Unchanged |
| amadeus-mcp | 8101 | Unchanged |
| car-rental-mcp | 8102 | **New in NVA-38** |
| hotel-booking-mcp | 8103 | **New in NVA-38** |

### UX Additions Not in Original Spec (Sprint NVA-G Polish)

These features were not in any story spec but were added based on UAT feedback during Sprint NVA-G:

| Feature | Rationale |
|---|---|
| Conversation delete button in sidebar | Users needed a way to delete stale conversations; no prior story covered this |
| Admin Chat History delete + star + notes | ChatHistoryTab had incomplete implementation; all three actions now function correctly |
| Admin panel full-page toggle | Wide-data tabs (MCP Bindings, Chat History) benefit from full-screen real estate |
| Star button in reaction bar (always visible) | Footer star was hidden until hover — discovery failure identified in UAT-08 |
| ⭐ reaction replaced with 🔖 | Avoided ambiguity between reaction counting and turn-level bookmarking |

---

## Product Requirements Updates

### Reaction Bar Specification Update

**Original (implied):** Reaction bar contains 5 emoji buttons: ✈ ⭐ 👍 👎 ❓

**Updated:** Reaction bar contains 6 elements: ☆ (turn star, first pill), ✈, 🔖, 👍, 👎, ❓

Rationale: The ⭐ emoji reaction was visually identical to the starred-turn feature, creating user confusion. Separating them into a dedicated star button and a 🔖 bookmark reaction eliminates the ambiguity.

### Admin Panel Size Specification Update

**Original:** Admin modal fixed at 75vw × 75vh

**Updated:** Admin modal defaults to 75vw × 75vh with a "⊞ Full Page" toggle in the header that expands to 100vw × 100vh. State is in-memory (resets to 75vw on close).

### Star Turn Architecture Update

**Original:** `onStarChange(conversationId, hasStarred)` — 2 arguments

**Updated:** `onStarChange(conversationId, hasStarred, turnIndex)` — 3 arguments

The `turnIndex` addition enables `ChatPage` to update the in-memory `turns` array, ensuring `MessageBubble` components initialise with the correct `starred` state on remount (e.g., after navigating away and returning to a conversation).

---

## Capstone Demo Readiness

All 22 originally scoped NVA stories are complete. The platform is demo-ready:

- **URL:** http://localhost:3010
- **Login:** Any credentials accepted by the seeded user store
- **MCP sidecars:** 3 services auto-start with `docker compose up`
- **Admin access:** Role `admin` — full 12-tab panel including MCP Bindings, Chat History, Eval Metrics, Observability
- **Technical report:** `docs/navanVoyageAI-Technical-Report.html` — print to PDF from browser (A4, IBM Plex Sans)
- **Capstone deck:** `docs/navanVoyageAI-Capstone-Deck.html`
