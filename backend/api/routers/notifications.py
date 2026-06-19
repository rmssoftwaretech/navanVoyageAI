"""Notifications router — CRUD for in-app notifications."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend.api.routers.auth import get_current_user, require_admin
from backend.db.mongo import get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationCreate(BaseModel):
    type: str = "feature"
    title: str
    message: str
    severity: str = "info"
    target: str = "all"
    scheduled_at: str | None = None
    expires_at: str | None = None
    created_by: str | None = None


class NotificationUpdate(BaseModel):
    type: str | None = None
    title: str | None = None
    message: str | None = None
    severity: str | None = None
    target: str | None = None
    scheduled_at: str | None = None
    expires_at: str | None = None
    is_active: bool | None = None


def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_notifications(
    active_only: bool = Query(False),
    include_expired: bool = Query(True),
    limit: int = Query(100, ge=1, le=500),
    user: dict = Depends(get_current_user),
) -> list[dict]:
    db = await get_db()
    if db is None:
        return []
    filt: dict[str, Any] = {}
    if active_only:
        filt["is_active"] = True
    now_iso = datetime.now(timezone.utc).isoformat()
    if not include_expired:
        filt["$or"] = [{"expires_at": None}, {"expires_at": {"$gt": now_iso}}]
    # Travellers only see notifications targeted at "all" or their username
    username = user.get("username", "")
    if user.get("role") != "admin":
        filt["$or"] = filt.get("$or", []) + [{"target": "all"}, {"target": username}]
    cursor = db["nva_notifications"].find(filt, {"_id": 0}, sort=[("created_at", -1)], limit=limit)
    return await cursor.to_list(length=limit)


@router.get("/stats")
async def notification_stats(_: dict = Depends(require_admin)) -> dict:
    db = await get_db()
    if db is None:
        return {"total": 0, "active": 0, "by_type": {}, "by_severity": {}, "total_dismissals": 0}
    all_docs = await db["nva_notifications"].find({}, {"_id": 0}).to_list(length=1000)
    by_type: dict[str, int] = {}
    by_sev: dict[str, int] = {}
    active = 0
    for d in all_docs:
        t = d.get("type", "feature")
        s = d.get("severity", "info")
        by_type[t] = by_type.get(t, 0) + 1
        by_sev[s] = by_sev.get(s, 0) + 1
        if d.get("is_active"):
            active += 1
    return {
        "total": len(all_docs),
        "active": active,
        "by_type": by_type,
        "by_severity": by_sev,
        "total_dismissals": 0,
    }


@router.post("")
async def create_notification(
    body: NotificationCreate,
    _: dict = Depends(require_admin),
) -> dict:
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    doc = {
        "id": str(uuid.uuid4()),
        "type": body.type,
        "title": body.title,
        "message": body.message,
        "severity": body.severity,
        "target": body.target or "all",
        "scheduled_at": body.scheduled_at or None,
        "expires_at": body.expires_at or None,
        "created_by": body.created_by or None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db["nva_notifications"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/{notif_id}")
async def update_notification(
    notif_id: str,
    body: NotificationUpdate,
    _: dict = Depends(require_admin),
) -> dict:
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db["nva_notifications"].find_one_and_update(
        {"id": notif_id},
        {"$set": patch},
        return_document=True,
        projection={"_id": 0},
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return result


@router.delete("/{notif_id}")
async def delete_notification(notif_id: str, _: dict = Depends(require_admin)) -> dict:
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    result = await db["nva_notifications"].delete_one({"id": notif_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"deleted": notif_id}
