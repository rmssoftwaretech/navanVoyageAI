"""Idempotent seed — policies + demo users. Safe to call on every startup."""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext

log = logging.getLogger(__name__)
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

_CONFIG = Path(__file__).parent.parent.parent / "config"


async def seed_db(db: AsyncIOMotorDatabase) -> None:
    await _seed_policies(db)
    await _seed_users(db)


async def _seed_policies(db: AsyncIOMotorDatabase) -> None:
    policies_file = _CONFIG / "policies.json"
    if not policies_file.exists():
        return
    policies = json.loads(policies_file.read_text())
    for policy in policies:
        await db["nva_policies"].update_one(
            {"policy_id": policy["policy_id"]},
            {"$setOnInsert": policy},
            upsert=True,
        )
    log.info("Seeded %d policies", len(policies))


async def _seed_users(db: AsyncIOMotorDatabase) -> None:
    users_file = _CONFIG / "users.json"
    if not users_file.exists():
        return
    users = json.loads(users_file.read_text())

    password_map = {
        "admin":     os.getenv("SEED_ADMIN_PASSWORD",     "admin123"),
        "traveller": os.getenv("SEED_TRAVELLER_PASSWORD", "travel123"),
    }

    for user in users:
        raw_pwd = password_map.get(user["username"], "changeme")
        doc = {**user, "password_hash": _pwd.hash(raw_pwd)}
        await db["nva_users"].update_one(
            {"username": user["username"]},
            {"$setOnInsert": doc},
            upsert=True,
        )
    log.info("Seeded %d users", len(users))
