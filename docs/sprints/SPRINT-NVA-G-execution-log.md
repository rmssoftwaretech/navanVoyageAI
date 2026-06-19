# Sprint NVA-G — Execution Log

**Sprint:** NVA-G — UX Polish & MCP Integration Hardening
**Date:** 2026-06-19
**Status:** ✅ Closed
**Engineer:** manishsg
**Branch:** main

---

## Sprint Goal

Harden the three-sidecar MCP integration introduced in NVA-38, resolve all UX defects discovered during user acceptance testing, add admin panel quality-of-life improvements, and ship the 30-page capstone technical report and presentation deck.

---

## Work Completed

### 1 — MCP Sidecar Integration Fixes

| Fix | File(s) | Root Cause |
|---|---|---|
| `logging.basicConfig()` called on Logger object | `car-rental-mcp/server.py`, `hotel-booking-mcp/server.py` | `log = logging.getLogger(...)` creates a Logger, not the module; call `logging.basicConfig()` at module level |
| `mcp.streamable_http_app()` AttributeError | same | FastMCP 3.4.2 exposes `mcp.http_app()` — `streamable_http_app` does not exist in this version |
| Backend proxy couldn't reach new sidecars | `backend/api/routers/mcp.py` | `_URL_REWRITES` only mapped port 8101; added rewrites for ports 8102 and 8103 |
| Car Rental + Hotel Booking missing from MCP Inspector dropdown | `frontend/src/types/mcpInspector.ts` | Added both servers to `PRESET_SERVERS` |
| Agents not bound to new MCP servers | `config/agents.json` | Added `car_rental` + `hotel_booking` to `orchestrator`, `policy`, `destination`, `booking` agent configs |
| McpBindingsTab showed only Amadeus static data badges | `frontend/src/components/admin/McpBindingsTab.tsx` | Replaced hard-coded static badges with dynamic tool chips from `server.tools`; added `book_car`, `cancel_car`, `book_hotel`, `cancel_hotel` to TOOL_COLORS/TOOL_ICONS |

### 2 — Admin Chat History Tab (Full Rewrite)

The existing ChatHistoryTab had three UX failures identified in UAT:

| Defect | Root Cause | Fix |
|---|---|---|
| Delete icon not visible on hover | Tailwind `group-hover:opacity-100` purged by Vite production build | Replaced with `hoveredId` React state + inline `opacity` style |
| Starred turns disappeared on re-render | `TurnBubble` read `turn.starred` from backend only; no UI to star | Added star toggle button (☆ / ⭐) with localStorage persistence (`nva_star_{conversationId}_{turnIndex}`) |
| Notes not editable | localStorage reading present but no write UI | Added inline textarea editor with Save / Delete / Cancel per turn bubble |

All styling uses inline React styles — no Tailwind group-hover classes that survive production purge.

### 3 — Conversation Sidebar Improvements

| Feature | File | Details |
|---|---|---|
| Delete button on hover | `ConversationSidebar.tsx` | `hoveredId` state; red 🗑 button at `position: absolute, right: 6` appears on hover; calls `window.confirm()` then `deleteAdminConversation()` |
| Delete handler in ChatPage | `ChatPage.tsx` | `handleDeleteConversation(id)` removes from `conversations` state; clears active conversation if deleted |
| Delete prop threading | `AppLayout.tsx` | Added `onDeleteConversation` prop → passed to `ConversationSidebar.onDelete` |
| Star persistence after scroll | `ChatPage.tsx` | `handleStarChange` now also updates `turns[turnIndex].starred` so MessageBubble re-initialises with correct state if remounted |
| `onStarChange` signature extended | `MessageBubble.tsx`, `ChatWindow.tsx`, `ChatPage.tsx` | Added `turnIndex: number` as third argument to enable turns-state update |

### 4 — Admin Panel Full-Page Toggle

Added `fullPage` state (`useState(false)`) to `AdminPanel.tsx`. Button "⊞ Full Page" / "⊡ Restore" in the header toolbar switches the modal between `75vw × 75vh` and `100vw × 100vh` with a 200 ms CSS transition.

### 5 — Star Button UX (Reaction Bar Integration)

