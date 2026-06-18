"""FastAPI router registration for navanVoyageAI."""
from fastapi import APIRouter

from backend.api.routers.admin import router as admin_router
from backend.api.routers.auth import router as auth_router
from backend.api.routers.chat import router as chat_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(admin_router)


@api_router.get("/health")
async def health() -> dict:
    return {"status": "ok", "app": "navanVoyageAI"}
