# NVA-38 — Car Rental & Hotel Booking MCP Servers + Admin MCP Tab

**Epic:** EPIC-NVA
**Points:** 8
**Status:** ✅ Done
**Sprint:** NVA-F
**Depends on:** NVA-10 (Amadeus MCP), NVA-04 (Admin Panel shell)

---

## Goal

Extend the navanVoyageAI multi-agent platform with two new MCP sidecar services — a **Car Rental MCP** and a **Hotel Booking MCP** — each exposing realistic mock data and a tool contract that agents can call. Add a dedicated **MCP Servers** tab in the Admin panel that shows live connection status, latency, and available tools for all three MCP servers (Amadeus, Car Rental, Hotel Booking). This gives the capstone demo a complete, three-sidecar MCP architecture visible in real time through the admin console.

---

## Current State

| Area | Problem |
|---|---|
| MCP sidecars | Only the Amadeus flight-search MCP exists; no car rental or hotel booking tools are available to agents |
| Agent coverage | `SearchAgent` can find flights but cannot book hotels or cars; `BookingAgent` has no MCP-backed confirmation flow |
| Admin visibility | The "Connect" tab in the MCP Inspector shows only the Amadeus sidecar; there is no admin-level view of all registered MCP servers |

---

## Target Design / Specification

### Car Rental MCP (`car-rental-mcp/`) — port 8102

FastAPI sidecar with three tools:

| Tool | Method + Path | Description |
|---|---|---|
| `search_cars` | `POST /tools/search_cars` | Find available rentals by city, pickup date, return date, optional class filter |
| `book_car` | `POST /tools/book_car` | Confirm a booking; returns confirmation number `CR-YYYYMMDD-NNNN` |
| `cancel_car` | `POST /tools/cancel_car` | Cancel by confirmation number |

**Mock data — 6 agencies × 5 vehicle classes × 20 cities:**

```
Agencies: Hertz, Avis, Enterprise, Budget, National, Europcar
Classes:  Economy, Compact, Mid-size, Full-size, Luxury, SUV
Cities:   SFO, JFK, LAX, ORD, DFW, MIA, SEA, BOS, ATL, DEN,
          LHR, CDG, NRT, DXB, SYD, SIN, HKG, AMS, FRA, ZRH
```

Base daily rates (USD) randomised per agency+city seed, then multiplied by class multiplier:

| Class | Multiplier |
|---|---|
| Economy | 1.0× |
| Compact | 1.2× |
| Mid-size | 1.45× |
| Full-size | 1.7× |
| SUV | 2.1× |
| Luxury | 3.2× |

`search_cars` returns 6 results sorted by daily rate. `book_car` returns:

```json
{
  "confirmation_number": "CR-20250810-A3F7",
  "agency": "Hertz",
  "vehicle_class": "Full-size",
  "pickup_city": "SFO",
  "pickup_date": "2025-08-10",
  "return_date": "2025-08-14",
  "daily_rate_usd": 89.00,
  "total_usd": 356.00,
  "status": "confirmed"
}
```

**Additional endpoints:**

```
GET  /health         → { "status": "ok", "service": "car-rental-mcp" }
GET  /tools          → list of tool schemas (MCP-style)
POST /tools/search_cars
POST /tools/book_car
POST /tools/cancel_car
```

---

### Hotel Booking MCP (`hotel-booking-mcp/`) — port 8103

FastAPI sidecar focused on booking (search is handled by Amadeus MCP). Three tools:

| Tool | Method + Path | Description |
|---|---|---|
| `search_hotels` | `POST /tools/search_hotels` | Find hotels by city, check-in, check-out, optional tier/chain filter |
| `book_hotel` | `POST /tools/book_hotel` | Confirm a reservation; returns confirmation `HB-YYYYMMDD-NNNN` |
| `cancel_hotel` | `POST /tools/cancel_hotel` | Cancel by confirmation number |

**Mock data — 12 hotel brands × 20 cities × 4 tiers:**

