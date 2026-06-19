"""Admin router — model config, agent prompts, audit log, billing, eval scores, policy docs."""
from __future__ import annotations

import asyncio
import csv
import io
import json
import random
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File

from backend.api.routers.auth import require_admin
from backend.application.agent.base import _DEFAULT_PROMPTS, get_prompt
from backend.application.agent.registry import get_full_config, reload_agent_config
from backend.db.mongo import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

_AGENTS_JSON    = Path(__file__).parent.parent.parent.parent / "config" / "agents.json"
_PROMPTS_JSON   = Path(__file__).parent.parent.parent.parent / "config" / "prompts.json"
_POLICIES_JSON  = Path(__file__).parent.parent.parent.parent / "config" / "policies.json"
_EMBEDDING_JSON = Path(__file__).parent.parent.parent.parent / "config" / "embedding.json"

_DEFAULT_EMBEDDING = {
    "selected_model": "text-embedding-ada-002",
    "provider": "azure-openai",
    "dimension": 1536,
}

_EMBEDDING_MODELS = [
    {"id": "text-embedding-ada-002",   "provider": "azure-openai", "dimension": 1536, "label": "Ada 002 (default)"},
    {"id": "text-embedding-3-small",   "provider": "azure-openai", "dimension": 1536, "label": "3-Small (fast)"},
    {"id": "text-embedding-3-large",   "provider": "azure-openai", "dimension": 3072, "label": "3-Large (best)"},
    {"id": "text-embedding-ada-002",   "provider": "openai",       "dimension": 1536, "label": "Ada 002 (OpenAI)"},
    {"id": "BAAI/bge-small-en-v1.5",  "provider": "local",        "dimension": 384,  "label": "BGE Small (local)"},
    {"id": "BAAI/bge-large-en-v1.5",  "provider": "local",        "dimension": 1024, "label": "BGE Large (local)"},
]


@router.get("/model-config")
async def get_model_config(_: dict = Depends(require_admin)) -> dict:
    return get_full_config()


@router.put("/model-config")
async def update_model_config(body: dict, _: dict = Depends(require_admin)) -> dict:
    """Merge body into agents.json and hot-reload the registry."""
    current = get_full_config()
    for agent_name, cfg in body.items():
        if agent_name in current:
            current[agent_name].update(cfg)
        else:
            current[agent_name] = cfg
    _AGENTS_JSON.write_text(json.dumps(current, indent=2))
    return reload_agent_config()


@router.get("/agent-prompts")
async def get_agent_prompts(_: dict = Depends(require_admin)) -> dict:
    """Return current system prompt for all agents (file override or default)."""
    return {agent: get_prompt(agent) for agent in _DEFAULT_PROMPTS}


@router.put("/agent-prompts/{agent}")
async def update_agent_prompt(
    agent: str, body: dict, _: dict = Depends(require_admin)
) -> dict:
    """Write a single agent's prompt to config/prompts.json."""
    if agent not in _DEFAULT_PROMPTS:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent}")
    _PROMPTS_JSON.parent.mkdir(parents=True, exist_ok=True)
    current: dict = {}
    if _PROMPTS_JSON.exists():
        try:
            current = json.loads(_PROMPTS_JSON.read_text())
        except Exception:
            pass
    current[agent] = body.get("prompt", "")
    _PROMPTS_JSON.write_text(json.dumps(current, indent=2))
    return {"agent": agent, "status": "saved"}


@router.delete("/agent-prompts/{agent}")
async def reset_agent_prompt(agent: str, _: dict = Depends(require_admin)) -> dict:
    """Remove a prompt override, restoring the hard-coded default."""
    if agent not in _DEFAULT_PROMPTS:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent}")
    if _PROMPTS_JSON.exists():
        try:
            current = json.loads(_PROMPTS_JSON.read_text())
            current.pop(agent, None)
            _PROMPTS_JSON.write_text(json.dumps(current, indent=2))
        except Exception:
            pass
    return {"agent": agent, "status": "reset", "prompt": _DEFAULT_PROMPTS[agent]}


