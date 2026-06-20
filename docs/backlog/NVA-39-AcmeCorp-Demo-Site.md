# NVA-39 — Acme Corp Demo Site: Corporate Portal with navanVoyageAI Travel Assistant Panel

**Epic:** EPIC-NVA
**Points:** 13
**Status:** ⬜ Groomed
**Sprint:** NVA-H
**Depends on:** NVA-38 (Car Rental + Hotel MCPs), NVA-01 (App shell + auth), NVA-11 (PolicyAgent), NVA-13 (BookingAgent)

---

## Goal

Build a standalone **Acme Corp** corporate portal — a React + Tailwind CSS website that embeds navanVoyageAI as a collapsible **Travel Assistant** side panel. The demo features three real employee personas with different travel policies, personalised sample prompts on login, and end-to-end booking scenarios (flight + hotel + car) specific to each employee's trip context. This gives the CMU Capstone demo a polished, industry-realistic frame: navanVoyageAI is no longer a standalone travel app but an AI capability embedded inside an enterprise portal.

---

## Current State

| Area | Problem |
|---|---|
| Demo context | navanVoyageAI runs as a standalone app — no enterprise host to embed it in |
| User personas | Only generic login exists; no pre-seeded employees with distinct travel policies |
| Contextual prompts | The empty-state travel form (NVA-29) is generic — no awareness of who is travelling or why |
| Booking scenarios | Booking flow is functional but requires the user to know what to type |

---

## Acme Corp Brand

Acme Corp is a mid-size B2B SaaS company headquartered in San Francisco. Design language:

| Token | Value |
|---|---|
| Primary | `#1A56DB` (Acme blue) |
| Secondary | `#111827` (slate-900) |
| Accent | `#F59E0B` (amber-500 — highlights, CTAs) |
| Background | `#F9FAFB` (gray-50) |
| Font | Inter (Google Fonts CDN) |
| Border radius | `rounded-lg` (8 px) |
| Shadow | `shadow-sm` |

Logo: `⬡ Acme Corp` — hexagon icon in Acme blue, wordmark in slate-900, tagline "Powering the future of business".

---

## Users & Policies

Three employees are seeded in `navanVoyageAI/backend/db/seed.py` and in the Acme Corp login selector. All are based in **San Francisco (SFO)**.

### Steve M — Executive President
| Field | Value |
|---|---|
| Username | `steve.m` |
| Password | `acme2026` |
| Role | Executive President |
| Travel Policy | **Executive Policy** |
| Department | C-Suite |
| Trip | Internal office visit — Bengaluru, India (BLR) |
| Booking scope | Flight + Hotel + Car |

**Executive Policy rules:**
- Flights: Business class or First class only; no economy
- Hotels: 5-star only; nightly cap $600 USD
- Car rental: Full-size or Luxury class; no restrictions on agency
- Advance notice: No minimum booking window
- Approval required: No — auto-approved up to $20,000 per trip

### Rick M — Sales Executive
| Field | Value |
|---|---|
| Username | `rick.m` |
| Password | `acme2026` |
| Role | Sales Executive |
| Travel Policy | **Sales Policy** |
| Department | Sales |
| Trip | Customer visit — Zava Corp, New York, NY (JFK) |
| Booking scope | Flight + Hotel + Car |

**Sales Policy rules:**
- Flights: Business class on international; Economy or Business on domestic
- Hotels: 4-star or below; nightly cap $350 USD
- Car rental: Mid-size or Full-size; major agencies only (Hertz, Avis, Enterprise, National)
- Advance notice: 48 hours minimum
- Approval required: No — auto-approved up to $5,000 per trip; manager approval above

### Nicholas J — Conference Traveller
| Field | Value |
|---|---|
| Username | `nicholas.j` |
| Password | `acme2026` |
| Role | Engineer / Conference Attendee |
| Travel Policy | **Conference Policy** |
| Department | Engineering |
| Trip | AWS Summit 2026 — Chicago, IL (ORD) |
| Booking scope | Flight + Hotel only (no car rental) |