```
Brands:  Marriott, Hilton, Hyatt, IHG, Accor, Four Seasons,
         Ritz-Carlton, Westin, Sheraton, Radisson, Novotel, Ibis
Tiers:   2-star, 3-star, 4-star, 5-star
Cities:  same 20-city set as Car Rental MCP
```

Base nightly rates seeded deterministically per brand+city; tier multiplier applied:

| Tier | Multiplier |
|---|---|
| 2-star | 1.0× |
| 3-star | 1.8× |
| 4-star | 3.2× |
| 5-star | 5.5× |

`search_hotels` returns 8 results sorted by nightly rate. `book_hotel` returns:

```json
{
  "confirmation_number": "HB-20250810-C9D2",
  "hotel": "Marriott SFO",
  "tier": "4-star",
  "city": "SFO",
  "check_in": "2025-08-10",
  "check_out": "2025-08-14",
  "nights": 4,
  "nightly_rate_usd": 289.00,
  "total_usd": 1156.00,
  "status": "confirmed"
}
```

---

### Admin Panel — MCP Servers tab

New tab `{ id: 'mcp_servers', label: 'MCP Servers' }` added to `AdminPanel.tsx`.

**Layout (75vw modal, scrollable body):**

```
┌─────────────────────────────────────────────────────────┐
│  MCP Servers                          [Refresh]         │
├────────────────────┬────────────────────────────────────┤
│  ● Amadeus MCP     │  URL: http://amadeus-mcp:8101      │
│    Connected · 18ms│  Protocol: MCP/HTTP                │
│                    │  Tools: search_flights, ...        │
│                    │  [▼ Tool Details]                  │
├────────────────────┼────────────────────────────────────┤
│  ● Car Rental MCP  │  URL: http://car-rental-mcp:8102   │
│    Connected · 12ms│  Tools: search_cars, book_car, ... │
│                    │  [▼ Tool Details]                  │
├────────────────────┼────────────────────────────────────┤
│  ● Hotel Booking   │  URL: http://hotel-booking-mcp:8103│
│    Connected · 21ms│  Tools: search_hotels, book_hotel  │
│                    │  [▼ Tool Details]                  │
└────────────────────┴────────────────────────────────────┘
```

Each server card shows:
- Status dot (green = connected, red = error)
- Service name + URL
- Latency in ms (live ping via backend proxy)
- Tool list with expand/collapse for inputSchema

**Backend proxy endpoint** — `GET /api/admin/mcp-servers`:

```json
[
  {
    "id": "amadeus",
    "label": "Amadeus MCP",
    "url": "http://amadeus-mcp:8101",
    "connected": true,
    "latency_ms": 18,
    "tools": [{ "name": "search_flights", "description": "...", "inputSchema": {} }]
  },
  { "id": "car_rental", ... },
  { "id": "hotel_booking", ... }
]
```

The backend pings each sidecar's `/tools` endpoint, measures round-trip, and returns the aggregated status in one call.

---

### docker-compose additions

Two new services in `infrastructure/docker/docker-compose.yml`:

```yaml
car-rental-mcp:
  build:
    context: ../../
    dockerfile: infrastructure/docker/Dockerfile.car-rental-mcp
  ports: ["8102:8102"]
  networks: [nva-net]

hotel-booking-mcp:
  build:
    context: ../../
    dockerfile: infrastructure/docker/Dockerfile.hotel-booking-mcp
  ports: ["8103:8103"]
  networks: [nva-net]
```

Nginx gains two new upstream blocks for the new sidecars (internal container routing only; no public proxy needed beyond admin health calls).

---

## Tasks