@router.get("/audit-log")
async def get_audit_log(
    limit: int = Query(100, ge=1, le=500),
    _: dict = Depends(require_admin),
) -> list[dict]:
    db = await get_db()
    if db is None:
        return []
    cursor = db["nva_audit_log"].find(
        {},
        {"_id": 0},
        sort=[("timestamp", -1)],
        limit=limit,
    )
    return await cursor.to_list(length=limit)


@router.get("/billing")
async def get_billing(
    _: dict = Depends(require_admin),
) -> dict:
    db = await get_db()
    if db is None:
        return {"entries": [], "total_cost_usd": 0.0}
    cursor = db["nva_billing"].find({}, {"_id": 0}, sort=[("period_start", -1)], limit=12)
    entries = await cursor.to_list(length=12)
    total = sum(float(e.get("total_cost_usd", 0)) for e in entries)
    return {"entries": entries, "total_cost_usd": round(total, 4)}


@router.get("/eval-scores")
async def get_eval_scores(
    limit: int = Query(200, ge=1, le=1000),
    _: dict = Depends(require_admin),
) -> list[dict]:
    db = await get_db()
    if db is None:
        return []
    cursor = db["nva_eval_scores"].find(
        {},
        {"_id": 0},
        sort=[("timestamp", -1)],
        limit=limit,
    )
    return await cursor.to_list(length=limit)


@router.get("/conversations")
async def get_all_conversations(
    limit: int = Query(50, ge=1, le=200),
    _: dict = Depends(require_admin),
) -> list[dict]:
    db = await get_db()
    if db is None:
        return []
    cursor = db["nva_conversations"].find(
        {},
        {"_id": 0},
        sort=[("updated_at", -1)],
        limit=limit,
    )
    return await cursor.to_list(length=limit)


# ── Embedding models ──────────────────────────────────────────────────────────

@router.get("/embedding-models")
async def get_embedding_models(_: dict = Depends(require_admin)) -> dict:
    cfg = _DEFAULT_EMBEDDING.copy()
    if _EMBEDDING_JSON.exists():
        try:
            cfg.update(json.loads(_EMBEDDING_JSON.read_text()))
        except Exception:
            pass
    return {"selected": cfg, "available": _EMBEDDING_MODELS}


@router.put("/embedding-models")
async def set_embedding_model(body: dict, _: dict = Depends(require_admin)) -> dict:
    _EMBEDDING_JSON.parent.mkdir(parents=True, exist_ok=True)
    _EMBEDDING_JSON.write_text(json.dumps(body, indent=2))
    return {"selected": body, "available": _EMBEDDING_MODELS}


# ── Employee document ingestion (RAG) ─────────────────────────────────────────

@router.get("/employee-documents")
async def list_employee_documents(_: dict = Depends(require_admin)) -> list[dict]:
    db = await get_db()
    if db is None:
        return []
    cursor = db["nva_employee_data"].find({}, {"_id": 0}, sort=[("uploaded_at", -1)])
    return await cursor.to_list(length=200)


@router.post("/employee-documents")
async def upload_employee_document(
    file: UploadFile = File(...),
    _: dict = Depends(require_admin),
) -> dict:
    raw = await file.read()
    filename = file.filename or "employees"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"
    now = datetime.now(timezone.utc).isoformat()

    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")

    if ext == "json":
        try:
            parsed = json.loads(raw.decode())
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON file")

        if isinstance(parsed, list):
            for item in parsed:
                item["doc_id"] = str(uuid.uuid4())
                item["source_file"] = filename
                item["format"] = "json"
                item["uploaded_at"] = now
                await db["nva_employee_data"].insert_one(item)
                item.pop("_id", None)
            return {"inserted": len(parsed), "format": "json", "source_file": filename}
        else:
            doc = {"doc_id": str(uuid.uuid4()), "source_file": filename, "format": "json",
                   "uploaded_at": now, "content": json.dumps(parsed)}
            await db["nva_employee_data"].insert_one(doc)
            doc.pop("_id", None)
            return doc

    elif ext == "csv":
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
        rows = list(reader)
        for row in rows:
            row["doc_id"] = str(uuid.uuid4())
            row["source_file"] = filename
            row["format"] = "csv"
            row["uploaded_at"] = now
            await db["nva_employee_data"].insert_one(row)
        # remove _id from all
        return {"inserted": len(rows), "format": "csv", "source_file": filename}
    else:
        doc = {
            "doc_id": str(uuid.uuid4()), "source_file": filename, "format": ext,
            "uploaded_at": now, "content": raw.decode("utf-8", errors="replace"),
        }
        await db["nva_employee_data"].insert_one(doc)
        doc.pop("_id", None)
        return doc


