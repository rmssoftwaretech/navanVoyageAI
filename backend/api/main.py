"""FastAPI router registration for navanVoyageAI."""
from fastapi import APIRouter

from backend.api.routers.auth import router as auth_router

api_router = APIRouter()
api_router.include_router(auth_router)


@api_router.get("/health")
async def health() -> dict:
    return {"status": "ok", "app": "navanVoyageAI"}
