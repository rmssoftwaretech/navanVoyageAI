# Sprint NVA-G — UAT Results

**Sprint:** NVA-G — UX Polish & MCP Integration Hardening
**Date:** 2026-06-19
**Tester:** Product Owner (manishsg)
**Environment:** Docker Compose — http://localhost:3010
**Browser:** Chrome 149

---

## UAT Scenarios

### UAT-01 — MCP Inspector: Connect to Car Rental and Hotel Booking MCP

**Precondition:** User is logged in. Admin panel → MCP Inspector page is open.

| Step | Action | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | Open MCP Inspector page | Page loads with server dropdown | Page loads | ✅ |
| 2 | Click server dropdown | Shows "Amadeus Travel MCP", "Car Rental MCP", "Hotel Booking MCP" | All 3 options visible | ✅ |
| 3 | Select "Car Rental MCP" → click Connect | Server connects, shows `search_cars`, `book_car`, `cancel_car` tools | Tools listed with schemas | ✅ |
| 4 | Select "Hotel Booking MCP" → click Connect | Server connects, shows `search_hotels`, `book_hotel`, `cancel_hotel` tools | Tools listed | ✅ |

**Result:** ✅ PASS

---

### UAT-02 — Admin Panel: MCP Bindings Tab Shows All 3 Servers

**Precondition:** User is logged in as admin.

| Step | Action | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | Open Admin panel → MCP Bindings tab | Tab loads | Loads | ✅ |
| 2 | Review server list | Shows Amadeus, Car Rental, Hotel Booking with status indicators | All 3 servers visible | ✅ |
| 3 | Check tool chips on each server card | Each card shows tool name chips (e.g. `search_cars`, `book_car`) | Tool chips rendered | ✅ |
| 4 | Review agent cards | Orchestrator, Policy, Destination, Booking agents show bound MCP servers | Agent-server bindings visible | ✅ |

**Result:** ✅ PASS

---

### UAT-03 — Admin Chat History: Delete Conversation

**Precondition:** Admin panel → Chat History tab is open. At least one conversation is visible.

| Step | Action | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | Hover over a conversation row | Red trash 🗑 icon appears on right side of row | Icon appears | ✅ |
| 2 | Move mouse away | Trash icon disappears | Disappears | ✅ |
| 3 | Hover again, click 🗑 | Confirm dialog appears: "Delete this conversation?" | Dialog appears | ✅ |
| 4 | Click Cancel | Row remains | Row remains | ✅ |
| 5 | Click 🗑 again, click OK | Row removed from list | Row removed | ✅ |

**Defect identified (now fixed):** Trash icon was not visible on hover — root cause was Tailwind `group-hover:opacity-100` purged in production Vite build. Fixed with `hoveredId` React state.

**Result:** ✅ PASS

---

### UAT-04 — Admin Chat History: Star and Note on Turn Bubbles

**Precondition:** Admin panel → Chat History tab, expanded conversation thread.

| Step | Action | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | Hover over an AI turn bubble | ☆ (star) and 📝 (note) buttons appear | Buttons visible | ✅ |
| 2 | Click ☆ | Star toggles to ⭐; conversation row shows ⭐ indicator | Star changes; indicator visible | ✅ |
| 3 | Scroll away and scroll back | ⭐ persists (localStorage) | Star persists | ✅ |
| 4 | Click ⭐ | Toggles back to ☆; ⭐ removed from row if no other starred turns | Correct toggle | ✅ |
| 5 | Click 📝 | Inline textarea opens | Editor opens | ✅ |
| 6 | Type a note → click Save | Note saved; "📝 ●" indicator appears on turn | Saved | ✅ |
| 7 | Scroll away and back | Note persists (localStorage) | Note persists | ✅ |
| 8 | Click "📝 ●" → click Delete | Note removed | Removed | ✅ |

**Defect identified (now fixed):** Star and note state was not persisted — old code read but never wrote to localStorage. Fixed in ChatHistoryTab rewrite.

**Result:** ✅ PASS

---

### UAT-05 — Conversation Sidebar: Delete Conversation

**Precondition:** Main chat page, sidebar visible with at least one conversation.

| Step | Action | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | Hover over a conversation row in sidebar | Red 🗑 icon appears at right edge | Icon appears | ✅ |
| 2 | Click 🗑 | Confirm dialog "Delete this conversation?" | Dialog appears | ✅ |
| 3 | Confirm deletion | Row removed; if it was active, chat area clears | Correct | ✅ |

**Defect identified (now fixed):** Delete button was missing entirely — no delete action existed in ConversationSidebar.