@router.delete("/employee-documents/{doc_id}")
async def delete_employee_document(doc_id: str, _: dict = Depends(require_admin)) -> dict:
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    result = await db["nva_employee_data"].delete_many({"doc_id": doc_id})
    if result.deleted_count == 0:
        # doc_id might be an employee_id field
        result2 = await db["nva_employee_data"].delete_one({"employee_id": doc_id})
        if result2.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": doc_id}


@router.delete("/employee-documents")
async def clear_all_employee_documents(_: dict = Depends(require_admin)) -> dict:
    """Clear all employee data from the collection."""
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    result = await db["nva_employee_data"].delete_many({})
    return {"deleted_count": result.deleted_count}


# ── Structured policy CRUD ────────────────────────────────────────────────────

@router.get("/policies")
async def list_structured_policies(_: dict = Depends(require_admin)) -> list[dict]:
    """Return all structured policies (those with a policy_id field)."""
    db = await get_db()
    if db is None:
        # Fall back to config file
        try:
            return json.loads(_POLICIES_JSON.read_text())
        except Exception:
            return []
    cursor = db["nva_policies"].find({"policy_id": {"$exists": True}}, {"_id": 0})
    docs = await cursor.to_list(length=100)
    if docs:
        return docs
    # Seed from file if DB is empty
    try:
        return json.loads(_POLICIES_JSON.read_text())
    except Exception:
        return []


@router.put("/policies/{policy_id}")
async def update_structured_policy(
    policy_id: str, body: dict, _: dict = Depends(require_admin)
) -> dict:
    """Update a structured policy in both MongoDB and the config file."""
    body["policy_id"] = policy_id
    body.pop("_id", None)

    db = await get_db()
    if db is not None:
        await db["nva_policies"].update_one(
            {"policy_id": policy_id},
            {"$set": body},
            upsert=True,
        )

    # Also persist to config file so it survives restarts
    try:
        policies: list[dict] = json.loads(_POLICIES_JSON.read_text())
        idx = next((i for i, p in enumerate(policies) if p.get("policy_id") == policy_id), None)
        if idx is not None:
            policies[idx] = body
        else:
            policies.append(body)
        _POLICIES_JSON.write_text(json.dumps(policies, indent=2))
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Could not persist policy to file: %s", exc)

    return body


@router.post("/policies")
async def create_structured_policy(
    body: dict, _: dict = Depends(require_admin)
) -> dict:
    """Create a new structured policy."""
    if not body.get("policy_id"):
        body["policy_id"] = f"POL-{str(uuid.uuid4())[:6].upper()}"
    body.pop("_id", None)

    db = await get_db()
    if db is not None:
        await db["nva_policies"].update_one(
            {"policy_id": body["policy_id"]},
            {"$setOnInsert": body},
            upsert=True,
        )

    try:
        policies: list[dict] = json.loads(_POLICIES_JSON.read_text())
        policies.append(body)
        _POLICIES_JSON.write_text(json.dumps(policies, indent=2))
    except Exception:
        pass

    return body


@router.delete("/policies/{policy_id}")
async def delete_structured_policy(policy_id: str, _: dict = Depends(require_admin)) -> dict:
    """Delete a structured policy."""
    db = await get_db()
    if db is not None:
        await db["nva_policies"].delete_one({"policy_id": policy_id})

    try:
        policies: list[dict] = json.loads(_POLICIES_JSON.read_text())
        policies = [p for p in policies if p.get("policy_id") != policy_id]
        _POLICIES_JSON.write_text(json.dumps(policies, indent=2))
    except Exception:
        pass

    return {"deleted": policy_id}


