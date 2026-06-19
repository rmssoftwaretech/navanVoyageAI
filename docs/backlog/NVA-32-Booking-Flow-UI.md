# NVA-32 — Booking Flow UI: Step-by-Step Booking Wizard

**Epic:** EPIC-NVA
**Points:** 8
**Status:** ✅ Done
**Sprint:** Sprint NVA-H

---

## Goal

Replace the text-based booking confirmation flow with a structured **3-step booking wizard** that opens as a modal when the user clicks **Select →** on a FlightCard. The wizard collects passenger details, seat preference, and shows a final confirmation screen with the generated `NVA-YYYY-NNNNN` booking reference.

---

## Current State

The BookingAgent creates a booking and returns a markdown confirmation. There is no structured form — all details (name, passport, seat) must be free-typed by the user, which is error-prone and slow.

---

## Target Design

### Step 1 — Passenger Details

```
┌──────────────────────────────────────────────────────────────┐
│  Book: EK201  JFK → DXB   15 Jul 2026   Economy   $842      │
│  ─────────────────────────────────────────────────────────── │
│  Step 1 of 3: Passenger Details               [1]──[2]──[3] │
│                                                              │
│  First Name *         Last Name *                            │
│  [               ]   [               ]                       │
│                                                              │
│  Date of Birth *      Passport Number *                      │
│  [  YYYY-MM-DD  ]   [               ]                        │
│                                                              │
│  Nationality          Passport Expiry                        │
│  [               ]   [  YYYY-MM-DD  ]                        │
│                                                              │
│  Contact Email *                                             │
│  [                           ]                               │
│                                          [Cancel]  [Next →]  │
└──────────────────────────────────────────────────────────────┘
```

### Step 2 — Seat Preference

```
│  Step 2 of 3: Seat Preference                [1]──[2]──[3]  │
│                                                              │
│  Seat Location        Meal Preference                        │
│  ○ Window             ○ Standard                             │
│  ● Aisle              ○ Vegetarian                           │
│  ○ No preference      ○ Halal  ○ Kosher                      │
│                                                              │
│  Special Assistance  (optional)                              │
│  [                                        ]                  │
│                                    [← Back]  [Review →]      │
```

### Step 3 — Review & Confirm

```
│  Step 3 of 3: Review & Confirm               [1]──[2]──[3]  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Flight   EK201  JFK → DXB   15 Jul 2026   Economy  │   │
│  │  Pax      Jane Smith  (Passport: AB1234567)          │   │
│  │  Seat     Aisle  |  Meal: Vegetarian                 │   │
│  │  Total    $842.00 USD                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ☐ I confirm this booking complies with travel policy        │
│                               [← Back]  [Confirm Booking]    │
```

### Confirmation Screen

```
│  ✓ Booking Confirmed                                         │
│                                                              │
│  Reference    NVA-2026-00042                                 │
│  Flight       EK201  JFK → DXB  15 Jul 2026                 │
│  Passenger    Jane Smith                                      │
│  Seat         Aisle  |  Economy                              │
│  Total        $842.00 USD                                    │
│                                                              │
│              [Download Itinerary]    [Close]                  │
```

---

## Backend Requirements

| Endpoint | Detail |
|---|---|
| `POST /api/chat/bookings` | Accepts structured booking payload; calls BookingAgent; returns `{booking_id, reference, status}` |
| `GET /api/chat/bookings/{id}` | Returns booking detail for confirmation screen |

Booking payload:
```json
{
  "flight_id": "EK201-2026-07-15",
  "passenger": { "first_name": "Jane", "last_name": "Smith", "dob": "1990-05-20",
                  "passport_number": "AB1234567", "nationality": "US", "passport_expiry": "2030-05-20",
                  "email": "jane@acme.com" },
  "seat_preference": "aisle",
  "meal_preference": "vegetarian",
  "special_assistance": ""
}
```

---

## Files to Create / Modify

| File | Action |
|---|---|
| `frontend/src/components/Booking/BookingWizard.tsx` | New — 3-step modal wizard with stepper header |
| `frontend/src/components/Booking/PassengerForm.tsx` | New — Step 1 form with validation |
| `frontend/src/components/Booking/SeatPreferenceStep.tsx` | New — Step 2 radio group selections |
| `frontend/src/components/Booking/BookingReview.tsx` | New — Step 3 summary + policy checkbox |
| `frontend/src/components/Booking/BookingConfirmation.tsx` | New — success screen + itinerary download |
| `frontend/src/pages/ChatPage.tsx` | Open BookingWizard when `FlightCard` Select → is clicked |
| `frontend/src/services/bookings.ts` | New — `createBooking()`, `getBooking()` |
| `backend/api/routers/chat.py` | Add `/bookings` POST + GET endpoints |

---

## Acceptance Criteria

| # | Check |
|---|---|
| 1 | Select → on a FlightCard opens the BookingWizard modal |
| 2 | Step 1 validates required fields before allowing Next |
| 3 | Step 2 seat/meal radio buttons are mutually exclusive within each group |
| 4 | Step 3 shows a complete summary and requires policy checkbox before Confirm |
| 5 | Confirm fires `POST /api/chat/bookings`; success shows reference `NVA-YYYY-NNNNN` |
| 6 | Download Itinerary exports a PDF / printable HTML with booking details |
| 7 | Booking reference is also echoed as a message turn in the chat thread |
| 8 | Cancel at any step closes wizard without creating a booking |

---

## Out of Scope

- Payment processing (mock only — no real card integration)
- Seat map visualisation
- Group / multi-passenger bookings
