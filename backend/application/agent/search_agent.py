"""SearchAgent — calls the Travel MCP server via the FastMCP client."""
from __future__ import annotations

import json
import logging
import os
import time

from backend.application.agent.base import AgentContext, AgentResult, BaseAgent, get_prompt

log = logging.getLogger(__name__)

# MCP server URLs — each sidecar handles a different domain
_MCP_BASE = os.getenv("AMADEUS_MCP_URL", "http://localhost:8101")
_MCP_URL = _MCP_BASE.rstrip("/") + "/mcp"

_CAR_MCP_BASE = os.getenv("CAR_RENTAL_MCP_URL", "http://localhost:8102")
_CAR_MCP_URL = _CAR_MCP_BASE.rstrip("/") + "/mcp"

_HOTEL_MCP_BASE = os.getenv("HOTEL_BOOKING_MCP_URL", "http://localhost:8103")
_HOTEL_MCP_URL = _HOTEL_MCP_BASE.rstrip("/") + "/mcp"

_EXTRACT_PROMPT = """Extract travel search parameters from the user message and context.
Return ONLY valid JSON (no markdown):
{
  "origin": "IATA code or null",
  "destination": "IATA code or null",
  "depart_date": "YYYY-MM-DD or null",
  "return_date": "YYYY-MM-DD or null",
  "cabin_class": "Economy|Economy Plus|Business|First",
  "max_price": number or null,
  "adults": 1,
  "search_hotels": false,
  "city_code": "IATA city code for hotel search or null",
  "check_in": "YYYY-MM-DD or null",
  "check_out": "YYYY-MM-DD or null",
  "max_hotel_rate": number or null,
  "room_type": "Standard Room|Double Bed|Executive Suite or null",
  "search_cars": false,
  "car_city": "IATA city code for car rental or null",
  "car_pickup_date": "YYYY-MM-DD or null",
  "car_return_date": "YYYY-MM-DD or null",
  "vehicle_class": "Economy|Compact|Mid-size|Full-size|SUV|Luxury|Limousine or null",
  "max_daily_rate": number or null
}
Use session context to fill in missing values. Return null for unknown fields.
Set search_cars=true if user mentions car rental, car hire, vehicle rental, or limousine.
Set search_hotels=true if user mentions hotel, accommodation, or stay.
For car_city and city_code use IATA airport codes (e.g. JFK not NYC, LHR not LON, CDG not PAR, NRT not TYO, ORD not CHI).
Always use today's year when the user omits a year.
"""


async def _call_mcp_tool(tool: str, args: dict) -> dict:
    """Call a tool on the Amadeus Travel MCP server (flight search)."""
    from fastmcp import Client

    async with Client(_MCP_URL) as client:
        result = await client.call_tool(tool, args)
        content = getattr(result, "content", None) or []
        if content and hasattr(content[0], "text"):
            return json.loads(content[0].text)
        structured = getattr(result, "structured_content", None)
        if isinstance(structured, dict):
            return structured
        return {}


async def _call_car_mcp_tool(tool: str, args: dict) -> dict:
    """Call a tool on the Car Rental MCP sidecar (port 8102)."""
    from fastmcp import Client

    async with Client(_CAR_MCP_URL) as client:
        result = await client.call_tool(tool, args)
        content = getattr(result, "content", None) or []
        if content and hasattr(content[0], "text"):
            return json.loads(content[0].text)
        structured = getattr(result, "structured_content", None)
        if isinstance(structured, dict):
            return structured
        return {}


async def _call_hotel_mcp_tool(tool: str, args: dict) -> dict:
    """Call a tool on the Hotel Booking MCP sidecar (port 8103)."""
    from fastmcp import Client

    async with Client(_HOTEL_MCP_URL) as client:
        result = await client.call_tool(tool, args)
        content = getattr(result, "content", None) or []
        if content and hasattr(content[0], "text"):
            return json.loads(content[0].text)
        structured = getattr(result, "structured_content", None)
        if isinstance(structured, dict):
            return structured
        return {}