**Conference Policy rules:**
- Flights: Economy class only; no upgrades
- Hotels: Conference-block hotel or 3-star equivalent; nightly cap $220 USD; must be within 1 mile of venue
- Car rental: Not covered — use rideshare or public transit
- Advance notice: 7 days minimum
- Approval required: Yes — Engineering VP approval for any conference travel

---

## Acme Corp Portal — Page Structure

```
/                    → Home (corporate dashboard)
/travel              → Travel Hub (main page with embedded Travel Assistant panel)
/profile             → Employee profile (read-only; shows travel policy)
/login               → Login selector (3 persona cards)
```

The portal is a **single-page Vite + React app** using **Tailwind CSS** (CDN or via `npm`). It lives at:

```
navanVoyageAI/frontend-acme/
```

Served on **port 5212** in dev; Docker container `acme-corp-ui`; nginx location block `/acme/`.

---

## Login Page — Persona Selector

Rather than a free-text username/password form, the Acme Corp login shows three **Employee Cards** the demo operator can click to instantly log in as that persona:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⬡ Acme Corp                                                  [Sign in →]  │
│                                                                             │
│  Select your profile to continue                                            │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │  👤              │  │  👤              │  │  👤              │         │
│  │  Steve M         │  │  Rick M          │  │  Nicholas J      │         │
│  │  Executive       │  │  Sales           │  │  Conference      │         │
│  │  President       │  │  Executive       │  │  Traveller       │         │
│  │                  │  │                  │  │                  │         │
│  │  ✈ Bengaluru     │  │  ✈ New York      │  │  ✈ Chicago       │         │
│  │  Office visit    │  │  Zava Corp visit │  │  AWS Summit 2026 │         │
│  │                  │  │                  │  │                  │         │
│  │  [Select →]      │  │  [Select →]      │  │  [Select →]      │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

Clicking **[Select →]** authenticates the user against navanVoyageAI's backend (`POST /api/auth/login` with the seeded credentials) and stores the JWT in `acme_nva_token` localStorage key. Redirect to `/travel`.

---

## Travel Hub Page — Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⬡ Acme Corp   Home   Travel   Profile            👤 Steve M  [Sign out]        │
├───────────────────────────────────────────┬──────────────────────────────────────┤
│                                           │   ✈ Travel Assistant          [×]   │
│  My Upcoming Trips                        │  ─────────────────────────────────  │
│  ┌─────────────────────────────────────┐  │  [navanVoyageAI chat window]        │
│  │  ✈ Bengaluru, India   Jul 14–21     │  │                                     │
│  │  BLR Office Visit                   │  │  [Sample prompt chips]              │
│  │  Status: Not booked    [Book now]   │  │                                     │
│  └─────────────────────────────────────┘  │  [Input bar]                        │
│                                           │                                     │
│  Company Travel Policy                    │                                     │
│  ┌─────────────────────────────────────┐  │                                     │
│  │  🟢 Executive Policy               │  │                                     │
│  │  Business/First class flights       │  │                                     │
│  │  5-star hotels · $600/night cap     │  │                                     │
│  │  Full-size/Luxury car rental        │  │                                     │
│  │  Auto-approved up to $20,000        │  │                                     │
│  └─────────────────────────────────────┘  │                                     │
│                                           │                                     │
└───────────────────────────────────────────┴──────────────────────────────────────┘
```

The right panel is an `<iframe>` pointing to `http://localhost:3010` (the navanVoyageAI app), pre-seeded with the active user's JWT. Panel width: 420 px fixed; collapsible via `[×]` to a `[✈ Assistant]` floating tab on the right edge.

---

## Sample Prompts Per Persona

Shown as **clickable chips** in the navanVoyageAI chat panel immediately after login (when `turns.length === 0`). Chips replace the generic TravelSearchForm for Acme Corp sessions (detected via `?source=acme` query param on the iframe URL).

### Steve M — Executive President — Bengaluru Office Visit

```
💼 "Book a business class flight from San Francisco to Bengaluru for my office visit, July 14–21"
🏨 "Find a 5-star hotel in Bengaluru near the Electronic City tech park for July 14–21"
🚗 "Reserve a luxury car rental in Bengaluru for the duration of my stay"
📋 "What is my Executive travel policy for international trips?"
✈ "Show me flight options SFO → BLR in business class, departing July 14"
📊 "Book the complete trip to Bengaluru — flight, hotel, and car — within my Executive policy"
```

