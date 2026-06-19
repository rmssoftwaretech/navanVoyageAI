# navanVoyageAI

Corporate travel multi-agent AI assistant — CMU Capstone Demo.

## Architecture

```
                  ┌─────────────────────────────────────────────┐
                  │  nginx  (http://localhost:3010)              │
                  │  /      → frontend:5210                      │
                  │  /api/  → backend:8100                       │
                  └──────────────┬──────────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
     ┌────────▼───────┐                   ┌─────────▼──────────┐
     │  Frontend      │                   │  Backend (FastAPI)  │
     │  Vite + React  │  ←── SSE ────────►│  port 8100         │
     │  port 5210     │                   │                     │
     └────────────────┘                   └──────┬─────────────┘
                                                 │
                        ┌────────────────────────┼──────────────────────────┐
                        │                        │                          │
              ┌─────────▼──────┐    ┌────────────▼────────────┐  ┌─────────▼──────┐
              │  MongoDB       │    │  MCP Sidecars (FastMCP)  │  │  Azure OpenAI  │
              │  nva_db        │    │  Amadeus MCP  port 8101  │  │  (+ Opus opt.) │
              │  port 27117    │    │  Car Rental   port 8102  │  └────────────────┘
              └────────────────┘    │  Hotel Booking port 8103 │
                                    └─────────────────────────┘
```

## Multi-Agent Workflow

```
User Message → OrchestratorAgent
                ├── SearchAgent      → Amadeus MCP (flights)
                │                   → Car Rental MCP (cars)
                │                   → Hotel Booking MCP (hotels)
                ├── PolicyAgent      (deterministic rule engine — no LLM call)
                ├── DestinationAgent (visa, weather, local tips)
                └── BookingAgent     (create / cancel bookings; NVA-YYYY-NNNNN refs)
                         │
               JudgeAgent (async, post-response, fire-and-forget)
               Scores: accuracy · policy compliance · helpfulness · tone · safety
```

## Agents

| Agent | Model | Role |
|---|---|---|
| OrchestratorAgent | Azure OpenAI gpt-4o | Intent classification, parallel dispatch, Tree-of-Thought for complex queries |
| SearchAgent | Azure OpenAI gpt-5.4 | MCP tool caller — flights via Amadeus, hotels via Hotel Booking MCP, cars via Car Rental MCP |
| PolicyAgent | Azure OpenAI | Deterministic travel policy rule checks (class limits, advance booking, per diem) |
| DestinationAgent | Azure OpenAI gpt-5.4 | Visa requirements, weather, local tips, timezone, currency |
| BookingAgent | Azure OpenAI gpt-5.4 | Create/cancel bookings; generates `NVA-YYYY-NNNNN` references |
| JudgeAgent | Azure OpenAI (+ Claude Opus flag) | LLM-as-judge; 5-criteria eval score written to `nva_eval_scores` |

## MCP Sidecars

| Sidecar | Port | Tools | Data |
|---|---|---|---|
| Amadeus Travel MCP | 8101 | `search_flights` | 36k flight records, 64 routes |
| Car Rental MCP | 8102 | `search_cars`, `book_car`, `cancel_car` | 6 agencies × 6 classes × 20 cities |
| Hotel Booking MCP | 8103 | `search_hotels`, `book_hotel`, `cancel_hotel` | 12 brands × 4 tiers × 20 cities |

## Ports

| Service | Port | URL |
|---|---|---|
| Main app (nginx) | 3010 | http://localhost:3010 |
| Frontend (Tailwind — primary) | 5210 | http://localhost:5210 |
| Frontend (React Spectrum S2) | 5211 | http://localhost:5211 |
| Frontend (Angular Material M3) | 4210 | http://localhost:4210 |
| Backend (FastAPI) | 8100 | http://localhost:8100/docs |
| MongoDB | 27117 | — |
| Amadeus Travel MCP | 8101 | http://localhost:8101/health |
| Car Rental MCP | 8102 | http://localhost:8102/health |
| Hotel Booking MCP | 8103 | http://localhost:8103/health |

## Quickstart

```bash
# 1. Copy and fill environment variables
cp .env.example .env
# Required: AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, MONGODB_HOST/USERNAME/PASSWORD

# 2. Start all 7 services
docker compose -f infrastructure/docker/docker-compose.yml up --build

# 3. Open the app
open http://localhost:3010

# Demo credentials (seeded automatically on first run)
#   traveller / travel123   ← standard user
#   admin     / admin123    ← full admin panel access
```

## Demo Scenarios

### 1 — Flight Search + Policy Check
> "Book me a business class flight from JFK to London next Tuesday"

Shows: SearchAgent → `search_flights`, PolicyAgent (class limit check), DestinationAgent (UK visa/weather), FlightCard results with **Select →** button.