class SearchAgent(BaseAgent):
    name = "search"

    async def run(self, context: AgentContext) -> AgentResult:
        params = await self._extract_params(context)
        mcp_events: list[dict] = []
        parts: list[str] = []
        _raw_flights: list[dict] = []
        _raw_hotels: list[dict] = []
        _raw_cars: list[dict] = []

        # ── Flight search ────────────────────────────────────────────────────
        if params.get("origin") and params.get("destination") and params.get("depart_date"):
            args = {
                "origin": params["origin"],
                "destination": params["destination"],
                "depart_date": params["depart_date"],
                "cabin_class": params.get("cabin_class") or "Economy",
                "adults": params.get("adults") or 1,
            }
            if params.get("return_date"):
                args["return_date"] = params["return_date"]
            if params.get("max_price"):
                args["max_price"] = params["max_price"]

            mcp_events.append({"type": "mcp_tool_call", "agent": "search", "tool": "search_flights", "input": args})
            t0 = time.monotonic()
            try:
                data = await _call_mcp_tool("search_flights", args)
                latency = int((time.monotonic() - t0) * 1000)
                mcp_events.append({"type": "mcp_tool_result", "agent": "search", "tool": "search_flights", "output": data, "latency_ms": latency})
                _raw_flights = data.get("flights", [])
                parts.append(_format_flights(_raw_flights, args["cabin_class"]))
            except Exception as exc:
                latency = int((time.monotonic() - t0) * 1000)
                mcp_events.append({"type": "mcp_tool_result", "agent": "search", "tool": "search_flights", "output": {"error": str(exc)}, "latency_ms": latency})
                log.warning("search_flights MCP call failed: %s", exc)

        # ── Hotel search ─────────────────────────────────────────────────────
        if params.get("search_hotels") and params.get("city_code") and params.get("check_in"):
            args = {
                "city_code": params["city_code"],
                "check_in": params["check_in"],
                "check_out": params.get("check_out") or params.get("depart_date") or "",
                "adults": params.get("adults") or 1,
            }
            if params.get("max_hotel_rate"):
                args["max_rate"] = params["max_hotel_rate"]
            if params.get("room_type"):
                args["room_type"] = params["room_type"]

            mcp_events.append({"type": "mcp_tool_call", "agent": "search", "tool": "search_hotels", "input": args})
            t0 = time.monotonic()
            try:
                data = await _call_hotel_mcp_tool("search_hotels", args)
                latency = int((time.monotonic() - t0) * 1000)
                mcp_events.append({"type": "mcp_tool_result", "agent": "search", "tool": "search_hotels", "output": data, "latency_ms": latency})
                _raw_hotels = data.get("hotels", [])
                parts.append(_format_hotels(_raw_hotels))
            except Exception as exc:
                latency = int((time.monotonic() - t0) * 1000)
                mcp_events.append({"type": "mcp_tool_result", "agent": "search", "tool": "search_hotels", "output": {"error": str(exc)}, "latency_ms": latency})
                log.warning("search_hotels MCP call failed: %s", exc)

        # ── Car rental search ────────────────────────────────────────────────
        car_city = params.get("car_city") or params.get("destination") or params.get("city_code")
        if params.get("search_cars") and car_city and params.get("car_pickup_date"):
            args = {
                "city": car_city,
                "pickup_date": params["car_pickup_date"],
                "return_date": params.get("car_return_date") or params.get("check_out") or params["car_pickup_date"],
            }
            if params.get("vehicle_class"):
                args["vehicle_class"] = params["vehicle_class"]
            if params.get("max_daily_rate"):
                args["max_daily_rate"] = params["max_daily_rate"]

            mcp_events.append({"type": "mcp_tool_call", "agent": "search", "tool": "search_cars", "input": args})
            t0 = time.monotonic()
            try:
                data = await _call_car_mcp_tool("search_cars", args)
                latency = int((time.monotonic() - t0) * 1000)
                mcp_events.append({"type": "mcp_tool_result", "agent": "search", "tool": "search_cars", "output": data, "latency_ms": latency})
                _raw_cars = data.get("cars", [])
                parts.append(_format_cars(_raw_cars))
            except Exception as exc:
                latency = int((time.monotonic() - t0) * 1000)
                mcp_events.append({"type": "mcp_tool_result", "agent": "search", "tool": "search_cars", "output": {"error": str(exc)}, "latency_ms": latency})
                log.warning("search_cars MCP call failed: %s", exc)

        content = "\n\n".join(parts) if parts else "No search results — could not extract origin/destination/date from the request."
        return AgentResult(
            agent="search",
            content=content,
            metadata={
                "mcp_events": mcp_events,
                "params": params,
                "flight_results": _raw_flights,
                "hotel_results": _raw_hotels,
                "car_results": _raw_cars,
            },
        )

    async def _extract_params(self, context: AgentContext) -> dict:
        import re
        from datetime import date
        ents = context.session_context.get("entities", {})
        today = date.today().isoformat()
        user = f"Today's date: {today}\nSession entities: {json.dumps(ents)}\n\nUser message: {context.message}"
        try:
            raw = await self._chat(get_prompt("search"), user)
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
    lines = ["**Hotel Results**\n"]
    for h in hotels[:5]:
        room = h.get("room_type", "Standard Room")
        location = h.get("location", h.get("city", ""))
        lines.append(
            f"- **{h['name']}** ({h.get('rating', '?')}) — {room}  "
            f"${h['nightly_rate_usd']:.0f}/night  •  {location}  •  {h['check_in']} → {h['check_out']}"
        )
    return "\n".join(lines)


def _format_cars(cars: list[dict]) -> str:
    if not cars:
        return "**Car Rental Search**\nNo vehicles found matching your criteria."
    lines = ["**Car Rental Results**\n"]
    for c in cars[:5]:
        location = c.get("location", c.get("city", ""))
        lines.append(
            f"- **{c['agency']}** — {c['vehicle_class']}  "
            f"${c['daily_rate_usd']:.0f}/day  •  {location}  •  {c['pickup_date']} → {c['return_date']}"
        )
    return "\n".join(lines)
