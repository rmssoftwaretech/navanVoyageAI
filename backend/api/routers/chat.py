"""Chat router — conversations + SSE streaming."""
from __future__ import annotations

import os
import time
import uuid
from datetime import datetime, timezone

import httpx
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


@router.get("/conversations/{conversation_id}/eval")
async def get_conversation_eval(conversation_id: str, user: dict = Depends(get_current_user)) -> dict:
    db = await get_db()
    if db is None:
        return {}
    cursor = db["nva_eval_scores"].find(
        {"conversation_id": conversation_id},
        {"_id": 0},
        sort=[("timestamp", -1)],
        limit=1,
    )
    docs = await cursor.to_list(length=1)
    return docs[0] if docs else {}


@router.get("/mcp/info")
async def get_mcp_info(user: dict = Depends(get_current_user)) -> dict:
    sidecar = os.getenv("AMADEUS_MCP_URL", "http://localhost:8101")
    connected = False
    latency_ms = None
    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{sidecar}/health")
            latency_ms = int((time.monotonic() - t0) * 1000)
            connected = resp.status_code == 200
    except Exception:
        pass

    return {
        "server_url": sidecar,
        "connected": connected,
        "latency_ms": latency_ms,
        "server_info": {"name": "amadeus-mcp", "version": "1.0.0"},
        "protocol_version": "2024-11-05",
        "tools": [
            {
                "name": "search_flights",
                "description": "Search for flight offers via Amadeus API (real or mock fallback)",
                "inputSchema": {
                    "type": "object",
                    "required": ["origin", "destination", "depart_date"],
                    "properties": {
                        "origin": {"type": "string", "description": "IATA origin airport code (e.g. SFO)"},
                        "destination": {"type": "string", "description": "IATA destination airport code (e.g. NRT)"},
                        "depart_date": {"type": "string", "description": "Departure date YYYY-MM-DD"},
                        "return_date": {"type": "string", "description": "Return date YYYY-MM-DD (optional)"},
                        "cabin_class": {"type": "string", "enum": ["Economy", "Economy Plus", "Business", "First"]},
                        "adults": {"type": "integer", "default": 1},
                        "max_price": {"type": "number", "description": "Max price in USD"},
                    },
                },
            },
            {
                "name": "search_hotels",
                "description": "Search for hotel availability via Amadeus API (real or mock fallback)",
                "inputSchema": {
                    "type": "object",
                    "required": ["city_code", "check_in", "check_out"],
                    "properties": {
                        "city_code": {"type": "string", "description": "IATA city code (e.g. TYO)"},
                        "check_in": {"type": "string", "description": "Check-in date YYYY-MM-DD"},
                        "check_out": {"type": "string", "description": "Check-out date YYYY-MM-DD"},
                        "adults": {"type": "integer", "default": 1},
                        "max_rate": {"type": "number", "description": "Max nightly rate in USD"},
                    },
                },
            },
        ],
        "handshake": {
            "initialize_request": {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "navanVoyageAI-backend", "version": "1.0.0"},
                },
            },
            "initialize_response": {
                "jsonrpc": "2.0",
                "id": 1,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {"listChanged": False}},
                    "serverInfo": {"name": "amadeus-mcp", "version": "1.0.0"},
                },
            },
            "tools_list_request": {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list",
                "params": {},
            },
        },
    }


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
