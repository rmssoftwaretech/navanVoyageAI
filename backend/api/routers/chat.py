"""Chat router — conversations + SSE streaming."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.api.routers.auth import get_current_user
from backend.application.agent.orchestrator import OrchestratorAgent
from backend.db.mongo import get_db

router = APIRouter(prefix="/chat", tags=["chat"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SendRequest(BaseModel):
    conversation_id: str
    content: str


# ── Conversations ─────────────────────────────────────────────────────────────

@router.post("/conversations", status_code=status.HTTP_201_CREATED)
async def create_conversation(user: dict = Depends(get_current_user)) -> dict:
    db = await get_db()
    conv = {
        "conversation_id": str(uuid.uuid4()),
        "user": user["username"],
        "title": "New conversation",
        "turns": [],
        "turns_count": 0,
        "session_context": {},
        "created_at": _now(),
        "updated_at": _now(),
    }
    if db is not None:
        await db["nva_conversations"].insert_one({**conv, "_id": conv["conversation_id"]})
    return conv


@router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)) -> list[dict]:
    db = await get_db()
    if db is None:
        return []
    cursor = db["nva_conversations"].find(
        {"user": user["username"]},
        {"_id": 0, "turns": 0},
        sort=[("updated_at", -1)],
        limit=50,
    )
    return await cursor.to_list(length=50)


@router.get("/conversations/{conversation_id}/turns")
async def get_turns(conversation_id: str, user: dict = Depends(get_current_user)) -> list[dict]:
    db = await get_db()
    if db is None:
        return []
    doc = await db["nva_conversations"].find_one(
        {"conversation_id": conversation_id, "user": user["username"]},
        {"turns": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return doc.get("turns", [])


# ── Streaming send ─────────────────────────────────────────────────────────────

@router.post("/send")
async def send_message(
    body: SendRequest,
    user: dict = Depends(get_current_user),
) -> StreamingResponse:
    db = await get_db()

    # Verify ownership
    if db is not None:
        doc = await db["nva_conversations"].find_one(
            {"conversation_id": body.conversation_id, "user": user["username"]}
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user turn
    user_turn = {"role": "user", "content": body.content, "timestamp": _now()}
    if db is not None:
        await db["nva_conversations"].update_one(
            {"conversation_id": body.conversation_id},
            {
                "$push": {"turns": user_turn},
                "$inc": {"turns_count": 1},
                "$set": {"updated_at": _now()},
            },
        )

    return StreamingResponse(
        OrchestratorAgent().stream(body.conversation_id, body.content, user["username"], db),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
