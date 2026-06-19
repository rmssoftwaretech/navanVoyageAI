# NVA-29 — Travel Search Form: Structured Trip Entry UI

**Epic:** EPIC-NVA
**Points:** 2
**Status:** ✅ Done
**Sprint:** Sprint NVA-F

---

## Goal

Replace the plain empty-state placeholder in the chat window with a structured **Travel Search Form** that guides users to enter their trip details (origin, destination, travel dates, travelers, cabin class) before the first message. On submit, the form composes a natural-language query and sends it to the agent — no manual typing required.

---

## Problem

The previous empty state was a static message: *"How can I help plan your trip? Ask me to search flights, check policies, or book travel."* Users had to know the right format and parameters to include in their free-text message. The Amadeus MCP tool requires origin, destination, and date to fire — incomplete inputs would not trigger a flight search.

---

## Solution

A card-style form rendered centred in the chat area whenever `turns.length === 0`. The form captures:

| Field | Input | Notes |
|---|---|---|
| From | Text input | City or IATA airport code |
| To | Text input | City or IATA airport code |
| Depart | `<input type="date">` | Native calendar picker; defaults to today + 7 days |
| Return | `<input type="date">` | Defaults to depart + 7 days; disabled when One-way is checked |
| One-way | Checkbox | Disables return date field |
| Travelers | Number input (1–9) | Defaults to 1 |
| Cabin Class | Dropdown | Economy / Premium Economy / Business / First |

On **Search Flights →** click, the form assembles:
```
Search flights from {from} to {to}, departing {depart}, [round trip, returning {return}|one-way], {N} traveler(s), {Cabin} class.
```
This string is passed directly to `onSend()` — identical to the user typing it. The Orchestrator routes it to SearchAgent which calls the Amadeus MCP tool.

The InputBar remains below the form for free-text fallback.

---

## Files Changed

| File | Action |
|---|---|
| `frontend/src/components/Chat/TravelSearchForm.tsx` | **New** — form component |
| `frontend/src/components/Chat/ChatWindow.tsx` | **Modified** — render TravelSearchForm in empty state instead of static text |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | New conversation shows the travel search form centred in the chat area |
| 2 | From and To are required; submitting without them shows an inline error |
| 3 | Return date auto-advances if departure is changed past it |
| 4 | One-way checkbox disables and grays out the return date input |
| 5 | Clicking Search Flights → sends the assembled message and transitions to chat mode |
| 6 | The InputBar remains accessible below the form for free-text input |
| 7 | Form is hidden once the first message turn exists |

---

## Out of Scope

- Airport autocomplete / IATA code lookup
- Multi-city itineraries
- Seat selection or ancillary preferences
