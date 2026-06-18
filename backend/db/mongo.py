"""Async MongoDB client for navanVoyageAI.

Mirrors EDA backend/db/client.py pattern but uses Motor (async) instead of pymongo.
Connection: mongodb+srv via geminirag.saslfno.mongodb.net / navanVoyageAI DB.
"""
from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote_plus

_motor_client_cache: Any = None


def _build_uri() -> str:
    host = os.getenv("MONGODB_HOST", "")
    user = os.getenv("MONGODB_USERNAME", "")
    pwd = os.getenv("MONGODB_PASSWORD", "")
    if user and pwd:
        return f"mongodb+srv://{quote_plus(user)}:{quote_plus(pwd)}@{host}/"
    return f"mongodb+srv://{host}/"


async def get_db() -> Any:
    """Return a Motor AsyncIOMotorDatabase, or None when MONGODB_HOST is unset."""
    global _motor_client_cache
    if not os.getenv("MONGODB_HOST"):
        return None
    try:
        if _motor_client_cache is None:
            from motor.motor_asyncio import AsyncIOMotorClient  # noqa: PLC0415
            try:
                import certifi  # noqa: PLC0415
                tls_kwargs: dict = {"tlsCAFile": certifi.where()}
            except ImportError:
                tls_kwargs = {}
            _motor_client_cache = AsyncIOMotorClient(
                _build_uri(),
                serverSelectionTimeoutMS=5000,
                **tls_kwargs,
            )
        db_name = os.getenv("MONGODB_DB", "navanVoyageAI")
        return _motor_client_cache[db_name]
    except Exception:
        return None


def close_db() -> None:
    """Close the Motor client (called on app shutdown)."""
    global _motor_client_cache
    if _motor_client_cache is not None:
        _motor_client_cache.close()
        _motor_client_cache = None
