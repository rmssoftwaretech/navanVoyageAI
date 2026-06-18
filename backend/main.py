"""navanVoyageAI — FastAPI application entry point."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.main import api_router
from backend.db.indexes import create_indexes
from backend.db.mongo import close_db, get_db
from backend.db.seed import seed_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = await get_db()
    if db is not None:
        await create_indexes(db)
        await seed_db(db)
    yield
    close_db()


app = FastAPI(title="navanVoyageAI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