### 2 — Hotel + Car Bundle
> "I need a hotel in Dubai Aug 10–14 and a mid-size rental car"

Shows: parallel hotel (`search_hotels` via Hotel Booking MCP) + car search (`search_cars` via Car Rental MCP) in MCP Inspector panel. Two MCP sidecars visible with separate latencies.

### 3 — Booking Wizard
Click **Select →** on any FlightCard → 3-step modal:
- Step 1: Passenger details (name, passport, DOB, email)
- Step 2: Seat preference + meal
- Step 3: Review + policy checkbox → **Confirm Booking**
- Success screen with `NVA-2026-NNNNN` reference + **Download Itinerary**

### 4 — Admin Panel (⚙ gear → admin / admin123)
Navigate all 12 tabs:
- **Model Selection** — switch agents between Azure/OpenAI/Anthropic live
- **Agent Prompts** — edit orchestrator system prompt, save → next turn uses new prompt
- **MCP Bindings** — live status dots + latency for all 3 MCP sidecars, tool schemas
- **Policy** — view/edit corporate travel policy rules
- **Eval Metrics** — JudgeAgent 5-criteria scores, pass/fail rate
- **Observability** — per-conversation agent latency Gantt trace
- **Billing** — token usage + cost by model/day
- **Chat History** — starred messages, reaction badges, inline thread

### 5 — Multi-Frontend (same backend)
| URL | Design System |
|---|---|
| http://localhost:5210 | Tailwind CSS (primary, navy/gold) |
| http://localhost:5211 | Adobe React Spectrum S2 |
| http://localhost:4210 | Angular Material 3 (violet M3 theme) |

## Development (without Docker)

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn api.main:app --reload --port 8100

# MCP sidecars (optional — mock data works locally too)
python amadeus-mcp/server.py          # port 8101
python car-rental-mcp/server.py       # port 8102
python hotel-booking-mcp/server.py    # port 8103

# Frontend (Tailwind — primary)
cd frontend && npm install && npm run dev      # → http://localhost:5210

# Frontend (React Spectrum S2)
cd frontend-spectrum && npm install && npm run dev  # → http://localhost:5211

# Frontend (Angular Material 3)
cd frontend-angular && npm install && ng serve --port 4210
```

## UI Variants

| Variant | Design System | Port | Notes |
|---|---|---|---|
| `frontend/` | Tailwind CSS (custom navy/gold) | 5210 | Primary — full feature set, BookingWizard |
| `frontend-spectrum/` | Adobe React Spectrum S2 | 5211 | TableView, ToastQueue, ActionButton |
| `frontend-angular/` | Angular Material 3 | 4210 | MatTable, MatSnackBar, M3 violet theme |

## Admin Panel (12 tabs)

Accessible via ⚙ gear icon → **admin / admin123**:

| Tab | What it shows |
|---|---|
| Model Selection | Per-agent model + temperature; hot-reload via `agents.json` |
| Agent Prompts | Edit any agent's system prompt; `●` dot = unsaved changes |
| MCP Bindings | Live status + latency for all 3 MCP sidecars; tool schemas |
| Policy | Corporate travel policy CRUD (class limits, per diem, advance booking) |
| Employee Data | 100 employee records; upload CSV |
| Notifications | Real-time alerts |
| Audit Log | Searchable agent action log; auto-refresh 10s; CSV export |
| Billing | Token usage + cost by model/day; CSV export |
| Eval Metrics | JudgeAgent 5-criteria scores; auto-refresh 15s; JSON export |
| Observability | Per-conversation agent latency Gantt trace |
| Chat History | Searchable conversation list; starred, reactions, eval badges |
| Mock Data | Browse the 88k flight/hotel/car records used by MCP sidecars |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (primary) | Vite 5 · React 18 · TypeScript · Tailwind CSS 3 |
| Frontend (Spectrum) | Vite 5 · React 19 · `@react-spectrum/s2` (Spectrum 2) |
| Frontend (Angular) | Angular 18 · `@angular/material` (M3) |
| Backend | FastAPI · Python 3.12 · Motor (async MongoDB) |
| MCP | FastMCP 3.x — Amadeus MCP, Car Rental MCP, Hotel Booking MCP |
| Database | MongoDB (`nva_db`) |
| Auth | JWT (HS256) · bcrypt passwords |
| Reverse proxy | nginx:alpine |
| Container | Docker Compose (7 services) |
| LLM | Azure OpenAI (default) · Anthropic Claude Opus (JudgeAgent optional) · OpenAI · Ollama |

## Related

- [`EnterpriseDataAgent`](../EnterpriseDataAgent/) — parent platform this demo extends
- Repo: https://github.com/rmssoftwaretech/navanVoyageAI
