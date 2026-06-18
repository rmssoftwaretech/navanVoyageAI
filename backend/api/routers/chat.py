"""Chat router — conversations + SSE streaming."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.api.routers.auth import get_current_user
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
        _stream(body.conversation_id, body.content, user["username"], db),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _stream(
    conversation_id: str,
    content: str,
    username: str,
    db,
) -> AsyncGenerator[str, None]:
    """SSE generator — stub until NVA-09 wires the OrchestratorAgent."""

    def sse(event: dict) -> str:
        return f"data: {json.dumps(event)}\n\n"

    yield sse({"type": "agent_start", "agent": "orchestrator"})

    # Stub response — replaced by real agent in NVA-09
    stub = (
        "I'm navanVoyageAI, your corporate travel assistant. "
        "The multi-agent backend is being wired up (NVA-09). "
        "In the meantime, I can confirm your message was received: "
        f'"{content}"'
    )

    # Stream token by token (word-level for demo feel)
    for word in stub.split(" "):
        yield sse({"type": "token", "data": word + " "})

    # Save assistant turn
    ai_turn = {
        "role": "assistant",
        "content": stub,
        "timestamp": _now(),
        "agents": ["orchestrator"],
    }
    if db is not None:
        await db["nva_conversations"].update_one(
            {"conversation_id": conversation_id},
            {
                "$push": {"turns": ai_turn},
                "$inc": {"turns_count": 1},
                "$set": {"updated_at": _now(), "title": content[:60]},
            },
        )

    yield sse({"type": "agent_done", "agent": "orchestrator"})
    yield sse({"type": "done"})
