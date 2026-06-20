# navanVoyageAI — Vibe Coding Spec

**Version:** 1.0 — Sprint NVA-G close (2026-06-19)
**Purpose:** Complete, self-contained specification for rebuilding navanVoyageAI from scratch using an AI coding assistant. Every design decision, data shape, component tree, API contract, and infrastructure detail is recorded here.

---

## 1. Project Identity

Build a **corporate travel AI platform** called **navanVoyageAI**. It is a CMU Capstone Demo — a multi-agent AI system that lets enterprise employees search flights, book hotels and rental cars, check corporate travel policy, and explore destinations, all through a conversational chat interface backed by three live MCP (Model Context Protocol) tool servers.

**Tagline:** Corporate Travel AI

**Repo name:** `navanVoyageAI`
**GitHub org:** `rmssoftwaretech`

---

## 2. Design System

### 2.1 Brand Colors

```
Primary (brand):   #1473e6   (Adobe blue — used for all primary actions, active states, borders)
Brand hover:       #0d66d0
Brand light:       rgba(20,115,230,0.08)   (active row backgrounds)
Brand medium:      rgba(20,115,230,0.15)
Gold accent:       #D97706   (starred items, warnings, accent highlights)
Gold light:        #F59E0B
```

### 2.2 Surfaces & Text

```
bg-page:    #f5f5f5   (page background)
bg-surface: #ffffff   (cards, sidebars, panels)
bg-hover:   rgba(20,115,230,0.05)

text-primary:   #2c2c2c
text-secondary: #4a4a4a
text-muted:     #6b6b6b
text-dim:       #9a9a9a

border:        rgba(20,115,230,0.18)
border-light:  rgba(20,115,230,0.10)
border-strong: rgba(20,115,230,0.40)
```

### 2.3 Semantic Colors

```
success: #16a34a    success-bg: rgba(22,163,74,0.08)
warning: #d97706    warning-bg: rgba(217,119,6,0.08)
danger:  #dc2626    danger-bg:  rgba(220,38,38,0.08)
info:    #2563eb    info-bg:    rgba(37,99,235,0.08)
```

### 2.4 Dark Mode

```
bg-page:    #0f172a
bg-surface: #1e293b
bg-raised:  #263348
text-primary: #f1f5f9
text-secondary: #cbd5e1
border: rgba(148,163,184,0.15)
```

### 2.5 Typography

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace;

/* Type scale */
--text-xs:   11px
--text-sm:   12px
--text-base: 13px
--text-md:   14px
--text-lg:   15px
--text-xl:   18px
--text-2xl:  22px
```

Import from Google Fonts: `Inter` (400, 500, 600, 700) + `JetBrains Mono` (400, 500).

### 2.6 Spacing, Radius, Shadows

```
4px grid: sp-1=4 sp-2=8 sp-3=12 sp-4=16 sp-5=20 sp-6=24 sp-8=32 sp-10=40

r-sm=4px r-md=6px r-lg=8px r-xl=12px r-2xl=16px r-full=9999px

shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
shadow-md: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)
shadow-lg: 0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)
```

### 2.7 Theme System

Ship 4 themes selectable via a `ThemePicker` in the app header:
- **Classic** (default, blue/white)
- **Dark** (dark navy)
- **Navy Gold** (navy sidebar + gold accents — navanVoyageAI "brand" look)
- **High Contrast**

Themes are persisted to `localStorage` key `nva_theme` and applied by swapping CSS class on `<html>`.

---

## 3. Tech Stack

### 3.1 Frontend (React — primary)
```
React 18 + TypeScript + Vite
React Router v6
Tailwind CSS (utility base — prefer inline styles for hover/state to survive Vite purge)
Axios (API client with JWT interceptor)
ReactMarkdown (render AI responses as markdown)
```

### 3.2 Backend
```
Python 3.12
FastAPI + Uvicorn
Motor (async MongoDB driver)
OpenAI SDK (Azure OpenAI + optionally Anthropic SDK for JudgeAgent)
fastmcp 3.4.2 (MCP client — for calling sidecar tools)
python-jose (JWT)
pydantic v2
python-dotenv
```

### 3.3 MCP Sidecars
```
Python 3.12 + fastmcp 3.4.2 (FastMCP server)
Uvicorn
```

### 3.4 Infrastructure
```
Docker + Docker Compose
nginx:alpine (reverse proxy)
MongoDB Atlas (cloud) OR local MongoDB 7
```

### 3.5 Alt Frontends (ship alongside primary)
```
React Spectrum (Adobe) — port 5211
Angular 17 + Angular Material 3 — port 4210
```

---

## 4. Repository Structure

```
navanVoyageAI/
├── backend/
│   ├── api/
│   │   ├── main.py                  # FastAPI app factory
│   │   └── routers/
│   │       ├── auth.py              # JWT login/me
│   │       ├── chat.py              # Conversations + SSE send
│   │       ├── admin.py             # Admin endpoints (12 groups)
│   │       ├── mcp.py               # Backend MCP proxy
│   │       ├── notifications.py
│   │       └── support.py
│   ├── application/
│   │   └── agent/
│   │       ├── base.py              # BaseAgent ABC + Azure client
│   │       ├── orchestrator.py      # OrchestratorAgent
│   │       ├── search_agent.py      # SearchAgent (MCP caller)
│   │       ├── policy_agent.py      # PolicyAgent (rule engine)
│   │       ├── destination_agent.py # DestinationAgent
│   │       ├── booking_agent.py     # BookingAgent
│   │       ├── judge_agent.py       # JudgeAgent (eval)
│   │       ├── memory.py            # ShortTermMemory + LongTermMemory
│   │       ├── tot_strategy.py      # Tree-of-Thought
│   │       └── registry.py          # agents.json loader
│   ├── db/
│   │   ├── mongo.py                 # Motor connection + get_db()
│   │   ├── models.py                # Pydantic models
│   │   ├── indexes.py               # Ensure indexes on startup
│   │   ├── seed.py                  # Seed users + policies
│   │   └── response_cache.py        # Prompt-keyed cache
│   ├── pipeline/
│   │   └── streaming.py             # SSE helpers + context builder
│   └── main.py                      # Uvicorn entry point
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # React Router routes
│   │   ├── main.tsx                 # Vite entry
│   │   ├── index.css                # CSS variables + Tailwind
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ChatPage.tsx         # Main page (all state lives here)
│   │   │   └── InspectorPage.tsx    # Standalone MCP Inspector
│   │   ├── components/
│   │   │   ├── AppHeader.tsx
│   │   │   ├── AppLayout.tsx        # 3-column layout
│   │   │   ├── ConversationSidebar.tsx
│   │   │   ├── McpInspectorPanel.tsx  # Right panel (SSE event feed)
│   │   │   ├── ContextModal.tsx
│   │   │   ├── NoteModal.tsx
│   │   │   ├── ShareModal.tsx
│   │   │   ├── SupportPanel.tsx
│   │   │   ├── ThemePicker.tsx
│   │   │   ├── NotificationPopup.tsx
│   │   │   ├── InputBar.tsx
│   │   │   ├── Chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── ReactionBar.tsx
│   │   │   │   ├── AgentBadge.tsx
│   │   │   │   ├── TurnSummaryBadge.tsx
│   │   │   │   ├── FlightResultsPanel.tsx
│   │   │   │   ├── TravelSearchForm.tsx
│   │   │   │   ├── AttachmentChip.tsx
│   │   │   │   └── ToTReasoningCard.tsx
│   │   │   ├── Booking/
│   │   │   │   ├── BookingWizard.tsx
│   │   │   │   ├── BookingReview.tsx
│   │   │   │   ├── PassengerForm.tsx
│   │   │   │   ├── SeatPreferenceStep.tsx
│   │   │   │   └── BookingConfirmation.tsx
│   │   │   ├── inspector/
│   │   │   │   ├── ConnPanel.tsx
│   │   │   │   ├── ToolsTab.tsx
│   │   │   │   ├── ResourcesTab.tsx
│   │   │   │   ├── PromptsTab.tsx
│   │   │   │   └── HistoryTab.tsx
│   │   │   └── admin/
│   │   │       ├── AdminPanel.tsx       # Modal shell + 12 tabs
│   │   │       ├── ModelSelectionTab.tsx
│   │   │       ├── AgentPromptsTab.tsx
│   │   │       ├── McpBindingsTab.tsx
│   │   │       ├── PolicyTab.tsx
│   │   │       ├── EmployeeTab.tsx
│   │   │       ├── NotificationsTab.tsx
│   │   │       ├── AuditLogTab.tsx
│   │   │       ├── BillingTab.tsx
│   │   │       ├── EvalMetricsTab.tsx
│   │   │       ├── ObservabilityTab.tsx
│   │   │       ├── ChatHistoryTab.tsx
│   │   │       └── MockDataTab.tsx
│   │   ├── services/
│   │   │   ├── auth.ts
│   │   │   ├── chat.ts
│   │   │   ├── admin.ts
│   │   │   ├── bookings.ts
│   │   │   ├── mcpInspector.ts
│   │   │   └── themes.ts
│   │   ├── types/
│   │   │   ├── nva.ts               # All TypeScript interfaces
│   │   │   └── mcpInspector.ts
│   │   ├── hooks/
│   │   │   └── usePolling.ts
│   │   └── utils/
│   │       └── export.ts
│   ├── package.json
│   ├── vite.config.ts               # Proxy /api → backend:8100
│   └── tailwind.config.js
├── amadeus-mcp/
│   └── server.py                    # FastMCP travel sidecar (port 8101)
├── car-rental-mcp/
│   └── server.py                    # FastMCP car rental sidecar (port 8102)
├── hotel-booking-mcp/
│   └── server.py                    # FastMCP hotel booking sidecar (port 8103)
├── config/
│   └── agents.json                  # Per-agent model + MCP config
├── data/
│   └── flights.json                 # 36k pre-generated flight records
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   ├── Dockerfile.amadeus-mcp
│   │   ├── Dockerfile.car-rental-mcp
│   │   └── Dockerfile.hotel-booking-mcp
│   └── nginx/
│       └── proxy.conf               # Routes /api → backend, / → frontend
├── .env.example
└── CLAUDE.md
```

---

## 5. Ports

| Service | Internal | External |
|---|---|---|
| nginx (main entry) | 80 | **3010** |
| frontend (React/Vite) | 80 | 5210 |
| frontend-spectrum (React Spectrum) | 80 | 5211 |
| frontend-angular (Angular) | 80 | 4210 |
| backend (FastAPI) | 8000 | **8100** |
| amadeus-mcp (travel) | 8101 | 8101 |
| car-rental-mcp | 8102 | 8102 |
| hotel-booking-mcp | 8103 | 8103 |

nginx reverse proxy: `GET /api/*` → `backend:8000`, all other requests → `frontend:80`.

---

## 6. Environment Variables (`.env`)

```bash
# Azure OpenAI
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_VERSION=2024-02-01

# MongoDB
MONGODB_URL=mongodb+srv://...

# JWT
JWT_SECRET=changeme_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Anthropic (optional — JudgeAgent)
ANTHROPIC_API_KEY=

# MCP sidecar URLs (set by docker-compose via environment:)
AMADEUS_MCP_URL=http://amadeus-mcp:8101
CAR_RENTAL_MCP_URL=http://car-rental-mcp:8102
HOTEL_BOOKING_MCP_URL=http://hotel-booking-mcp:8103
```

---

## 7. MongoDB Schema

**Database name:** `nva_db`

### Collections

| Collection | Purpose |
|---|---|
| `nva_conversations` | Chat conversations + turns |
| `nva_audit_log` | Per-agent action log |
| `nva_eval_scores` | JudgeAgent quality scores |
| `nva_bookings` | Booking records (`NVA-YYYY-NNNNN`) |
| `nva_policies` | Corporate travel policy rules |
| `nva_billing` | Token cost tracking |
| `nva_user_memory` | Long-term user preference memory |

### nva_conversations document

```json
{
  "conversation_id": "uuid4",
  "user": "jsmith",
  "title": "Search flights SFO→LAX",
  "turns": [
    {
      "role": "user",
      "content": "Find flights from SFO to LAX",
      "timestamp": "2026-06-19T10:00:00Z",
      "agents": [],
      "starred": false,
      "reactions": { "👍": 2 }
    },
    {
      "role": "assistant",
      "content": "Here are available flights...",
      "timestamp": "2026-06-19T10:00:05Z",
      "agents": ["search", "policy"],
      "eval_score": 0.87,
      "eval_passed": true,
      "perf": { "latency_ms": 4200, "input_tokens": 810, "output_tokens": 320 },
      "tool_calls": [],
      "agent_calls": [],
      "flight_results": [...],
      "from_cache": false
    }
  ],
  "turns_count": 2,
  "has_starred": false,
  "session_context": {
    "traveller": "Jane Smith",
    "preferences": {},
    "entities": { "origin": "SFO", "destination": "LAX" },
    "last_search": {},
    "last_policy": {},
    "booking_ids": []
  },
  "created_at": "...",
  "updated_at": "..."
}
```

### nva_policies seed document

```json
{
  "policy_id": "standard",
  "name": "Standard Corporate Policy",
  "applies_to": "all",
  "flight": {
    "allowed_classes": ["Economy", "Premium Economy"],
    "max_one_way_usd": 500,
    "max_roundtrip_usd": 900,
    "business_eligible_hours": 8,
    "min_advance_booking_days": 7,
    "max_advance_booking_days": 90
  },
  "hotel": { "max_nightly_rate_usd": 200, "allowed_tiers": ["2-star","3-star","4-star"] },
  "car_rental": { "allowed_classes": ["Economy","Compact","Mid-size"], "max_daily_rate_usd": 75 },
  "meal_per_diem_usd": 60
}
```

### Indexes

```python
# nva_conversations
{ "user": 1, "updated_at": -1 }
{ "conversation_id": 1 }

# nva_audit_log
{ "conversation_id": 1 }
{ "timestamp": -1 }

# nva_eval_scores
{ "conversation_id": 1 }
{ "user": 1, "scored_at": -1 }

# nva_user_memory
{ "user": 1 }   # unique
```

---

## 8. Backend API

All routes prefixed with `/api`. JWT Bearer token required except `POST /api/auth/login`.

### 8.1 Auth (`/api/auth`)

| Method | Path | Description |
|---|---|---|
| POST | `/login` | `{username, password}` → `{token, user}` |
| GET | `/me` | Returns current user from JWT |

Seed users: `admin / admin123 (role: admin)`, `traveller / travel123 (role: traveller)`.

### 8.2 Chat (`/api/chat`)

| Method | Path | Description |
|---|---|---|
| POST | `/conversations` | Create new conversation → `{conversation_id, title, ...}` |
| GET | `/conversations` | List user's conversations (last 50, sorted by updated_at desc, projection excludes `turns`) |
| GET | `/conversations/{id}/turns` | Get all turns in a conversation |
| POST | `/send` | `{conversation_id, content, context?}` → SSE stream of `AgentEvent` objects |
| PATCH | `/conversations/{id}/turns/{idx}/star` | `{starred: bool}` → sets turn.starred, updates has_starred |
| POST | `/conversations/{id}/turns/{idx}/react` | `{emoji: str}` → increments reactions[emoji] |
| PATCH | `/conversations/{id}/rename` | `{title: str}` |
| POST | `/conversations/{id}/share` | Returns `{share_token, url}` |
| GET | `/share/{token}` | Public read of shared conversation |
| GET | `/conversations/{id}/eval` | Latest eval score for conversation |
| GET | `/mcp/info` | Returns agents.json MCP server map for Inspector |

### 8.3 MCP Proxy (`/api/mcp`)

Backend acts as a proxy so the frontend doesn't need direct access to sidecar ports. It rewrites `localhost:8101/8102/8103` to Docker internal hostnames.

| Method | Path | Body |
|---|---|---|
| POST | `/connect` | `{url}` → lists tools, resources, resource_templates, prompts |
| POST | `/call-tool` | `{url, tool, arguments}` → `{result, duration_ms}` |
| POST | `/read-resource` | `{url, uri}` → `{content, duration_ms}` |
| POST | `/get-prompt` | `{url, prompt, arguments}` → `{messages, duration_ms}` |

URL rewrite map:
```python
{
  "http://localhost:8101": "http://amadeus-mcp:8101",
  "http://127.0.0.1:8101": "http://amadeus-mcp:8101",
  "http://localhost:8102": "http://car-rental-mcp:8102",
  "http://127.0.0.1:8102": "http://car-rental-mcp:8102",
  "http://localhost:8103": "http://hotel-booking-mcp:8103",
  "http://127.0.0.1:8103": "http://hotel-booking-mcp:8103",
}
```

### 8.4 Admin (`/api/admin`) — admin role required

| Method | Path | Description |
|---|---|---|
| GET | `/model-config` | Returns `agents.json` contents |
| PUT | `/model-config` | Hot-reload `agents.json` |
| GET | `/agent-prompts` | Map of agent → current system prompt |
| PUT | `/agent-prompts/{agent}` | Override system prompt |
| DELETE | `/agent-prompts/{agent}` | Reset to default |
| GET | `/audit-log?limit=100` | Recent audit log entries |
| GET | `/billing` | Aggregated token costs by model/day |
| GET | `/eval-scores?limit=200` | Recent JudgeAgent scores |
| GET | `/conversations?limit=50` | All users' conversations |
| DELETE | `/conversations/{id}` | Delete a conversation |
| GET | `/policies` | List all policy documents |
| POST | `/policies` | Create new policy |
| PUT | `/policies/{id}` | Update policy |
| DELETE | `/policies/{id}` | Delete policy |
| GET | `/mcp-bindings` | Per-agent MCP bindings + live server status |
| GET | `/embedding-models` | Available embedding models |
| PUT | `/embedding-models` | Set embedding model |
| GET | `/employee-documents` | RAG document list |
| DELETE | `/employee-documents` | Clear all documents |
| DELETE | `/employee-documents/{doc_id}` | Delete one document |
| GET | `/mock-data/flights?origin&destination&date&cabin` | Mock flight lookup |
| GET | `/mock-data/hotels?city&check_in&check_out` | Mock hotel lookup |
| GET | `/mock-data/cars?city&pickup_date&return_date` | Mock car lookup |

### 8.5 SSE Event Stream

`POST /api/chat/send` returns `text/event-stream`. Each line is `data: {json}`.

Event types:

```
agent_route      { agents: string[], intent: string, reasoning: string }
agent_start      { agent: string, input_preview: string }
token            { data: string }         ← streaming text chunk
agent_done       { agent: string, latency_ms: number, input_tokens, output_tokens }
mcp_tool_call    { tool: string, input: any }
mcp_tool_result  { tool: string, output: any, latency_ms: number }
flight_results   { results: FlightResult[] }
hotel_results    { results: HotelResult[] }
car_results      { results: CarResult[] }
cache_hit        { from_cache: true, cache_key: string }
tot_start        { branches: number }
tot_branch       { index: number, angle: string }
tot_evaluate     { index: number, score: number, rationale: string }
tot_selected     { index: number, angle: string }
done             { content: string, input_tokens, output_tokens, latency_ms }
error            { error: string }
```

---

## 9. Multi-Agent System

### 9.1 Agents

**OrchestratorAgent** — entry point for every chat turn.
1. Builds context block from ShortTermMemory + LongTermMemory
2. Calls `_is_complex()` — if true, runs ToT strategy to pick best reasoning angle
3. Classifies intent + selects agents (1–4) via classify prompt
4. Emits `agent_route` SSE event
5. Runs selected agents in parallel via `asyncio.gather()`
6. Synthesises results via Azure OpenAI → streams tokens
7. Fires JudgeAgent as fire-and-forget after response is complete

**SearchAgent** — MCP caller.
- Calls `search_flights`, `search_hotels`, `search_cars` via the backend MCP proxy
- Emits `mcp_tool_call`, `mcp_tool_result` SSE events
- Returns structured results + prose summary

**PolicyAgent** — deterministic rule engine.
- Reads company policy from `nva_policies` collection
- Evaluates flight class, price, hotel tier, car class against policy limits
- Returns `PolicyVerdict` with pass/fail + explanation
- Does NOT call LLM unless generating advice text

**DestinationAgent** — enrichment.
- Returns structured JSON briefing: visa requirements, weather, safety rating, currency, local tips
- Calls Azure OpenAI with temperature 0.5

**BookingAgent** — confirmation.
- Generates booking ID: `NVA-{YYYY}-{NNNNN}` (zero-padded 5-digit sequence)
- Writes `nva_bookings` document
- Returns confirmation with full segment details

**JudgeAgent** — evaluation.
- Runs asynchronously 3s after each turn completes
- Scores on 5 criteria (0.0–1.0 each): accuracy, policy_compliance, helpfulness, tone, safety
- Overall = weighted average; passed = overall ≥ 0.75
- Writes `nva_eval_scores` document
- Feature flag: `use_claude_opus: true` in agents.json switches to `claude-opus-4-7` via Anthropic SDK

### 9.2 BaseAgent ABC

```python
class BaseAgent(ABC):
    @abstractmethod
    async def run(self, ctx: AgentContext) -> AgentResult: ...
    
    async def stream_token(self, sse_queue, text: str): ...
    async def emit_event(self, sse_queue, event: dict): ...
```

`AgentContext` carries: `conversation_id`, `user`, `content`, `history`, `session_context`, `long_term_memory`, `sse_queue`, `agent_config`.

### 9.3 Tree of Thought (ToT)

`_is_complex()` triggers ToT for queries matching: multi-destination, policy conflict, open-ended, or long content (>150 chars).

ToT flow:
1. Generate 3 reasoning branches (angles) in parallel
2. Evaluate each branch: score 0–1 + rationale
3. Select highest-scoring angle as the framing for the final response
4. Emit `tot_start`, `tot_branch`, `tot_evaluate`, `tot_selected` SSE events

### 9.4 Memory

**ShortTermMemory** — last N turns summarised by Haiku into a context block prepended to every prompt. Window: 5 turns, max 2000 chars. Stored in `session_context.entities`.

**LongTermMemory** — persisted to `nva_user_memory` collection. MemoryUpdater extracts facts from turns (home airport, preferred airlines, frequent destinations). MemoryRetriever builds `=== USER LONG-TERM MEMORY ===` block prepended to orchestrator prompt.

### 9.5 agents.json Structure

```json
{
  "mcp_servers": {
    "travel": { "id": "travel", "url": "http://amadeus-mcp:8101/mcp", ... },
    "car_rental": { ... },
    "hotel_booking": { ... }
  },
  "orchestrator": {
    "model": "gpt-4o",
    "deployment": "gpt-4o",
    "temperature": 0.3,
    "max_tokens": 2048,
    "streaming": true,
    "tot_enabled": true,
    "mcp_servers": ["travel", "car_rental", "hotel_booking"],
    "mcp_tools": ["search_flights", "search_hotels", "search_cars"],
    "mcp_access": "supervisor"
  },
  "search":      { "model": "gpt-5.4", "temperature": 0.1, "mcp_access": "caller", ... },
  "policy":      { "model": "gpt-4o",  "temperature": 0.0, "mcp_access": "reader", ... },
  "destination": { "model": "gpt-5.4", "temperature": 0.5, "mcp_access": "reader", ... },
  "booking":     { "model": "gpt-5.4", "temperature": 0.1, "mcp_access": "caller", ... },
  "judge":       { "model": "gpt-4o",  "temperature": 0.0, "mcp_access": "none", "use_claude_opus": false, "eval_threshold": 0.75 }
}
```

---

## 10. MCP Sidecars

All three use **FastMCP 3.4.2**. The correct API call is `mcp.http_app()` — NOT `streamable_http_app()`. Use `logging.basicConfig(level=logging.INFO)` at module level — never `log.basicConfig()`.

### 10.1 Amadeus Travel MCP — port 8101

3 tools: `search_flights`, `search_hotels`, `search_cars`

Data source: `data/flights.json` (36k pre-generated records across 64 routes + deterministic hotel/car mock data).

`search_flights(origin, destination, date, cabin?)` → `{ flights: FlightResult[] }` up to 10 results.

Health: `GET /health` → `{ status: ok, service: travel-mcp, tools: [...], amadeus_live: true }`

### 10.2 Car Rental MCP — port 8102

3 tools: `search_cars`, `book_car`, `cancel_car`

Mock data: 6 agencies × 6 vehicle classes × 20 cities.

Agencies: `Hertz, Avis, Enterprise, Budget, National, Europcar`

Classes + daily rate multipliers:
```
Economy   1.00×    Compact   1.20×    Mid-size  1.45×
Full-size 1.70×    SUV       2.10×    Luxury    3.20×
```

Cities (IATA): `SFO JFK LAX ORD DFW MIA SEA BOS ATL DEN LHR CDG NRT DXB SYD SIN HKG AMS FRA ZRH`

Base daily rate: `50 + (md5(agency:city) % 41)` USD — deterministic seed, gives $50–$90.

`search_cars(city, pickup_date, return_date, vehicle_class?, max_daily_rate?)` → sorted by `daily_rate_usd`, max 6 results.

`book_car(city, agency, vehicle_class, pickup_date, return_date, driver_name)` → `{ confirmation_number: "CR-YYYYMMDD-XXXX", status: "confirmed", ... }`

`cancel_car(confirmation_number)` → `{ status: "cancelled", cancelled_at: "..." }`

Additional endpoints: `GET /health`, `GET /tools` (static schema list).

### 10.3 Hotel Booking MCP — port 8103

3 tools: `search_hotels`, `book_hotel`, `cancel_hotel`

Mock data: 12 hotel brands × 4 tiers × 20 cities.

Brands: `Marriott, Hilton, Hyatt, IHG, Accor, Four Seasons, Ritz-Carlton, Westin, Sheraton, Radisson, Novotel, Ibis`

Tiers + nightly rate multipliers:
```
2-star  1.00×    3-star  1.80×    4-star  3.20×    5-star  5.50×
```

Base nightly rate: `50 + (md5(brand:city) % 31)` USD.

`search_hotels(city, check_in, check_out, tier?, max_nightly_rate?)` → sorted by `nightly_rate_usd`, max 8 results.

`book_hotel(city, hotel_name, tier, check_in, check_out, guest_name)` → `{ confirmation_number: "HB-YYYYMMDD-XXXX", status: "confirmed", ... }`

`cancel_hotel(confirmation_number)` → `{ status: "cancelled", cancelled_at: "..." }`

---

## 11. Frontend — Pages

### 11.1 LoginPage (`/login`)

Full-page centered card (400px wide), brand header (navy background `#1E3A5F` or `var(--brand)`). Fields: Username, Password. On submit: `POST /api/auth/login` → store JWT in `localStorage` as `nva_token`.

After login: redirect to `/`.

### 11.2 ChatPage (`/`)

**All application state lives here.** Three-column layout via `AppLayout`:

```
[ConversationSidebar 240px] | [ChatWindow flex-1] | [McpInspectorPanel 320px, toggleable]
```

State managed in ChatPage:
- `conversations: Conversation[]` — sidebar list (fetched once on mount)
- `activeId: string | null`
- `turns: MessageTurn[]` — turns for active conversation
- `streamingContent: string` — in-progress AI token stream
- `isStreaming: boolean`
- `inspectorEvents: AgentEvent[]` — all SSE events for current turn
- `evalData: Record<string, unknown> | null` — fetched 3s after streaming ends
- `customContext: string` — system context prepended to messages
- `adminOpen: boolean`
- `inspectorOpen: boolean` (persisted to `localStorage` key `nva_inspector_open`)
- `debugMode: boolean` (persisted to `localStorage` key `nva_debug_mode`)
- `panelMode: boolean` — Inspector pinned to bottom panel vs right rail

Key callbacks:
- `handleStarChange(conversationId, hasStarred, turnIndex)` — updates both `conversations[].has_starred` and `turns[turnIndex].starred`
- `handleDeleteConversation(id)` — confirm → API delete → remove from state; clear active if deleted
- `handleRenameConversation(id, title)` — optimistic update + API call
- `handleNewConversation()` — create → prepend to list → set active
- `handleSend(content)` — calls SSE stream; parses events; appends turns

### 11.3 InspectorPage (`/inspector`)

Full-page standalone MCP Inspector. 3-panel layout:
- Left: server selector dropdown + Connect button + server info
- Center: tabbed panel (Tools, Resources, Prompts, History)
- Right: call output / response panel

The `PRESET_SERVERS` array (in `frontend/src/types/mcpInspector.ts`) drives the dropdown:
```ts
export const PRESET_SERVERS = [
  { key: 'amadeus',        label: 'Amadeus Travel MCP',  url: 'http://localhost:8101/mcp' },
  { key: 'car_rental',    label: 'Car Rental MCP',       url: 'http://localhost:8102/mcp' },
  { key: 'hotel_booking', label: 'Hotel Booking MCP',    url: 'http://localhost:8103/mcp' },
] as const
```

---

## 12. Frontend — Core Components

### 12.1 AppLayout

Three-column flex container filling 100vh. Props:
- `conversations`, `activeConversationId`, `onSelectConversation`, `onNewConversation`
- `onAdminOpen`, `inspectorOpen`, `onInspectorToggle`
- `onDeleteConversation`, `onRenameConversation`
- `onSetContext`, `hasContext`
- `panelMode`, `onPanelModeToggle`
- `debugMode`, `onDebugToggle`
- `inspector: ReactNode` (the McpInspectorPanel instance)
- `children` (the ChatWindow or empty state)

### 12.2 ConversationSidebar

Left sidebar, 240px fixed width.

Features:
- **+ New Chat** button (brand background, full width)
- **Search input** (🔍 prefix, filters by title)
- **Show starred** toggle — filters to `c.has_starred === true`; active state shows gold border
- **Date groups**: Today / Yesterday / This Week / Earlier
- **Conversation rows**:
  - Shows title (bold when active), turn count, eval badge (green ✓ or red ✕ percentage)
  - ⭐ badge when `c.has_starred`
  - Active row: `brandLight` background + 3px brand left border
  - Hover: red 🗑 trash icon appears at `position: absolute right: 6px`, calls `onDelete` after `window.confirm()`
  - Double-click title → inline rename input (blur/Enter commits, Escape cancels)
- **Set context** button at bottom

Use `hoveredId` React state for hover detection — do NOT use Tailwind `group-hover:` (purged in Vite production build).

### 12.3 ChatWindow

Props: `turns`, `streamingContent`, `isStreaming`, `onSend`, `onStop`, `onRetry`, `conversationTitle`, `debugMode`, `conversationId`, `onAttachmentChange`, `onStarChange`.

Layout:
- Scrollable messages area (flex-1, overflow-y auto)
- Auto-scroll to bottom on new turns
- Each turn → `MessageBubble`
- Streaming assistant turn → `MessageBubble` with streaming content + animated cursor
- At bottom: `ChatInput`

### 12.4 MessageBubble

User turns: right-aligned, brand background, white text.
Assistant turns: left-aligned, surface background with 1px border.

Assistant turn features (below content):
- **Flight/Hotel/Car result cards** (`FlightResultsPanel`) if `turn.flight_results` etc.
- **Agent badges** (`AgentBadge`) — pill for each agent that ran
- **TurnSummaryBadge** — cache hit, eval score chip
- **Perf bar** — latency + tokens (shown in debugMode)
- **ToT reasoning card** — expandable if ToT events exist
- **ReactionBar** (always visible — NOT hidden behind hover):
  - First pill: ☆/⭐ star button (gold when starred)
  - Then: ✈ 🔖 👍 👎 ❓ emoji reactions with counts
- **Footer row**: timestamp | Copy | Note | FeedbackBar
  - Note button → `NoteModal`; persisted to `localStorage` key `nva_note_{conversationId}_{turnIndex}`
- Left border: gold 3px when starred

Star click → `starTurn(conversationId, turnIndex, !starred)` → `onStarChange(conversationId, next, turnIndex)`.

**Critical:** Star button is in ReactionBar (always visible), not footer (hover-only). The ⭐ emoji reaction is replaced with 🔖 to avoid visual confusion with the functional star button.

### 12.5 McpInspectorPanel

Right panel, 320px, toggleable. Shows real-time SSE event feed during chat.

Event cards by type:
- **agent_route**: Shows intent + agents list with colored badges
- **agent_start/done**: Agent name + timing chip
- **mcp_tool_call**: Tool name + collapsible JSON input
- **mcp_tool_result**: Tool output + latency
- **flight_results/hotel_results/car_results**: Compact result count chip
- **tot_start/branch/evaluate/selected**: ToT reasoning tree visualisation
- **eval_result**: Score gauge (0–100%) + pass/fail badge
- **cache_hit**: "⚡ Cache hit" chip with key preview

Panel has toggle for pinned right rail vs bottom drawer (panelMode). Header shows streaming indicator.

### 12.6 Admin Panel (AdminPanel.tsx)

Fixed modal overlay: `position: fixed, inset: 0, z-index: 50`. Background: `rgba(0,0,0,0.55)`. Click backdrop → close.

Inner container:
- Default: `75vw × 75vh`
- Full-page: `100vw × 100vh` (toggled by "⊞ Full Page" / "⊡ Restore" button in header)
- CSS transition: `width 0.2s, height 0.2s`

Header: brand background, "⚙ Admin Console" + user role badge. Buttons: Full Page toggle, Dark/Light toggle, ✕ close.

**12 tabs** (horizontal scrollable tab bar):

| Tab ID | Label |
|---|---|
| `models` | Model Selection |
| `prompts` | Agent Prompts |
| `mcp_bindings` | MCP Bindings |
| `policy` | Policy |
| `employee` | Employee Data |
| `notifications` | Notifications |
| `audit` | Audit Log |
| `billing` | Billing |
| `eval` | Eval Metrics |
| `observe` | Observability |
| `history` | Chat History |
| `mock_data` | Mock Data |

---

## 13. Admin Tab Specifications

### Model Selection Tab
- Table of agents (orchestrator, search, policy, destination, booking, judge)
- Per-agent: model dropdown, temperature slider, max_tokens input, streaming toggle
- "Use Claude Opus for Eval" toggle → sets `judge.use_claude_opus` in agents.json
- Save → `PUT /api/admin/model-config`

### Agent Prompts Tab
- List of agents, each with collapsible textarea for system prompt
- Dirty indicator (●) on tab when unsaved changes
- Save / Reset to default per agent
- `PUT /api/admin/agent-prompts/{agent}` / `DELETE` to reset

### MCP Bindings Tab
- **Server cards**: one card per MCP server (Amadeus, Car Rental, Hotel Booking)
  - Status dot (green/red), URL, latency_ms
  - Tool chips: coloured pill per tool name
- **Agent cards**: one per agent
  - Shows `mcp_access` level badge (caller / reader / supervisor / none)
  - Shows resolved tool list from their `mcp_servers` config

### Policy Tab
- List of policy documents from `nva_policies`
- Create/edit/delete policy
- Each policy has flight, hotel, car rental, and meal per diem sections

### Employee Data Tab
- Upload employee documents (PDF/TXT) for RAG
- Shows list with delete-individual and clear-all

### Notifications Tab
- List of active system notifications
- Create notification with severity (info/warning/error), message, expiry

### Audit Log Tab
- Table: timestamp, user, agent, action, latency, tokens (in/out), model
- JSON export button
- Limit selector (50/100/200)

### Billing Tab
- KPI cards: total cost, total tokens, avg per conversation
- Pure CSS bar chart: cost by model/day
- No charting library — build bars with `div` widths as percentages

### Eval Metrics Tab
- KPI cards: pass rate, avg score, total evals
- 5-criteria radar-style display (accuracy, policy_compliance, helpfulness, tone, safety)
- Score drawer: click a conversation to see full eval details

### Observability Tab
- Latency chart: avg agent latency by day (CSS bars)
- Gantt trace: per-turn agent timeline visualisation

### Chat History Tab
- List of all conversations (all users, admin view)
- Filter: search, user filter, date range
- Click conversation → inline expanded thread showing all turns
- Per turn bubble:
  - Hover → ☆ star and 📝 note action buttons appear
  - Star toggle persisted to `localStorage` key `nva_star_{conversationId}_{turnIndex}`
  - Note editor: inline textarea → Save/Delete/Cancel; persisted to `localStorage` key `nva_note_{conversationId}_{turnIndex}`
  - ⭐ indicator on conversation row if any turn starred
- Hover conversation row → red 🗑 delete button appears (inline `opacity` style, NOT Tailwind)
- Delete calls `DELETE /api/admin/conversations/{id}`
- Export selected conversations as JSON

### Mock Data Tab
- Flight search form: origin, destination, date, cabin → table of results
- Hotel search form: city, check-in, check-out → table
- Car search form: city, pickup, return → table
- Data comes from the same mock sources as MCP sidecars

---

## 14. Services Layer (Frontend)

### auth.ts
```ts
const apiClient = axios.create({ baseURL: '/api' })
// Interceptor: adds Authorization: Bearer {token} from localStorage
// On 401: redirect to /login

export async function login(username, password): Promise<LoginResponse>
export async function getMe(): Promise<User>
export function isAuthenticated(): boolean   // checks localStorage token
export function logout(): void               // clears localStorage
```

### chat.ts
```ts
export async function getConversations(): Promise<Conversation[]>
export async function createConversation(): Promise<Conversation>
export async function getConversationTurns(id): Promise<MessageTurn[]>
export async function renameConversation(id, title): Promise<void>
export async function sendMessage(
  conversationId: string,
  content: string,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
  context?: string
): Promise<void>
// SSE parsing: reads stream, splits on \n, parses JSON after "data: "
export async function starTurn(conversationId, turnIndex, starred): Promise<void>
export async function reactToTurn(conversationId, turnIndex, emoji): Promise<void>
export async function getConversationEval(id): Promise<unknown>
```

### admin.ts
```ts
// All calls use apiClient (admin JWT required server-side)
export async function getModelConfig(): Promise<ModelConfig>
export async function updateModelConfig(config): Promise<ModelConfig>
export async function getAdminConversations(limit?): Promise<unknown[]>
export async function deleteAdminConversation(conversationId): Promise<void>
export async function getMcpBindings(): Promise<McpBindings>
// ... plus audit, billing, eval, policies, employee docs, mock data, embedding
```

---

## 15. TypeScript Type Definitions

### Key types (`types/nva.ts`)

```ts
interface User { username: string; role: 'admin' | 'traveller'; display_name: string; email: string }

interface Conversation {
  conversation_id: string; title: string; user: string
  created_at: string; updated_at: string; turns_count: number
  eval_score?: number; eval_passed?: boolean; has_starred?: boolean
}

interface MessageTurn {
  role: 'user' | 'assistant'; content: string; timestamp: string
  agents?: AgentType[]
  eval_score?: number; eval_passed?: boolean
  perf?: TurnPerf
  tool_calls?: ToolCall[]
  agent_calls?: AgentCall[]
  from_cache?: boolean; cache_key?: string
  flight_results?: FlightResult[]
  hotel_results?: HotelResult[]
  car_results?: CarResult[]
  reactions?: Record<string, number>
  starred?: boolean
}

type AgentType = 'search' | 'policy' | 'destination' | 'booking' | 'judge'

// AgentEvent covers all SSE event types — see Section 8.5
```

---

## 16. Booking Wizard Flow

When the user says "book [flight/hotel/car]", BookingAgent is invoked. The frontend renders a multi-step wizard modal overlaying the chat:

1. **Review step** (`BookingReview`) — displays the selected item (flight/hotel/car) with price breakdown
2. **Passenger/Driver form** (`PassengerForm`) — name, email, date of birth, passport (for flights)
3. **Seat preference** (`SeatPreferenceStep`) — window/aisle/none, meal preference (flights only)
4. **Confirmation** (`BookingConfirmation`) — shows `NVA-YYYY-NNNNN` reference number, summary

Booking is written to `nva_bookings` collection. The wizard can be cancelled at any step.

---

## 17. Infrastructure

### 17.1 nginx proxy.conf

```nginx
upstream frontend  { server frontend:80; }
upstream backend   { server backend:8000; }

server {
  listen 80;
  
  location /api/ {
    proxy_pass http://backend/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    # SSE support:
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
    chunked_transfer_encoding on;
  }
  
  location / {
    proxy_pass http://frontend/;
    try_files $uri $uri/ /index.html;
  }
}
```

### 17.2 Dockerfile pattern (backend)

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY . .
ENV PYTHONPATH=/app
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 17.3 Dockerfile pattern (frontend)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY infrastructure/nginx/spa.conf /etc/nginx/conf.d/default.conf
```

`spa.conf`:
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```

---

## 18. Critical Implementation Rules

1. **Never use Tailwind `group-hover:opacity-*`** for delete/action button visibility in production Docker builds — Vite purges these classes. Use React `hoveredId` state + inline `opacity` style instead.

2. **FastMCP server entry point:** use `mcp.http_app()`. The method `mcp.streamable_http_app()` does not exist in FastMCP 3.4.2.

3. **`logging.basicConfig()` vs `log.basicConfig()`:** `log = logging.getLogger(...)` is a Logger instance, not the module. Always call `logging.basicConfig(level=logging.INFO)` at module level.

4. **MCP URL rewrites:** The backend MCP proxy must rewrite `localhost:810x` URLs to `{service-name}:810x` Docker DNS names. Frontend sends `localhost` URLs; backend rewrites before calling the sidecar.

5. **SSE streaming:** Set `proxy_buffering off` and `proxy_cache off` in nginx for `/api/` routes, and `proxy_read_timeout 300s`.

6. **`onStarChange` signature:** `(conversationId: string, hasStarred: boolean, turnIndex: number)` — 3 arguments. ChatPage must update BOTH `conversations[].has_starred` AND `turns[turnIndex].starred` in state.

7. **Admin Chat History star/note persistence:** Use `localStorage` keys `nva_star_{conversationId}_{turnIndex}` and `nva_note_{conversationId}_{turnIndex}`. Do NOT rely on re-render stability.

8. **Docker build context:** Set `context: ../..` in docker-compose (relative to `infrastructure/docker/`) so all `Dockerfile COPY` commands can reference the monorepo root.

9. **JWT middleware:** Backend must exclude `POST /api/auth/login` from JWT requirement. All other routes require `Authorization: Bearer {token}`.

10. **agents.json hot-reload:** `GET /api/admin/model-config` reads from the file; `PUT` writes back. Backend mounts `config/` as a Docker volume for hot-reload without container restart.

---

## 19. Demo Scenarios

These are the primary demo flows for the CMU Capstone presentation:

**Scenario 1 — Basic flight search with policy check**
> "Find Economy flights from SFO to JFK departing July 10"
- SearchAgent calls `search_flights` via Amadeus MCP
- PolicyAgent checks price against $500 one-way limit
- Agent badges show search + policy in the message

**Scenario 2 — Multi-segment booking**
> "Book a trip to London next month — flights, hotel, and a car"
- OrchestratorAgent routes to search + policy + destination + booking
- ToT activates (multi-segment = complex)
- All three MCP sidecars called in sequence
- BookingAgent generates NVA-YYYY-NNNNN reference
- Inspector panel shows full agent + MCP call trace

**Scenario 3 — Policy violation**
> "Find Business class flights from NYC to Paris"
- PolicyAgent flags: Business only eligible for flights >8 hours; NY→Paris is ~7.5h
- Response explains the violation; suggests Premium Economy alternative

**Scenario 4 — Admin observability**
- Open Admin → Eval Metrics: see JudgeAgent scores for all scenarios
- Open Admin → MCP Bindings: show all 3 servers green, tool lists
- Open Admin → Chat History: show starred turns + notes on key messages
- Toggle full-page for Chat History to see conversation threads

---

## 20. File Checklist for Greenfield Build

In order, build these files:

**Infrastructure first:**
- [ ] `docker-compose.yml` — 8 services
- [ ] `infrastructure/nginx/proxy.conf` + `spa.conf`
- [ ] All Dockerfiles

**Backend:**
- [ ] `backend/db/mongo.py` — Motor connection
- [ ] `backend/db/models.py` — all Pydantic models
- [ ] `backend/db/seed.py` — seed users + default policy
- [ ] `backend/db/indexes.py`
- [ ] `backend/api/main.py` — FastAPI app + CORS + router includes
- [ ] `backend/api/routers/auth.py`
- [ ] `backend/api/routers/chat.py`
- [ ] `backend/api/routers/mcp.py` — with URL rewrites
- [ ] `backend/api/routers/admin.py`
- [ ] `backend/api/routers/notifications.py`
- [ ] `backend/pipeline/streaming.py` — `sse()` helper + `build_context_block()`
- [ ] `backend/application/agent/base.py`
- [ ] `backend/application/agent/registry.py` — loads agents.json
- [ ] `backend/application/agent/memory.py`
- [ ] `backend/application/agent/tot_strategy.py`
- [ ] `backend/application/agent/orchestrator.py`
- [ ] `backend/application/agent/search_agent.py`
- [ ] `backend/application/agent/policy_agent.py`
- [ ] `backend/application/agent/destination_agent.py`
- [ ] `backend/application/agent/booking_agent.py`
- [ ] `backend/application/agent/judge_agent.py`

**MCP Sidecars:**
- [ ] `amadeus-mcp/server.py` — FastMCP, port 8101
- [ ] `car-rental-mcp/server.py` — FastMCP, port 8102
- [ ] `hotel-booking-mcp/server.py` — FastMCP, port 8103

**Config:**
- [ ] `config/agents.json` — all 6 agents + 3 MCP servers

**Frontend:**
- [ ] `frontend/src/index.css` — CSS variables (all tokens from Section 2)
- [ ] `frontend/src/types/nva.ts`
- [ ] `frontend/src/types/mcpInspector.ts` — `PRESET_SERVERS`
- [ ] `frontend/src/services/auth.ts` — Axios client with JWT interceptor
- [ ] `frontend/src/services/chat.ts` — SSE stream parser
- [ ] `frontend/src/services/admin.ts`
- [ ] `frontend/src/services/themes.ts`
- [ ] `frontend/src/App.tsx` — React Router
- [ ] `frontend/src/pages/LoginPage.tsx`
- [ ] `frontend/src/pages/ChatPage.tsx` — all state
- [ ] `frontend/src/pages/InspectorPage.tsx`
- [ ] `frontend/src/components/AppLayout.tsx`
- [ ] `frontend/src/components/AppHeader.tsx`
- [ ] `frontend/src/components/ConversationSidebar.tsx`
- [ ] `frontend/src/components/Chat/ChatWindow.tsx`
- [ ] `frontend/src/components/Chat/MessageBubble.tsx`
- [ ] `frontend/src/components/Chat/ReactionBar.tsx`
- [ ] `frontend/src/components/Chat/ChatInput.tsx`
- [ ] `frontend/src/components/Chat/FlightResultsPanel.tsx`
- [ ] `frontend/src/components/Chat/AgentBadge.tsx`
- [ ] `frontend/src/components/Chat/TurnSummaryBadge.tsx`
- [ ] `frontend/src/components/McpInspectorPanel.tsx`
- [ ] `frontend/src/components/admin/AdminPanel.tsx` — full-page toggle
- [ ] `frontend/src/components/admin/` — all 12 tab components
- [ ] `frontend/src/components/inspector/` — 5 tab components
- [ ] `frontend/src/components/Booking/` — 5 wizard components
