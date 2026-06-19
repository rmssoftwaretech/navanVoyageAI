"""MongoDB response cache — SHA-256 keyed per (user, message)."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any


def get_key(message: str, user: str) -> str:
    normalized = " ".join(message.strip().lower().split())
    return hashlib.sha256(f"{user}|{normalized}".encode()).hexdigest()[:32]


async def get_cached_response(db: Any, message: str, user: str) -> dict | None:
    if db is None:
        return None
    key = get_key(message, user)
    doc = await db["nva_response_cache"].find_one({"cache_key": key}, {"_id": 0})
    if doc:
        await db["nva_response_cache"].update_one(
            {"cache_key": key},
            {"$inc": {"hit_count": 1}, "$set": {"last_hit": datetime.now(timezone.utc).isoformat()}},
        )
    return doc


async def store_response(db: Any, message: str, user: str, content: str) -> str:
    key = get_key(message, user)
    if db is None:
        return key
    now = datetime.now(timezone.utc).isoformat()
    await db["nva_response_cache"].replace_one(
        {"cache_key": key},
        {
            "_id": key,
            "cache_key": key,
            "message_preview": message[:300],
            "user": user,
            "content": content,
            "created_at": now,
            "last_hit": now,
            "hit_count": 0,
        },
        upsert=True,
    )
    return key


async def delete_response(db: Any, cache_key: str) -> bool:
    if db is None:
        return False
    result = await db["nva_response_cache"].delete_one({"cache_key": cache_key})
    return result.deleted_count > 0