### Rick M — Sales Executive — Zava Corp Visit, New York

```
✈ "Find business class flights from San Francisco to New York JFK for August 4–7"
🏨 "Book a 4-star hotel near Midtown Manhattan for August 4–7, under $350/night"
🚗 "Reserve a full-size rental car at JFK for my Zava Corp customer visit"
📋 "What does my Sales travel policy cover for domestic trips?"
🤝 "I'm visiting Zava Corp in New York — book flight, hotel and car for August 4–7"
💰 "What's the total estimated cost of my New York trip within my Sales policy?"
```

### Nicholas J — Conference Traveller — AWS Summit Chicago

```
✈ "Find economy flights from San Francisco to Chicago for AWS Summit, September 9–12"
🏨 "Book the AWS Summit conference hotel block in Chicago for September 9–12"
📋 "Does my Conference policy cover AWS Summit attendance?"
🎟 "I'm attending AWS Summit Chicago — book my flight and hotel for September 9–12"
🔎 "Show me economy flights SFO → ORD departing September 9"
📝 "What approvals do I need for conference travel?"
```

Chips are rendered as `<button>` elements in the navanVoyageAI `TravelSearchForm` / empty-state area, styled with the Acme blue accent when `source=acme` is detected.

---

## Booking Scenarios

### Scenario A — Steve M: Bengaluru Office Trip (SFO → BLR)

Full booking flow for **Flight + Hotel + Car**. All three confirmations should appear in the chat.

| Step | Agent | Action |
|---|---|---|
| 1 | OrchestratorAgent | Routes to SearchAgent for flights |
| 2 | SearchAgent | Calls Amadeus MCP `search_flights(SFO, BLR, 2026-07-14)` — returns business class options |
| 3 | PolicyAgent | Verifies business/first class ✅; no cap restriction for Steve |
| 4 | BookingAgent | Calls Amadeus MCP `book_flight` → confirmation `NVA-2026-00042` |
| 5 | OrchestratorAgent | Routes to SearchAgent for hotel |
| 6 | SearchAgent | Calls Hotel MCP `search_hotels(BLR, 2026-07-14, 2026-07-21, tier=5-star)` — returns Marriott, ITC, Taj Vivanta |
| 7 | PolicyAgent | Verifies 5-star ✅; nightly rate under $600 ✅ |
| 8 | BookingAgent | Calls Hotel MCP `book_hotel` → confirmation `HB-20260714-S001` |
| 9 | OrchestratorAgent | Routes to SearchAgent for car |
| 10 | SearchAgent | Calls Car Rental MCP `search_cars(BLR, 2026-07-14, 2026-07-21, class=Luxury)` |
| 11 | PolicyAgent | Verifies Luxury class ✅ |
| 12 | BookingAgent | Calls Car Rental MCP `book_car` → confirmation `CR-20260714-S001` |
| 13 | OrchestratorAgent | Delivers summary with all 3 confirmations and total cost |

**Expected final response:**
```
✅ Your Bengaluru trip is fully booked:

✈ Flight: SFO → BLR, Business Class — Singapore Airlines SQ 31
   Depart Jul 14 · Return Jul 21 · Confirmation: NVA-2026-00042

🏨 Hotel: ITC Gardenia Bengaluru (5★) · 7 nights · $485/night
   Jul 14–21 · Confirmation: HB-20260714-S001

🚗 Car: Mercedes E-Class (Luxury) · Hertz · 7 days · $185/day
   Pickup/Drop BLR Airport · Confirmation: CR-20260714-S001

💰 Total: $8,710 USD — within your Executive Policy ($20,000 limit)
```

---

### Scenario B — Rick M: Zava Corp Visit, New York (SFO → JFK)

Full booking flow for **Flight + Hotel + Car**.

