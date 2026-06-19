"""MCP proxy endpoints — connect, call-tool, read-resource, get-prompt."""
from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter
from fastmcp import Client
from pydantic import BaseModel

router = APIRouter(prefix="/mcp", tags=["mcp"])

# Within the Docker network the Amadeus MCP service is reachable by its compose
# service name.  When the frontend sends the "public" localhost URL, rewrite it
# to the internal hostname so the backend container can reach it.
_URL_REWRITES = {
    "http://localhost:8101":   "http://amadeus-mcp:8101",
    "http://127.0.0.1:8101":  "http://amadeus-mcp:8101",
    "http://localhost:8102":   "http://car-rental-mcp:8102",
    "http://127.0.0.1:8102":  "http://car-rental-mcp:8102",
    "http://localhost:8103":   "http://hotel-booking-mcp:8103",
    "http://127.0.0.1:8103":  "http://hotel-booking-mcp:8103",
}


def _resolve(url: str) -> str:
    for pub, internal in _URL_REWRITES.items():
        if url.startswith(pub):
            return internal + url[len(pub):]
    return url


class ConnectRequest(BaseModel):
    url: str


class CallToolRequest(BaseModel):
    url: str
    tool: str
    arguments: dict[str, Any] = {}


class ReadResourceRequest(BaseModel):
    url: str
    uri: str


class GetPromptRequest(BaseModel):
    url: str
    prompt: str
    arguments: dict[str, Any] = {}


def _tool_to_dict(t: Any) -> dict:
    return {
        "name": t.name,
        "description": t.description or "",
        "inputSchema": t.inputSchema if hasattr(t, "inputSchema") else getattr(t, "input_schema", None),
    }


def _resource_to_dict(r: Any) -> dict:
    return {
        "uri": str(r.uri),
        "name": r.name,
        "description": getattr(r, "description", "") or "",
        "mimeType": getattr(r, "mimeType", None),
    }


def _template_to_dict(t: Any) -> dict:
    return {
        "uriTemplate": str(t.uriTemplate),
        "name": t.name,
        "description": getattr(t, "description", "") or "",
        "mimeType": getattr(t, "mimeType", None),
    }


def _prompt_to_dict(p: Any) -> dict:
    args = getattr(p, "arguments", None) or []
    return {
        "name": p.name,
        "description": getattr(p, "description", "") or "",
        "arguments": [
            {
                "name": a.name,
                "description": getattr(a, "description", "") or "",
                "required": getattr(a, "required", False),
            }
            for a in args
        ],
    }


@router.post("/connect")
async def connect(req: ConnectRequest) -> dict:
    async with Client(_resolve(req.url)) as client:
        tools = await client.list_tools()
        resources = await client.list_resources()
        templates = await client.list_resource_templates()
        prompts = await client.list_prompts()
    return {
        "tools": [_tool_to_dict(t) for t in tools],
        "resources": [_resource_to_dict(r) for r in resources],
        "resource_templates": [_template_to_dict(t) for t in templates],
        "prompts": [_prompt_to_dict(p) for p in prompts],
    }


@router.post("/call-tool")
async def call_tool(req: CallToolRequest) -> dict:
    t0 = time.perf_counter()
    async with Client(_resolve(req.url)) as client:
        result = await client.call_tool(req.tool, req.arguments or None)
    duration_ms = round((time.perf_counter() - t0) * 1000)
    content = [
        c.model_dump() if hasattr(c, "model_dump") else vars(c)
        for c in (result.content if hasattr(result, "content") else [result])
    ]
    return {"result": content, "duration_ms": duration_ms}


@router.post("/read-resource")
async def read_resource(req: ReadResourceRequest) -> dict:
    t0 = time.perf_counter()
    async with Client(_resolve(req.url)) as client:
        contents = await client.read_resource(req.uri)
    duration_ms = round((time.perf_counter() - t0) * 1000)
    serialized = [
        c.model_dump() if hasattr(c, "model_dump") else vars(c)
        for c in contents
    ]
    return {"content": serialized, "duration_ms": duration_ms}


@router.post("/get-prompt")
async def get_prompt(req: GetPromptRequest) -> dict:
    t0 = time.perf_counter()
    async with Client(_resolve(req.url)) as client:
        result = await client.get_prompt(req.prompt, req.arguments or None)
    duration_ms = round((time.perf_counter() - t0) * 1000)
    messages = [
        m.model_dump() if hasattr(m, "model_dump") else vars(m)
        for m in (result.messages if hasattr(result, "messages") else [])
    ]
    return {"messages": messages, "duration_ms": duration_ms}