# ── Policy document ingestion (RAG) ──────────────────────────────────────────

@router.get("/policy-documents")
async def list_policy_documents(_: dict = Depends(require_admin)) -> list[dict]:
    db = await get_db()
    if db is None:
        return []
    cursor = db["nva_policies"].find({}, {"_id": 0}, sort=[("uploaded_at", -1)])
    return await cursor.to_list(length=100)


@router.post("/policy-documents")
async def upload_policy_document(
    file: UploadFile = File(...),
    _: dict = Depends(require_admin),
) -> dict:
    raw = await file.read()
    filename = file.filename or "policy"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    doc: dict = {
        "doc_id": str(uuid.uuid4()),
        "name": filename,
        "format": ext,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }

    if ext == "json":
        try:
            parsed = json.loads(raw.decode())
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON file")
        if isinstance(parsed, list):
            # List of policy objects — insert each as separate doc
            db = await get_db()
            if db is not None:
                for item in parsed:
                    item["doc_id"] = str(uuid.uuid4())
                    item["name"] = filename
                    item["format"] = "json"
                    item["uploaded_at"] = doc["uploaded_at"]
                    await db["nva_policies"].insert_one(item)
                    item.pop("_id", None)
            return {"inserted": len(parsed), "format": "json"}
        else:
            doc.update(parsed)
    elif ext == "csv":
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
        rows = list(reader)
        doc["content"] = json.dumps(rows, indent=2)
        doc["applies_to"] = "all"
        doc["rag_rows"] = rows
    else:
        # MD or plain text — store as freeform content for LLM context
        doc["content"] = raw.decode("utf-8", errors="replace")
        doc["applies_to"] = "all"

    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    await db["nva_policies"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/policy-documents/{doc_id}")
async def delete_policy_document(doc_id: str, _: dict = Depends(require_admin)) -> dict:
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    result = await db["nva_policies"].delete_one({"doc_id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": doc_id}


# ── Mock data grids ───────────────────────────────────────────────────────────

_AMADEUS_MCP_URL = "http://amadeus-mcp:8101"
_DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def _load_json(filename: str) -> list[dict]:
    p = _DATA_DIR / filename
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text())
    except Exception:
        return []

_CAR_AGENCIES = ["Hertz", "Avis", "Enterprise", "Budget", "National", "Europcar"]
_CAR_CLASSES = [
    ("Economy", 1.0), ("Compact", 1.2), ("Mid-size", 1.45),
    ("Full-size", 1.7), ("SUV", 2.1), ("Luxury", 3.2), ("Limousine", 5.5),
]

_ROOM_TYPES = [
    ("Standard Room",   1.00, 1),
    ("Double Bed",      1.12, 2),
    ("Executive Suite", 1.45, 4),
]
_CAR_BASE_RATES: dict[str, float] = {
    "SFO": 45, "JFK": 52, "LAX": 41, "ORD": 38, "DFW": 35, "MIA": 43,
    "SEA": 40, "BOS": 48, "ATL": 36, "DEN": 39, "LHR": 58, "CDG": 62,
    "NRT": 65, "DXB": 55, "SYD": 60, "SIN": 57, "HKG": 63, "AMS": 59,
    "FRA": 61, "ZRH": 70,
}


@router.get("/mock-data/flights")
async def get_mock_flights(
    origin: str = Query("SFO"),
    destination: str = Query("NRT"),
    date: str = Query(""),
    cabin: str = Query("All"),
    limit: int = Query(100, ge=1, le=500),
    _: dict = Depends(require_admin),
) -> list[dict]:
    rows = _load_json("mock_flights.json")
    if not rows:
        # fallback: live Amadeus MCP
        cabins = ["Economy", "Business"] if cabin == "All" else [cabin]
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                responses = await asyncio.gather(*[
                    client.post(f"{_AMADEUS_MCP_URL}/tools/search_flights",
                                json={"origin": origin, "destination": destination,
                                      "depart_date": date or "2026-08-01", "cabin_class": c})
                    for c in cabins
                ])
            results: list[dict] = []
            for r in responses:
                results.extend(r.json().get("flights", []))
            return results[:limit]
        except Exception:
            return []

    if origin and origin != "ALL":
        rows = [r for r in rows if r.get("origin","").upper() == origin.upper()]
    if destination and destination != "ALL":
        rows = [r for r in rows if r.get("destination","").upper() == destination.upper()]
    if date:
        rows = [r for r in rows if r.get("depart_date","").startswith(date[:7])]  # month match
    if cabin and cabin != "All":
        rows = [r for r in rows if r.get("cabin_class","").lower() == cabin.lower()]
    rows.sort(key=lambda x: x.get("price_usd", 0))
    return rows[:limit]


@router.get("/mock-data/hotels")
async def get_mock_hotels(
    city: str = Query("NRT"),
    check_in: str = Query(""),
    check_out: str = Query(""),
    room_type: str = Query("All"),
    limit: int = Query(100, ge=1, le=500),
    _: dict = Depends(require_admin),
) -> list[dict]:
    rows = _load_json("mock_hotels.json")
    if not rows:
        # fallback: live Amadeus MCP + room expansion
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(f"{_AMADEUS_MCP_URL}/tools/search_hotels",
                                         json={"city_code": city, "check_in": check_in or "2026-08-01",
                                               "check_out": check_out or "2026-08-04"})
                hotels = resp.json().get("hotels", [])
        except Exception:
            return []
        expanded: list[dict] = []
        for h in hotels:
            stars = int(str(h.get("rating", "3-star"))[0])
            for rn, mult, min_s in _ROOM_TYPES:
                if stars >= min_s:
                    expanded.append({**h, "room_type": rn,
                                     "nightly_rate_usd": round(float(h["nightly_rate_usd"]) * mult, 2)})
        expanded.sort(key=lambda x: x["nightly_rate_usd"])
        return expanded[:limit]

    if city and city.upper() != "ALL":
        rows = [r for r in rows if r.get("city","").upper() == city.upper()]
    if check_in:
        rows = [r for r in rows if r.get("check_in","").startswith(check_in[:7])]
    if room_type and room_type != "All":
        rows = [r for r in rows if r.get("room_type","") == room_type]
    rows.sort(key=lambda x: x.get("nightly_rate_usd", 0))
    return rows[:limit]


@router.get("/mock-data/cars")
async def get_mock_cars(
    city: str = Query("SFO"),
    pickup_date: str = Query(""),
    vehicle_class: str = Query("All"),
    limit: int = Query(100, ge=1, le=500),
    _: dict = Depends(require_admin),
) -> list[dict]:
    rows = _load_json("mock_cars.json")
    if not rows:
        # fallback: in-memory generation
        base = _CAR_BASE_RATES.get(city.upper(), 45.0)
        rand = random.Random(f"{city.upper()}{pickup_date}")
        results = []
        seq = 1
        for agency in _CAR_AGENCIES:
            for cls_name, mult in _CAR_CLASSES:
                daily = round(base * mult * rand.uniform(0.85, 1.15), 2)
                results.append({"id": f"C{seq}", "agency": agency, "vehicle_class": cls_name,
                                 "city": city.upper(), "location": f"{city.upper()} Airport",
                                 "pickup_date": pickup_date or "2026-08-01",
                                 "return_date": pickup_date or "2026-08-04",
                                 "daily_rate_usd": daily, "available": True})
                seq += 1
        results.sort(key=lambda x: x["daily_rate_usd"])
        return results[:limit]

    if city and city.upper() != "ALL":
        rows = [r for r in rows if r.get("city","").upper() == city.upper()]
    if pickup_date:
        rows = [r for r in rows if r.get("pickup_date","").startswith(pickup_date[:7])]
    if vehicle_class and vehicle_class != "All":
        rows = [r for r in rows if r.get("vehicle_class","") == vehicle_class]
    rows.sort(key=lambda x: x.get("daily_rate_usd", 0))
    return rows[:limit]


# ── MCP Bindings ──────────────────────────────────────────────────────────────

_AGENT_META: dict[str, dict] = {
    "orchestrator": {"label": "Orchestrator",   "color": "#1E3A5F"},
    "search":        {"label": "Search Agent",   "color": "#3b82f6"},
    "policy":        {"label": "Policy Agent",   "color": "#f59e0b"},
    "destination":   {"label": "Destination",    "color": "#10b981"},
    "booking":       {"label": "Booking Agent",  "color": "#8b5cf6"},
    "judge":         {"label": "Judge Agent",    "color": "#06b6d4"},
}


@router.get("/mcp-bindings")
async def get_mcp_bindings(_: dict = Depends(require_admin)) -> dict:
    """Return MCP server status + per-agent tool bindings from agents.json."""
    cfg = get_full_config()
    mcp_servers_cfg: dict = cfg.get("mcp_servers", {})

    # ── Probe each MCP server ────────────────────────────────────────────────
    servers: list[dict] = []
    tool_schemas: dict[str, list[dict]] = {}  # server_id → tool list

    async with httpx.AsyncClient(timeout=5.0) as client:
        for srv_id, srv_cfg in mcp_servers_cfg.items():
            health_url = srv_cfg.get("health_url", "")
            tools_url  = srv_cfg.get("tools_url", "")
            status_info: dict = {"status": "unknown", "version": "?", "latency_ms": 0}
            tools: list[dict] = []

            # Health check (timed for latency display)
            try:
                import time as _time
                _t0 = _time.monotonic()
                r = await client.get(health_url)
                latency_ms = int((_time.monotonic() - _t0) * 1000)
                health = r.json()
                status_info = {
                    "status":       "connected",
                    "latency_ms":   latency_ms,
                    "version":      health.get("version", "?"),
                    "amadeus_live": health.get("amadeus_live", False),
                    "static_data":  health.get("static_data", {}),
                }
            except Exception as exc:
                status_info = {"status": "error", "latency_ms": 0, "error": str(exc)}

            # Tool schemas
            try:
                r = await client.get(tools_url)
                tools = r.json().get("tools", [])
            except Exception:
                tools = []

            tool_schemas[srv_id] = tools
            servers.append({
                "id":          srv_id,
                "label":       srv_cfg.get("label", srv_id),
                "url":         srv_cfg.get("url", ""),
                "transport":   srv_cfg.get("transport", "streamable-http"),
                "description": srv_cfg.get("description", ""),
                **status_info,
                "tools": tools,
            })

    # ── Build per-agent binding entries ──────────────────────────────────────
    agent_names = [k for k in cfg if k != "mcp_servers"]
    agents: list[dict] = []
    for name in agent_names:
        agent_cfg = cfg[name]
        meta = _AGENT_META.get(name, {"label": name.title(), "color": "#6b7280"})
        bound_server_ids: list[str] = agent_cfg.get("mcp_servers", [])
        bound_tools: list[str] = agent_cfg.get("mcp_tools", [])
        mcp_access: str = agent_cfg.get("mcp_access", "none")
        mcp_role: str = agent_cfg.get("mcp_role", "")

        # Resolve full tool schemas for this agent's bound tools
        resolved_tools: list[dict] = []
        for srv_id in bound_server_ids:
            for t in tool_schemas.get(srv_id, []):
                if t["name"] in bound_tools:
                    resolved_tools.append({**t, "server": srv_id})

        agents.append({
            "name":         name,
            "label":        meta["label"],
            "color":        meta["color"],
            "mcp_servers":  bound_server_ids,
            "mcp_tools":    bound_tools,
            "mcp_access":   mcp_access,
            "mcp_role":     mcp_role,
            "resolved_tools": resolved_tools,
        })

    return {"servers": servers, "agents": agents}