| Step | Agent | Action |
|---|---|---|
| 1 | OrchestratorAgent | Routes to SearchAgent for flights |
| 2 | SearchAgent | Calls Amadeus MCP `search_flights(SFO, JFK, 2026-08-04)` — domestic, business or economy |
| 3 | PolicyAgent | Domestic trip — economy or business both allowed; selects economy to optimise cost |
| 4 | BookingAgent | Confirms flight → `NVA-2026-00051` |
| 5 | SearchAgent | Calls Hotel MCP `search_hotels(JFK, 2026-08-04, 2026-08-07, tier=4-star)` — Midtown options |
| 6 | PolicyAgent | Verifies 4-star ✅; rate under $350 ✅ |
| 7 | BookingAgent | Confirms hotel → `HB-20260804-R001` |
| 8 | SearchAgent | Calls Car Rental MCP `search_cars(JFK, 2026-08-04, 2026-08-07, class=Mid-size)` |
| 9 | PolicyAgent | Verifies Mid-size ✅; major agency ✅ |
| 10 | BookingAgent | Confirms car → `CR-20260804-R001` |
| 11 | OrchestratorAgent | Summary with 3 confirmations; flags within Sales Policy |

**Expected final response:**
```
✅ Your New York trip for Zava Corp is booked:

✈ Flight: SFO → JFK, Economy — United Airlines UA 192
   Depart Aug 4 · Return Aug 7 · Confirmation: NVA-2026-00051

🏨 Hotel: Marriott Marquis Times Square (4★) · 3 nights · $329/night
   Aug 4–7 · Confirmation: HB-20260804-R001

🚗 Car: Toyota Camry (Mid-size) · Hertz · 3 days · $87/day
   Pickup/Drop JFK Airport · Confirmation: CR-20260804-R001

💰 Total: $1,516 USD — within your Sales Policy ($5,000 limit)
```

---

### Scenario C — Nicholas J: AWS Summit Chicago (SFO → ORD)

Booking flow for **Flight + Hotel only** (no car rental per Conference Policy).

| Step | Agent | Action |
|---|---|---|
| 1 | OrchestratorAgent | Routes to SearchAgent for flights |
| 2 | SearchAgent | Calls Amadeus MCP `search_flights(SFO, ORD, 2026-09-09)` — economy only |
| 3 | PolicyAgent | Verifies economy ✅; flags approval required — Engineering VP |
| 4 | BookingAgent | Confirms flight → `NVA-2026-00067` (pending approval badge) |
| 5 | SearchAgent | Calls Hotel MCP `search_hotels(ORD, 2026-09-09, 2026-09-12, tier=3-star)` — near McCormick Place |
| 6 | PolicyAgent | Verifies 3-star ✅; rate under $220 ✅ |
| 7 | BookingAgent | Confirms hotel → `HB-20260909-N001` |
| 8 | OrchestratorAgent | Summary with 2 confirmations; approval reminder; no car (policy) |

**Expected final response:**
```
✅ Your AWS Summit Chicago trip is booked:

✈ Flight: SFO → ORD, Economy — American Airlines AA 381
   Depart Sep 9 · Return Sep 12 · Confirmation: NVA-2026-00067
   ⚠️ Pending Engineering VP approval (Conference Policy requirement)

🏨 Hotel: Hyatt Regency Chicago (3★) · 3 nights · $198/night
   Sep 9–12 · Confirmation: HB-20260909-N001

🚫 Car Rental: Not covered under Conference Policy — use rideshare or CTA

💰 Total: $1,183 USD (pending approval)
   ℹ️ Approval request sent to Engineering VP
```

---

## Files to Create / Modify