| Change | File | Rationale |
|---|---|---|
| Star button moved into `ReactionBar` | `ReactionBar.tsx`, `MessageBubble.tsx` | Footer star required hover precision; reaction bar is always visible and easier to target |
| `ReactionBar` accepts `starred` + `onStar` props | `ReactionBar.tsx` | Star renders as first pill (☆ / ⭐) before emoji reactions |
| Old footer star button removed | `MessageBubble.tsx` | Eliminated duplicate star entry point |
| ⭐ reaction replaced with 🔖 | `ReactionBar.tsx` | Avoided confusion between reaction emoji and turn-level star bookmark |
| Reaction bar always visible | `MessageBubble.tsx` | Removed `{hovered && <ReactionBar />}` gate; now renders unconditionally |

### 6 — Capstone Documents

| Document | Path | Description |
|---|---|---|
| Technical Report | `docs/navanVoyageAI-Technical-Report.html` | 30-page printable HTML report; 17 sections covering architecture, agents, MCP, memory, policy, admin, eval, REST API (41 endpoints), infrastructure; IBM Plex Sans, navy/gold brand, A4 `@page` CSS |
| Presentation Deck | `docs/navanVoyageAI-Capstone-Deck.html` | HTML slide deck for CMU Capstone Demo |

---

## Docker Service Status at Sprint Close

| Service | Port | Status |
|---|---|---|
| nginx (main app) | 3010 | ✅ Up |
| frontend (React) | 5210 | ✅ Up |
| frontend-spectrum | 5211 | ✅ Up |
| frontend-angular | 4210 | ✅ Up |
| backend (FastAPI) | 8100 | ✅ Up |
| amadeus-mcp | 8101 | ✅ Up |
| car-rental-mcp | 8102 | ✅ Up |
| hotel-booking-mcp | 8103 | ✅ Up |

---

## Files Changed

| File | Change Type |
|---|---|
| `backend/api/routers/admin.py` | Modified — added `DELETE /admin/conversations/{id}` |
| `backend/api/routers/mcp.py` | Modified — URL rewrites for ports 8102 + 8103 |
| `car-rental-mcp/server.py` | Fixed — `logging.basicConfig()` + `mcp.http_app()` |
| `config/agents.json` | Modified — MCP server arrays per agent |
| `frontend/src/components/AppLayout.tsx` | Modified — `onDeleteConversation` prop |
| `frontend/src/components/Chat/ChatWindow.tsx` | Modified — extended `onStarChange` signature |
| `frontend/src/components/Chat/MessageBubble.tsx` | Modified — star moved to ReactionBar; extended `onStarChange` |
| `frontend/src/components/Chat/ReactionBar.tsx` | Modified — star button added; ⭐ → 🔖; always visible |
| `frontend/src/components/ConversationSidebar.tsx` | Modified — `hoveredId` state; delete button; `onDelete` prop |
| `frontend/src/components/admin/AdminPanel.tsx` | Modified — full-page toggle |
| `frontend/src/components/admin/ChatHistoryTab.tsx` | Rewritten — delete, star, notes |
| `frontend/src/components/admin/McpBindingsTab.tsx` | Modified — dynamic tool chips |
| `frontend/src/pages/ChatPage.tsx` | Modified — `handleDeleteConversation`; extended `handleStarChange` |
| `frontend/src/services/admin.ts` | Modified — `deleteAdminConversation()` |
| `frontend/src/types/mcpInspector.ts` | Modified — Car Rental + Hotel Booking in `PRESET_SERVERS` |
| `hotel-booking-mcp/server.py` | Fixed — `logging.basicConfig()` + `mcp.http_app()` |
| `docs/navanVoyageAI-Technical-Report.html` | New — 30-page printable report |
| `docs/navanVoyageAI-Capstone-Deck.html` | New — capstone presentation deck |

---

## Known Limitations

- `has_starred` on Conversation object is not set to `false` when all turns are unstarred (backend does not recompute); the ⭐ badge persists on the sidebar row until a page refresh. Acceptable for demo scope.
- Admin Chat History delete calls the `DELETE /admin/conversations/{id}` endpoint which requires admin JWT; non-admin users cannot delete from the main sidebar (they use the sidebar delete which calls the same endpoint via dynamic import — access controlled at API layer).
