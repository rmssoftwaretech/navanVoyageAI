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
    custom_context: str | None = None


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
        OrchestratorAgent().stream(body.conversation_id, body.content, user["username"], db, custom_context=body.custom_context),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class BookingPassenger(BaseModel):
    first_name: str
    last_name: str
    dob: str
    passport_number: str
    nationality: str | None = None
    passport_expiry: str | None = None
    email: str


class BookingRequest(BaseModel):
    flight_id: str
    flight_number: str | None = None
    origin: str | None = None
    destination: str | None = None
    depart_date: str | None = None
    cabin_class: str | None = None
    price_usd: float | None = None
    passenger: BookingPassenger
    seat_preference: str = "no_preference"
    meal_preference: str = "standard"
    special_assistance: str | None = None


class FeedbackRequest(BaseModel):
    conversation_id: str
    turn_index: int
    rating: str          # "up" | "down" | "flag"
    comment: str | None = None


class RenameRequest(BaseModel):
    title: str


class ReactionRequest(BaseModel):
    emoji: str


class StarRequest(BaseModel):
    starred: bool


@router.patch("/conversations/{conversation_id}")
async def rename_conversation(
    conversation_id: str,
    body: RenameRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    result = await db["nva_conversations"].update_one(
        {"conversation_id": conversation_id, "user": user["username"]},
        {"$set": {"title": body.title.strip()[:80], "updated_at": _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"conversation_id": conversation_id, "title": body.title.strip()[:80]}


@router.post("/conversations/{conversation_id}/turns/{turn_idx}/react")
async def react_to_turn(
    conversation_id: str,
    turn_idx: int,
    body: ReactionRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    field = f"turns.{turn_idx}.reactions.{body.emoji}"
    await db["nva_conversations"].update_one(
        {"conversation_id": conversation_id, "user": user["username"]},
        {"$inc": {field: 1}},
    )
    return {"status": "ok", "emoji": body.emoji}


@router.patch("/conversations/{conversation_id}/turns/{turn_idx}/star")
async def star_turn(
    conversation_id: str,
    turn_idx: int,
    body: StarRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    field = f"turns.{turn_idx}.starred"
    update: dict = {"$set": {field: body.starred, "updated_at": _now()}}
    if body.starred:
        update["$set"]["has_starred"] = True
    await db["nva_conversations"].update_one(
        {"conversation_id": conversation_id, "user": user["username"]},
        update,
    )
    return {"status": "ok", "starred": body.starred}


@router.post("/conversations/{conversation_id}/share")
async def share_conversation(
    conversation_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    doc = await db["nva_conversations"].find_one(
        {"conversation_id": conversation_id, "user": user["username"]}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
    token = str(uuid.uuid4()).replace("-", "")[:12]
    share_doc = {
        "token": token,
        "conversation_id": conversation_id,
        "shared_by": user["username"],
        "title": doc.get("title", "Shared conversation"),
        "turns": doc.get("turns", []),
        "created_at": _now(),
    }
    await db["nva_shares"].replace_one(
        {"conversation_id": conversation_id},
        {**share_doc, "_id": token},
        upsert=True,
    )
    return {"token": token, "url": f"/share/{token}"}


@router.get("/share/{token}")
async def get_shared_conversation(token: str) -> dict:
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    doc = await db["nva_shares"].find_one({"token": token}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Share not found")
    return doc


@router.delete("/cache/{cache_key}")
async def delete_cache_entry(
    cache_key: str,
    user: dict = Depends(get_current_user),
) -> dict:
    db = await get_db()
    try:
        from backend.db.response_cache import delete_response  # noqa: PLC0415
        deleted = await delete_response(db, cache_key)
    except Exception:
        deleted = False
    return {"deleted": deleted, "cache_key": cache_key}


@router.post("/feedback", status_code=201)
async def submit_feedback(
    body: FeedbackRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    db = await get_db()
    record = {
        "feedback_id": str(uuid.uuid4()),
        "conversation_id": body.conversation_id,
        "turn_index": body.turn_index,
        "user": user["username"],
        "rating": body.rating,
        "comment": body.comment,
        "timestamp": _now(),
    }
    if db is not None:
        await db["nva_feedback"].insert_one({**record, "_id": record["feedback_id"]})
    return {"status": "ok", "feedback_id": record["feedback_id"]}


# ── Structured bookings ───────────────────────────────────────────────────────

def _next_booking_seq_sync() -> int:
    import random
    return random.randint(1, 99999)


@router.post("/bookings", status_code=201)
async def create_booking(
    body: BookingRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    year = datetime.now(timezone.utc).year
    db = await get_db()

    seq = 1
    if db is not None:
        try:
            count = await db["nva_bookings"].count_documents({"booking_year": year})
            seq = count + 1
        except Exception:
            seq = _next_booking_seq_sync()

    reference = f"NVA-{year}-{seq:05d}"
    booking_id = str(uuid.uuid4())
    now = _now()

    doc = {
        "booking_id": booking_id,
        "reference": reference,
        "status": "confirmed",
        "user": user["username"],
        "booking_year": year,
        "flight_id": body.flight_id,
        "flight_number": body.flight_number,
        "origin": body.origin,
        "destination": body.destination,
        "depart_date": body.depart_date,
        "cabin_class": body.cabin_class,
        "price_usd": body.price_usd,
        "passenger": body.passenger.model_dump(),
        "seat_preference": body.seat_preference,
        "meal_preference": body.meal_preference,
        "special_assistance": body.special_assistance or "",
        "created_at": now,
    }

    if db is not None:
        try:
            await db["nva_bookings"].insert_one({**doc, "_id": booking_id})
        except Exception:
            pass

    return {
        "booking_id": booking_id,
        "reference": reference,
        "status": "confirmed",
        "created_at": now,
    }


@router.get("/bookings/{booking_id}")
async def get_booking(
    booking_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    db = await get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="DB unavailable")
    doc = await db["nva_bookings"].find_one({"booking_id": booking_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    if doc.get("user") != user["username"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return doc
