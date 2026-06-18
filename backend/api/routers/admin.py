"""Admin router — model config, audit log, billing, eval scores."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends, Query

from backend.api.routers.auth import require_admin
from backend.application.agent.registry import get_full_config, reload_agent_config
from backend.db.mongo import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

_AGENTS_JSON = Path(__file__).parent.parent.parent.parent / "config" / "agents.json"


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
