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
     └────────────────┘                   └─────┬───────────────┘
                                                │
                        ┌───────────────────────┼──────────────────┐
                        │                       │                  │
              ┌─────────▼──────┐     ┌──────────▼──────┐  ┌───────▼──────┐
              │  MongoDB       │     │  Amadeus MCP     │  │  Azure       │
              │  nva_db        │     │  port 8101       │  │  OpenAI      │
              │  port 27117    │     │  (FastMCP)       │  │  (+ Opus opt)│
              └────────────────┘     └─────────────────┘  └──────────────┘
```

## Multi-Agent Workflow

```
User Message → OrchestratorAgent
                ├── SearchAgent      (flight / hotel search via Amadeus MCP)
                ├── PolicyAgent      (deterministic rule engine — no LLM)
                ├── DestinationAgent (visa, weather, local tips)
                └── BookingAgent     (create / modify / cancel bookings)
                         │
               JudgeAgent (async, post-response)
               Scores: accuracy · policy compliance · helpfulness · tone · safety
```

## Agents

| Agent | Model | Role |
|---|---|---|
| OrchestratorAgent | Azure OpenAI | Intent classification, parallel dispatch, response aggregation |
| SearchAgent | Azure OpenAI | Amadeus flight/hotel/car search via MCP tools |
| PolicyAgent | Azure OpenAI | Deterministic travel policy rule checks |
| DestinationAgent | Azure OpenAI | Visa, weather, local tips, timezone, currency |
| BookingAgent | Azure OpenAI | Create/modify/cancel bookings; expense FAQ |
| JudgeAgent | Azure OpenAI (+ Claude Opus flag) | LLM-as-judge; 5-criteria eval score per response |

## Ports

| Service | Port | URL |
|---|---|---|
| Main app (nginx) | 3010 | http://localhost:3010 |
| Frontend dev (Tailwind) | 5210 | http://localhost:5210 |
| Frontend dev (Spectrum) | 5211 | http://localhost:5211 |
| Frontend dev (Angular M3) | 4210 | http://localhost:4210 |
| Backend (FastAPI) | 8100 | http://localhost:8100 |
| MongoDB | 27117 | — |
| Amadeus MCP | 8101 | http://localhost:8101 |

## Quickstart

```bash
# 1. Copy and fill environment variables
cp .env.example .env

# 2. Start all services
docker compose -f infrastructure/docker/docker-compose.yml up --build

# 3. Open the app
open http://localhost:3010

# Demo credentials
#   traveller / travel123
#   admin     / admin123
```

## Development (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8100

# Frontend (Tailwind — primary)
cd frontend
npm install && npm run dev     # → http://localhost:5210

# Frontend (React Spectrum)
cd frontend-spectrum
npm install && npm run dev     # → http://localhost:5211

# Frontend (Angular Material 3)
cd frontend-angular
npm install && ng serve --port 4210

# Seed demo data
python backend/db/seed.py
```

## UI Variants

| Variant | Design System | Port | Notes |
|---|---|---|---|
| `frontend/` | Tailwind CSS (custom navy/gold) | 5210 | Primary — full feature set |
| `frontend-spectrum/` | Adobe React Spectrum | 5211 | Alternative — Spectrum components |
| `frontend-angular/` | Angular Material 3 | 4210 | Alternative — M3 theme + `/showcase` gallery |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (primary) | Vite 5 · React 18 · TypeScript · Tailwind CSS 3 |
| Frontend (Spectrum) | Vite 5 · React 18 · `@adobe/react-spectrum` |
| Frontend (Angular) | Angular 17+ · `@angular/material` (M3) |
| Backend | FastAPI · Python 3.12 · Motor (async MongoDB) |
| MCP | FastMCP (Amadeus wrapper) |
| Database | MongoDB 7 (`nva_db`) |
| Auth | JWT (HS256, local) |
| Reverse proxy | nginx:alpine |
| Container | Docker Compose |
| LLM | Azure OpenAI (default) · Anthropic Claude (JudgeAgent flag) |

## Admin Panel (6 tabs)

Accessible via the ⚙ gear icon in the header:

1. **Model Selection** — per-agent model + temperature (hot-reload)
2. **Audit Log** — searchable agent action log + JSON export
3. **Billing** — token usage + cost by model/day (pure CSS chart)
4. **Eval Metrics** — JudgeAgent scores, pass/fail rate, drill-down
5. **Observability** — per-conversation agent latency Gantt trace
6. **Chat History** — searchable conversation list with inline thread + eval badges

## Related

- [`EnterpriseDataAgent`](../EnterpriseDataAgent/) — parent platform this demo is derived from
- Repo: https://github.com/rmssoftwaretech/navanVoyageAI
