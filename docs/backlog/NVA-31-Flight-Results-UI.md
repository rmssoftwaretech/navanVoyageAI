# NVA-31 — Flight Results UI: Structured Flight Cards

**Epic:** EPIC-NVA
**Points:** 5
**Status:** ✅ Done
**Sprint:** Sprint NVA-G

---

## Goal

When the SearchAgent returns flight results, render them as structured **FlightCard** components inside the chat — not as raw markdown text. Each card shows airline, route, depart/arrive times, duration, stops, and price, with a **Select** button that pre-fills the booking agent.

---

## Current State

The OrchestratorAgent streams the SearchAgent response as plain markdown text. Users read the results but cannot click to select or compare. There is no visual hierarchy to distinguish fare options.

---

## Target Design

```
┌─────────────────────────────────────────────────────────────────┐
│  ✈ Emirates                     EK 201            Economy       │
│  JFK  →  DXB                    09:30 → 07:45+1   14h 15m      │
│  1 stop (Dubai)                                   $842 / pax    │
│                                        [View Details] [Select →] │
├─────────────────────────────────────────────────────────────────┤
│  ✈ British Airways               BA 178            Business      │
│  JFK  →  LHR                    19:00 → 07:15+1    7h 15m       │
│  Non-stop                                        $3,240 / pax   │
│          ✓ Within policy                          [Select →]     │
└─────────────────────────────────────────────────────────────────┘
```

**Policy badge** — if a flight's price is within the company's max fare (from PolicyAgent result), show a green `✓ Within policy` badge. If it exceeds it, show `⚠ Over policy limit`.

---

## How It Works

### Backend

The SearchAgent's JSON output (Amadeus API result) is already structured. Add a `flight_results` SSE event type:

```python
yield sse({"type": "flight_results", "data": [
  {"id": "...", "airline": "Emirates", "flight_number": "EK 201",
   "origin": "JFK", "destination": "DXB",
   "depart": "2026-07-15T09:30", "arrive": "2026-07-16T07:45",
   "duration": "14h15m", "stops": 1, "stop_city": "Dubai",
   "cabin": "Economy", "price": 842, "currency": "USD", "within_policy": true}
]})
```

### Frontend

In `McpInspectorPanel` / `ChatWindow`:
- When a `flight_results` event arrives, store results in state.
- After the assistant turn completes, render `<FlightResultsPanel results={...} />` above the text response.
- **Select →** button calls `onSend("Book flight EK201 on 2026-07-15 from JFK to DXB, Economy, $842")` — hands off to BookingAgent.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `frontend/src/components/Chat/FlightCard.tsx` | New — single flight result card |
| `frontend/src/components/Chat/FlightResultsPanel.tsx` | New — card list, sort by price/duration toggle |
| `frontend/src/components/Chat/ChatWindow.tsx` | Render FlightResultsPanel when `flightResults` state is set |
| `frontend/src/pages/ChatPage.tsx` | Capture `flight_results` event; set `flightResults` state |
| `frontend/src/types/nva.ts` | Add `FlightResult` interface, `flight_results` event type |
| `backend/application/agent/search_agent.py` | Emit `flight_results` SSE event with parsed Amadeus data |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | Travel search query triggers `flight_results` SSE event with ≥1 result |
| 2 | FlightCards render in chat showing airline, route, times, duration, stops, price |
| 3 | Policy badge shows correctly (green = within policy, amber = over limit) |
| 4 | Cards can be sorted by Price (asc) or Duration (asc) via toggle |
| 5 | Clicking Select → fires a booking pre-fill message to the agent |
| 6 | If no results, assistant message says so with a "Modify Search" button |

---

## Out of Scope

- Seat map or seat selection UI (see NVA-32)
- Multi-city itinerary display
- Fare rules / baggage allowance expansion
