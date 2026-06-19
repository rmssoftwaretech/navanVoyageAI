"""Create MongoDB indexes for all navanVoyageAI collections."""
from __future__ import annotations

import logging

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

log = logging.getLogger(__name__)


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    """Idempotent — safe to call on every startup."""
    try:
        # nva_conversations
        await db["nva_conversations"].create_index([("user", ASCENDING)])
        await db["nva_conversations"].create_index([("updated_at", DESCENDING)])
        await db["nva_conversations"].create_index(
            [("conversation_id", ASCENDING)], unique=True
        )

        # nva_audit_log
        await db["nva_audit_log"].create_index([("timestamp", DESCENDING)])
        await db["nva_audit_log"].create_index([("conversation_id", ASCENDING)])
        await db["nva_audit_log"].create_index([("user", ASCENDING)])
        await db["nva_audit_log"].create_index([("agent", ASCENDING)])

        # nva_eval_scores
        await db["nva_eval_scores"].create_index(
            [("conversation_id", ASCENDING), ("turn_index", ASCENDING)]
        )
        await db["nva_eval_scores"].create_index([("user", ASCENDING)])
        await db["nva_eval_scores"].create_index([("scored_at", DESCENDING)])
        await db["nva_eval_scores"].create_index([("passed", ASCENDING)])

        # nva_bookings
        await db["nva_bookings"].create_index([("user", ASCENDING)])
        await db["nva_bookings"].create_index([("booking_id", ASCENDING)], unique=True)
        await db["nva_bookings"].create_index([("conversation_id", ASCENDING)])
        await db["nva_bookings"].create_index([("created_at", DESCENDING)])

        # nva_policies
        await db["nva_policies"].create_index([("policy_id", ASCENDING)], unique=True)
        await db["nva_policies"].create_index([("applies_to", ASCENDING)])

        # nva_billing
        await db["nva_billing"].create_index([("date", DESCENDING)])
        await db["nva_billing"].create_index([("model", ASCENDING)])
        await db["nva_billing"].create_index([("agent", ASCENDING)])

        # nva_user_memory (NVA-19) — unique per user+category+fact combination
        await db["nva_user_memory"].create_index([("user", ASCENDING)])
        await db["nva_user_memory"].create_index(
            [("user", ASCENDING), ("category", ASCENDING), ("fact", ASCENDING)],
            unique=True,
        )

        log.info("MongoDB indexes created / verified for navanVoyageAI")
    except Exception as exc:
        log.warning("Index creation warning: %s", exc)
