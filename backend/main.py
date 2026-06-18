"""navanVoyageAI — FastAPI application entry point."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.main import api_router
from backend.db.mongo import close_db, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_db()
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