| # | Task | Layer | Status |
|---|---|---|---|
| 1 | Create `car-rental-mcp/server.py` with mock data, `search_cars`, `book_car`, `cancel_car` tools | Infra | ⬜ |
| 2 | Create `car-rental-mcp/requirements.txt` and `Dockerfile.car-rental-mcp` | Infra | ⬜ |
| 3 | Create `hotel-booking-mcp/server.py` with mock data, `search_hotels`, `book_hotel`, `cancel_hotel` tools | Infra | ⬜ |
| 4 | Create `hotel-booking-mcp/requirements.txt` and `Dockerfile.hotel-booking-mcp` | Infra | ⬜ |
| 5 | Add both services to `docker-compose.yml` | Infra | ⬜ |
| 6 | Add `GET /api/admin/mcp-servers` endpoint to `backend/api/routers/admin.py` | Backend | ⬜ |
| 7 | Add `getMcpServers()` to `frontend/src/services/admin.ts` | Frontend | ⬜ |
| 8 | Create `frontend/src/components/admin/McpServersTab.tsx` | Frontend | ⬜ |
| 9 | Register `mcp_servers` tab in `AdminPanel.tsx` | Frontend | ⬜ |
| 10 | Update `SearchAgent` to route hotel searches to `hotel-booking-mcp` and car searches to `car-rental-mcp` | Backend | ⬜ |
| 11 | `npx tsc --noEmit` passes; `docker compose up` starts all 7 services cleanly | QA | ⬜ |

---

## Files to Create / Modify

| File | Action |
|---|---|
| `car-rental-mcp/server.py` | New — FastAPI MCP sidecar for car rental |
| `car-rental-mcp/requirements.txt` | New |
| `hotel-booking-mcp/server.py` | New — FastAPI MCP sidecar for hotel booking |
| `hotel-booking-mcp/requirements.txt` | New |
| `infrastructure/docker/Dockerfile.car-rental-mcp` | New |
| `infrastructure/docker/Dockerfile.hotel-booking-mcp` | New |
| `infrastructure/docker/docker-compose.yml` | Modified — add 2 new services |
| `backend/api/routers/admin.py` | Modified — add `GET /admin/mcp-servers` |
| `frontend/src/services/admin.ts` | Modified — add `getMcpServers()` |
| `frontend/src/components/admin/McpServersTab.tsx` | New |
| `frontend/src/components/admin/AdminPanel.tsx` | Modified — add `mcp_servers` tab |
| `backend/application/agent/search_agent.py` | Modified — route to new MCP sidecars |

---

## Acceptance Criteria

| # | Check | Status |
|---|---|---|
| 1 | `docker compose up` starts all 7 services (backend, frontend, nginx, amadeus-mcp, car-rental-mcp, hotel-booking-mcp, mongo) with no errors | ⬜ |
| 2 | `GET http://localhost:8102/health` → `{ "status": "ok" }` | ⬜ |
| 3 | `GET http://localhost:8103/health` → `{ "status": "ok" }` | ⬜ |
| 4 | `POST http://localhost:8102/tools/search_cars` with valid payload returns 6 results sorted by daily rate | ⬜ |
| 5 | `POST http://localhost:8102/tools/book_car` returns confirmation number matching `CR-YYYYMMDD-NNNN` | ⬜ |
| 6 | `POST http://localhost:8103/tools/search_hotels` returns 8 results sorted by nightly rate | ⬜ |
| 7 | `POST http://localhost:8103/tools/book_hotel` returns confirmation number matching `HB-YYYYMMDD-NNNN` | ⬜ |
| 8 | Admin panel → MCP Servers tab shows all 3 servers with green status dots and latency | ⬜ |
| 9 | Expanding a tool card in MCP Servers tab renders the inputSchema correctly | ⬜ |
| 10 | Chat query "rent a car in SFO Aug 10–14" triggers `search_cars` tool call visible in MCP Inspector | ⬜ |
| 11 | `npx tsc --noEmit` exits 0 | ⬜ |

---

## Out of Scope

- Real Hertz/Avis/Marriott API integration — mock data only for this story
- Car rental or hotel loyalty programme lookups
- Payment processing or PCI-compliant card handling
- Cancellation policy enforcement beyond a simple status flip
- MCP Inspector "Connect" tab showing the new sidecars (handled separately via the admin MCP Servers tab)
