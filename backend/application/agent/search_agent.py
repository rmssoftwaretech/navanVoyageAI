"""SearchAgent — calls Amadeus MCP sidecar for flight/hotel search."""
from __future__ import annotations

import logging
import os
import time

import httpx

from backend.application.agent.base import AgentContext, AgentResult, BaseAgent

log = logging.getLogger(__name__)

_SIDECAR = os.getenv("AMADEUS_MCP_URL", "http://localhost:8101")

_EXTRACT_PROMPT = """Extract travel search parameters from the user message and context.
Return ONLY valid JSON (no markdown):
{
  "origin": "IATA code or city or null",
  "destination": "IATA code or city or null",
  "depart_date": "YYYY-MM-DD or null",
  "return_date": "YYYY-MM-DD or null",
  "cabin_class": "Economy|Economy Plus|Business|First",
  "max_price": number or null,
  "adults": 1,
  "search_hotels": false,
  "city_code": "IATA city code for hotel search or null",
  "check_in": "YYYY-MM-DD or null",
  "check_out": "YYYY-MM-DD or null",
  "max_hotel_rate": number or null
}
Use session context to fill in missing values. Return null for unknown fields.
"""


class SearchAgent(BaseAgent):
    name = "search"

    async def run(self, context: AgentContext) -> AgentResult:
        # Extract search parameters via LLM
        params = await self._extract_params(context)
        mcp_events: list[dict] = []
        parts: list[str] = []

        # Flight search
        if params.get("origin") and params.get("destination") and params.get("depart_date"):
            flight_payload = {
                "origin": params["origin"],
                "destination": params["destination"],
                "depart_date": params["depart_date"],
                "return_date": params.get("return_date"),
                "cabin_class": params.get("cabin_class", "Economy"),
                "max_price": params.get("max_price"),
                "adults": params.get("adults", 1),
            }
            mcp_events.append({
                "type": "mcp_tool_call",
                "agent": "search",
                "tool": "search_flights",
                "input": flight_payload,
            })
            t0 = time.monotonic()
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(f"{_SIDECAR}/tools/search_flights", json=flight_payload)
                    data = resp.json()
                latency = int((time.monotonic() - t0) * 1000)
                flights = data.get("flights", [])
                mcp_events.append({
                    "type": "mcp_tool_result",
                    "agent": "search",
                    "tool": "search_flights",
                    "output": data,
                    "latency_ms": latency,
                })
                parts.append(_format_flights(flights, params.get("cabin_class", "Economy")))
            except Exception as exc:
                latency = int((time.monotonic() - t0) * 1000)
                mcp_events.append({
                    "type": "mcp_tool_result",
                    "agent": "search",
                    "tool": "search_flights",
                    "output": {"error": str(exc)},
                    "latency_ms": latency,
                })
                log.warning("Flight search failed: %s", exc)

        # Hotel search
        if params.get("search_hotels") and params.get("city_code") and params.get("check_in"):
            hotel_payload = {
                "city_code": params["city_code"],
                "check_in": params["check_in"],
                "check_out": params.get("check_out", params.get("depart_date", "")),
                "adults": params.get("adults", 1),
                "max_rate": params.get("max_hotel_rate"),
            }
            mcp_events.append({
                "type": "mcp_tool_call",
                "agent": "search",
                "tool": "search_hotels",
                "input": hotel_payload,
            })
            t0 = time.monotonic()
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(f"{_SIDECAR}/tools/search_hotels", json=hotel_payload)
                    data = resp.json()
                latency = int((time.monotonic() - t0) * 1000)
                hotels = data.get("hotels", [])
                mcp_events.append({
                    "type": "mcp_tool_result",
                    "agent": "search",
                    "tool": "search_hotels",
                    "output": data,
                    "latency_ms": latency,
                })
                parts.append(_format_hotels(hotels))
            except Exception as exc:
                latency = int((time.monotonic() - t0) * 1000)
                mcp_events.append({
                    "type": "mcp_tool_result",
                    "agent": "search",
                    "tool": "search_hotels",
                    "output": {"error": str(exc)},
                    "latency_ms": latency,
                })
                log.warning("Hotel search failed: %s", exc)

        content = "\n\n".join(parts) if parts else "No search results — could not extract origin/destination/date from the request."
        return AgentResult(
            agent="search",
            content=content,
            metadata={"mcp_events": mcp_events, "params": params},
        )

    async def _extract_params(self, context: AgentContext) -> dict:
        import json, re
        ents = context.session_context.get("entities", {})
        system = _EXTRACT_PROMPT
        user = f"Session entities: {json.dumps(ents)}\n\nUser message: {context.message}"
        try:
            raw = await self._chat(system, user)
            raw = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
            return json.loads(raw)
        except Exception as exc:
            log.warning("Parameter extraction failed: %s", exc)
            return {}


def _format_flights(flights: list[dict], cabin: str) -> str:
    if not flights:
        return "**Flight Search**\nNo flights found matching your criteria."
    lines = [f"**Flight Results** ({cabin})\n"]
    for f in flights[:5]:
        stops = "Non-stop" if f.get("stops", 0) == 0 else f"{f['stops']} stop(s)"
        lines.append(
            f"- **{f['carrier']} {f['flight_number']}** "
            f"{f['origin']} → {f['destination']}  "
            f"${f['price_usd']:.0f}  •  {stops}  •  {f.get('duration_minutes', '?')} min"
        )
    return "\n".join(lines)


def _format_hotels(hotels: list[dict]) -> str:
    if not hotels:
        return "**Hotel Search**\nNo hotels found matching your criteria."
    lines = [f"**Hotel Results**\n"]
    for h in hotels[:5]:
        lines.append(
            f"- **{h['name']}** ({h.get('rating', '?')})  "
            f"${h['nightly_rate_usd']:.0f}/night  •  {h['check_in']} → {h['check_out']}"
        )
    return "\n".join(lines)