| File | Action |
|---|---|
| `frontend-acme/` | **New** — standalone Vite + React + Tailwind app |
| `frontend-acme/src/pages/LoginPage.tsx` | New — 3-persona card selector |
| `frontend-acme/src/pages/HomePage.tsx` | New — corporate dashboard landing |
| `frontend-acme/src/pages/TravelHubPage.tsx` | New — trip card + policy card + travel assistant panel |
| `frontend-acme/src/pages/ProfilePage.tsx` | New — employee profile + policy details |
| `frontend-acme/src/components/TravelAssistantPanel.tsx` | New — navanVoyageAI iframe wrapper with collapse/expand |
| `frontend-acme/src/components/TripCard.tsx` | New — upcoming trip with status + "Book now" CTA |
| `frontend-acme/src/components/PolicyCard.tsx` | New — read-only policy summary |
| `frontend-acme/src/components/Navbar.tsx` | New — Acme Corp nav with user badge |
| `frontend-acme/src/data/personas.ts` | New — Steve, Rick, Nicholas persona definitions + prompts |
| `frontend-acme/src/services/auth.ts` | New — login against navanVoyageAI `/api/auth/login` |
| `frontend-acme/index.html` | New |
| `frontend-acme/package.json` | New — Vite + React + Tailwind |
| `frontend-acme/tailwind.config.js` | New — Acme Corp theme tokens |
| `frontend-acme/vite.config.ts` | New — port 5212, proxy `/api/` → `http://localhost:8100` |
| `infrastructure/docker/Dockerfile.acme-corp` | New |
| `infrastructure/docker/docker-compose.yml` | Modified — add `acme-corp-ui` service on port 5212 |
| `infrastructure/nginx/proxy.conf` | Modified — add `/acme/` location block |
| `backend/db/seed.py` | Modified — add Steve M, Rick M, Nicholas J users; add Executive/Sales/Conference policies |

---

## Seed Data

### Users (`nva_db.users` collection)

```python
ACME_USERS = [
    {
        "username": "steve.m",
        "password_hash": hash("acme2026"),
        "display_name": "Steve M",
        "role": "Executive President",
        "department": "C-Suite",
        "policy": "executive",
        "base_airport": "SFO",
        "trip_context": {
            "destination": "Bengaluru, India",
            "iata": "BLR",
            "purpose": "Internal office visit",
            "depart": "2026-07-14",
            "return": "2026-07-21",
            "scope": ["flight", "hotel", "car"]
        }
    },
    {
        "username": "rick.m",
        "password_hash": hash("acme2026"),
        "display_name": "Rick M",
        "role": "Sales Executive",
        "department": "Sales",
        "policy": "sales",
        "base_airport": "SFO",
        "trip_context": {
            "destination": "New York, NY",
            "iata": "JFK",
            "purpose": "Customer visit — Zava Corp",
            "depart": "2026-08-04",
            "return": "2026-08-07",
            "scope": ["flight", "hotel", "car"]
        }
    },
    {
        "username": "nicholas.j",
        "password_hash": hash("acme2026"),
        "display_name": "Nicholas J",
        "role": "Engineer",
        "department": "Engineering",
        "policy": "conference",
        "base_airport": "SFO",
        "trip_context": {
            "destination": "Chicago, IL",
            "iata": "ORD",
            "purpose": "AWS Summit 2026",
            "depart": "2026-09-09",
            "return": "2026-09-12",
            "scope": ["flight", "hotel"]
        }
    }
]
```

### Policies (`nva_db.nva_policies` collection)

```python
ACME_POLICIES = [
    {
        "id": "executive",
        "name": "Executive Policy",
        "flight_class": ["business", "first"],
        "hotel_stars_min": 5,
        "hotel_nightly_cap_usd": 600,
        "car_classes": ["Full-size", "Luxury"],
        "car_agencies": None,        # any agency
        "advance_notice_days": 0,
        "approval_required": False,
        "per_trip_cap_usd": 20000,
        "car_rental_covered": True
    },
    {
        "id": "sales",
        "name": "Sales Policy",
        "flight_class": ["economy", "business"],
        "hotel_stars_min": 1,
        "hotel_stars_max": 4,
        "hotel_nightly_cap_usd": 350,
        "car_classes": ["Mid-size", "Full-size"],
        "car_agencies": ["Hertz", "Avis", "Enterprise", "National"],
        "advance_notice_days": 2,
        "approval_required": False,
        "per_trip_cap_usd": 5000,
        "car_rental_covered": True
    },
    {
        "id": "conference",
        "name": "Conference Policy",
        "flight_class": ["economy"],
        "hotel_stars_min": 1,
        "hotel_stars_max": 3,
        "hotel_nightly_cap_usd": 220,
        "car_classes": [],
        "car_agencies": [],
        "advance_notice_days": 7,
        "approval_required": True,
        "approver_role": "Engineering VP",
        "per_trip_cap_usd": 3000,
        "car_rental_covered": False
    }
]
```

