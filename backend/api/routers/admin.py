"""Admin router — model config hot-reload and admin-only endpoints."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Depends

from backend.api.routers.auth import require_admin
from backend.application.agent.registry import get_full_config, reload_agent_config

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
