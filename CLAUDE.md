# CLAUDE.md — navanVoyageAI

## Repo location
`~/Downloads/navanVoyageAI/`  (sibling to `EnterpriseDataAgent/`)

## Port assignments
| Service | Port |
|---|---|
| Frontend (Vite / Tailwind) | 5210 |
| Frontend (React Spectrum) | 5211 |
| Frontend (Angular Material 3) | 4210 |
| Backend (FastAPI) | 8100 |
| MongoDB | Atlas — geminirag.saslfno.mongodb.net / navanVoyageAI |
| nginx (main app entry) | 3010 |
| Amadeus MCP server | 8101 |

Main app URL: `http://localhost:3010`

## Key differences from EDA

- **No canvas / React Flow** — pure streaming chat UI only
- **Admin is an embedded modal** (gear icon in header; `75vw × 75vh` centred overlay) — not a separate app on its own port
- **MCP Inspector** is a right-panel toggle fed by SSE — not a separate route
- **agents.json** controls per-agent model + temperature (hot-reload via `PUT /api/admin/model-config`)
- **JudgeAgent** defaults to Azure OpenAI; set `"use_claude_opus": true` in `agents.json → judge` to switch to `claude-opus-4-7`
- **MongoDB database**: `nva_db` (not `agent_cache_db`)
- **Three frontend variants**: `frontend/` (Tailwind), `frontend-spectrum/` (React Spectrum), `frontend-angular/` (Angular M3)

## Import path conventions
All canonical Python code lives under `backend/`, `middleware/`, `tests/`.
No legacy `api/`, `agent/`, or `src/` top-level paths.

| Import | Canonical path |
|---|---|
| FastAPI app | `from backend.api.main import app` |
| OrchestratorAgent | `from backend.application.agent.orchestrator import OrchestratorAgent` |
| MongoDB client | `from backend.db.mongo import get_db` |
| SSE utilities | `from backend.pipeline.streaming import sse_generator` |

## agents.json structure
```json
{
  "orchestrator": { "model": "azure-openai", "temperature": 0.3 },
  "search":        { "model": "azure-openai", "temperature": 0.1 },
  "policy":        { "model": "azure-openai", "temperature": 0.0 },
  "destination":   { "model": "azure-openai", "temperature": 0.5 },
  "booking":       { "model": "azure-openai", "temperature": 0.1 },
  "judge":         { "model": "azure-openai", "temperature": 0.0, "use_claude_opus": false }
}
```

## Classic look-and-feel rules (Tailwind frontend)
- Navy sidebar: `#1E3A5F`; gold accent: `#D97706`; white content background
- Font: IBM Plex Sans — no Inter, no Geist
- No `rounded-xl`, no gradients, no glassmorphism
- Card elevation: `box-shadow: 0 1px 3px rgba(0,0,0,0.12)`
- Section dividers: horizontal rules (`<hr>`)
- Admin: tables over card grids

## Dev commands
```bash
# Backend
cd backend && uvicorn api.main:app --reload --port 8100

# Frontend (Tailwind)
cd frontend && npm run dev      # → http://localhost:5210

# Frontend (Spectrum)
cd frontend-spectrum && npm run dev   # → http://localhost:5211

# Frontend (Angular)
cd frontend-angular && ng serve --port 4210

# Full stack
docker compose -f infrastructure/docker/docker-compose.yml up --build
```