---

## Tasks

| # | Task | Layer | Status |
|---|---|---|---|
| 1 | Scaffold `frontend-acme/` — Vite + React + Tailwind, Acme brand tokens, router (react-router-dom) | Frontend | ⬜ |
| 2 | Build `LoginPage.tsx` — 3 persona cards with trip summary; authenticate against navanVoyageAI `/api/auth/login` | Frontend | ⬜ |
| 3 | Build `Navbar.tsx` — Acme logo, nav links, user badge, sign-out | Frontend | ⬜ |
| 4 | Build `TravelHubPage.tsx` — trip card, policy card, travel assistant side panel | Frontend | ⬜ |
| 5 | Build `TravelAssistantPanel.tsx` — iframe embedding navanVoyageAI; collapse/expand toggle | Frontend | ⬜ |
| 6 | Build `ProfilePage.tsx` — employee card with department, role, policy badge | Frontend | ⬜ |
| 7 | Add `personas.ts` — Steve, Rick, Nicholas definitions + sample prompts array | Frontend | ⬜ |
| 8 | Seed Steve M, Rick M, Nicholas J users in `backend/db/seed.py` | Backend | ⬜ |
| 9 | Seed Executive, Sales, Conference policies in `backend/db/seed.py` | Backend | ⬜ |
| 10 | Wire persona prompt chips into navanVoyageAI empty-state via `?source=acme&user=steve.m` iframe URL | Frontend | ⬜ |
| 11 | Add `acme-corp-ui` Docker service + Dockerfile; update `docker-compose.yml` + `proxy.conf` | Infra | ⬜ |
| 12 | Verify Scenario A end-to-end (Steve: SFO→BLR flight + hotel + car) | QA | ⬜ |
| 13 | Verify Scenario B end-to-end (Rick: SFO→JFK flight + hotel + car) | QA | ⬜ |
| 14 | Verify Scenario C end-to-end (Nicholas: SFO→ORD flight + hotel; car blocked) | QA | ⬜ |

---

## Acceptance Criteria

| # | Check | Status |
|---|---|---|
| 1 | Acme Corp portal accessible at `http://localhost:5212` (dev) or `/acme/` (nginx) | ⬜ |
| 2 | Login page shows 3 persona cards; clicking any card authenticates and redirects to `/travel` | ⬜ |
| 3 | Travel Hub shows correct trip card and policy card for the logged-in user | ⬜ |
| 4 | Travel Assistant panel shows navanVoyageAI with persona-specific sample prompt chips | ⬜ |
| 5 | Steve M prompt chips reference Bengaluru / BLR / office visit / business class | ⬜ |
| 6 | Rick M prompt chips reference New York / JFK / Zava Corp / Sales Policy | ⬜ |
| 7 | Nicholas J prompt chips reference Chicago / ORD / AWS Summit / economy class | ⬜ |
| 8 | Scenario A: Steve books SFO→BLR flight (business), 5-star hotel, luxury car — all 3 confirmations in chat | ⬜ |
| 9 | Scenario B: Rick books SFO→JFK flight, 4-star hotel, mid-size car — all 3 confirmations in chat | ⬜ |
| 10 | Scenario C: Nicholas books SFO→ORD flight (economy), 3-star hotel — car rental blocked by policy | ⬜ |
| 11 | Nicholas's booking shows ⚠️ pending approval indicator | ⬜ |
| 12 | Policy violations surface as inline warnings (e.g., Steve trying economy is refused) | ⬜ |
| 13 | Panel collapses to `[✈ Assistant]` tab and expands back | ⬜ |
| 14 | `npm run build` in `frontend-acme/` exits 0 | ⬜ |
| 15 | All 3 users log in and log out cleanly; JWT cleared on sign-out | ⬜ |

---

## Out of Scope

- Real Acme Corp employee directory or HR integration
- Multi-stop itineraries or group travel (more than one traveller)
- Expense report generation or integration with SAP Concur
- Manager approval workflow UI beyond the policy warning message in chat
- Loyalty programme preferences or seat selection
- Mobile-responsive breakpoints (desktop 1280 px+ target only)