**Result:** ✅ PASS

---

### UAT-06 — Conversation Sidebar: Star Filter

**Precondition:** Main chat page, at least one conversation open.

| Step | Action | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | Open a conversation and view messages | Messages visible | Messages visible | ✅ |
| 2 | Locate ☆ star button in reaction bar (first pill) | ☆ always visible in reaction bar | Visible | ✅ |
| 3 | Click ☆ | Button changes to ⭐; conversation row in sidebar shows ⭐ badge | Badge appears | ✅ |
| 4 | Click "Show starred" filter in sidebar | Only starred conversations shown | Filter works | ✅ |
| 5 | Scroll sidebar | ⭐ badge persists on conversation row | Persists | ✅ |
| 6 | Click "Starred only ✕" | Filter removed; all conversations return | Correct | ✅ |

**Defect identified (now fixed):** The ⭐ in the reaction bar was a separate reaction emoji (not the turn star), causing user confusion. Fixed by replacing ⭐ reaction with 🔖 and moving the star button into the reaction bar as the first pill.

**Result:** ✅ PASS

---

### UAT-07 — Admin Panel: Full-Page Toggle

**Precondition:** User logged in as admin.

| Step | Action | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | Open Admin panel | Modal opens at 75vw × 75vh | Opens at 75vw × 75vh | ✅ |
| 2 | Click "⊞ Full Page" button in header | Modal expands to 100vw × 100vh with smooth animation | Expands | ✅ |
| 3 | Click "⊡ Restore" | Modal returns to 75vw × 75vh | Returns | ✅ |
| 4 | Switch tabs in full-page mode | All tabs work normally | No issues | ✅ |

**Result:** ✅ PASS

---

### UAT-08 — Star Button Accessibility (Reaction Bar)

**Precondition:** Main chat with an AI response message visible.

| Step | Action | Expected | Actual | Status |
|---|---|---|---|---|
| 1 | View any AI message | Reaction bar is always visible (not hover-dependent) | Visible | ✅ |
| 2 | Identify ☆ as first button in reaction bar | ☆ appears before ✈ 🔖 👍 👎 ❓ | Correct position | ✅ |
| 3 | Click ☆ without hovering first | Star activates | Activates | ✅ |
| 4 | Verify 🔖 reaction is no longer ⭐ | 🔖 (bookmark) shows — no confusion with star | Correct | ✅ |

**Defect identified (now fixed):** The old ☆ star button was transparent until hover, making it hard to discover and click. Moved into the always-visible reaction bar.

**Result:** ✅ PASS

---

## UAT Summary

| Scenario | Title | Status |
|---|---|---|
| UAT-01 | MCP Inspector: all 3 servers in dropdown | ✅ PASS |
| UAT-02 | MCP Bindings tab: all 3 servers visible | ✅ PASS |
| UAT-03 | Admin Chat History: delete conversation | ✅ PASS |
| UAT-04 | Admin Chat History: star and note | ✅ PASS |
| UAT-05 | Sidebar: delete conversation on hover | ✅ PASS |
| UAT-06 | Sidebar: star filter with persisted state | ✅ PASS |
| UAT-07 | Admin panel: full-page toggle | ✅ PASS |
| UAT-08 | Star button always accessible in reaction bar | ✅ PASS |

**Total: 8 scenarios — 8 PASS, 0 FAIL**

---

## Defects Raised and Resolved

| ID | Description | Severity | Status |
|---|---|---|---|
| BUG-01 | Car Rental + Hotel Booking MCPs show "Error" in Inspector — URL rewrite missing | High | ✅ Fixed |
| BUG-02 | MCP sidecar `logging.basicConfig()` AttributeError crash on startup | High | ✅ Fixed |
| BUG-03 | MCP sidecar `mcp.streamable_http_app()` AttributeError crash on startup | High | ✅ Fixed |
| BUG-04 | Admin Chat History delete icon invisible (Tailwind purge) | Medium | ✅ Fixed |
| BUG-05 | Admin Chat History star state lost on re-render | Medium | ✅ Fixed |
| BUG-06 | Admin Chat History notes not editable | Medium | ✅ Fixed |
| BUG-07 | Sidebar delete button missing entirely | Medium | ✅ Fixed |
| BUG-08 | Star disappears after navigation (turns state stale) | Low | ✅ Fixed |
| BUG-09 | ⭐ reaction emoji confused with turn star action | Low | ✅ Fixed (replaced with 🔖) |
| BUG-10 | Admin panel too small for wide-data tabs | Low | ✅ Fixed (full-page toggle) |

**Sprint closed with 0 open defects.**
