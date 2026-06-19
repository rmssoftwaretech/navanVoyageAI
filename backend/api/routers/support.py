"""Support chat router — streaming SupportAgent for travellers and admins."""
from __future__ import annotations

import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.api.routers.auth import get_current_user
from backend.application.agent.base import _azure_client, get_prompt
from backend.pipeline.streaming import sse

log = logging.getLogger(__name__)
router = APIRouter(prefix="/support", tags=["support"])

SUPPORT_PROMPT = """You are the navanVoyageAI support assistant — a friendly expert on the platform.

You help corporate travellers and admins with:
- How to search for flights (origin, destination, date, cabin class)
- Understanding the corporate travel policy engine and compliance verdicts
- Booking reference numbers (NVA-YYYY-NNNNN format)
- Using the Admin Panel: Model Selection, Agent Prompts, Policy documents, Audit Log, Billing, Eval Metrics, Observability, Chat History, Notifications
- MCP Inspector Panel: Console, AgentEvents, Network, Perf, Tools, Tokens, Eval, Connect tabs
- Debug Mode and performance metrics in chat
- Tree of Thought reasoning for complex queries
- Setting travel context via the sidebar panel
- General platform navigation

Be concise, accurate, and practical. Use markdown for structure.
If you don't know something, say so clearly rather than guessing.
"""


class SupportRequest(BaseModel):
    message: str
    session_id: str | None = None
    is_admin: bool = False


async def _stream_support(message: str, is_admin: bool) -> AsyncGenerator[str, None]:
    client = _azure_client()
    from backend.application.agent.registry import get_agent_config
    cfg = get_agent_config("orchestrator")

    import os
    deployment = cfg.get("deployment", os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o"))

    system_prompt = SUPPORT_PROMPT
    if is_admin:
        system_prompt += "\n\nYou are currently assisting an ADMIN user — you can discuss admin-only features in detail."

    try:
        stream = await client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message},
            ],
            stream=True,
            temperature=0.4,
            max_tokens=1024,
        )
        assembled = ""
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                assembled += delta
                yield sse({"type": "token", "data": delta})
        yield sse({"type": "done", "content": assembled})
    except Exception as exc:
        log.warning("SupportAgent stream failed: %s", exc)
        yield sse({"type": "error", "message": str(exc)})


@router.post("/chat")
async def support_chat(
    body: SupportRequest,
    _user: dict = Depends(get_current_user),
) -> StreamingResponse:
    async def generator():
        async for chunk in _stream_support(body.message, body.is_admin):
            yield chunk

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
