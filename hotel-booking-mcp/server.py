"""Hotel Booking MCP Server — FastMCP implementation.

Exposes 3 tools backed by deterministic mock data:
  search_hotels  — find hotels by city, check-in/out dates, optional tier
  book_hotel     — confirm a reservation; returns HB-YYYYMMDD-XXXX confirmation
  cancel_hotel   — cancel by confirmation number

HTTP transport (default):
    python server.py
    → MCP protocol at  http://host:8103/mcp
    → Health check at  http://host:8103/health
    → Tool list at     http://host:8103/tools
"""
from __future__ import annotations

import hashlib
import logging
import random
import string
from datetime import date, datetime
from typing import Annotated

from fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse as _JSONResponse

log = logging.getLogger(__name__)

# ── Mock data constants ───────────────────────────────────────────────────────

BRANDS = [
    "Marriott", "Hilton", "Hyatt", "IHG", "Accor", "Four Seasons",
    "Ritz-Carlton", "Westin", "Sheraton", "Radisson", "Novotel", "Ibis",
]

TIERS: dict[str, float] = {
    "2-star": 1.00,
    "3-star": 1.80,
    "4-star": 3.20,
    "5-star": 5.50,
}

CITIES = [
    "SFO", "JFK", "LAX", "ORD", "DFW", "MIA", "SEA", "BOS", "ATL", "DEN",
    "LHR", "CDG", "NRT", "DXB", "SYD", "SIN", "HKG", "AMS", "FRA", "ZRH",
]

VERSION = "1.0.0"


def _base_rate(brand: str, city: str) -> float:
    """Deterministic base nightly rate $50–$80 per brand+city pair."""
    h = int(hashlib.md5(f"{brand}:{city}".encode()).hexdigest(), 16)
    return 50.0 + (h % 31)


# ── FastMCP app ───────────────────────────────────────────────────────────────

mcp = FastMCP(
    name="hotel-booking-mcp",
    instructions="Hotel search and booking tools for corporate travel.",
)


@mcp.tool()
async def search_hotels(
    city: Annotated[str, "IATA city code (e.g. SFO, JFK, LHR)"],
    check_in: Annotated[str, "Check-in date YYYY-MM-DD"],
    check_out: Annotated[str, "Check-out date YYYY-MM-DD"],
    tier: Annotated[str | None, "2-star|3-star|4-star|5-star (optional)"] = None,
    max_nightly_rate: Annotated[float | None, "Maximum nightly rate USD"] = None,
) -> dict:
    """Search for available hotels by city, date range, and optional tier filter. Returns up to 8 results sorted by nightly rate."""
    city_upper = city.upper()
    try:
        d0 = date.fromisoformat(check_in)
        d1 = date.fromisoformat(check_out)
        nights = max(1, (d1 - d0).days)
    except ValueError:
        nights = 1

    results = []
    for brand in BRANDS:
        for tier_name, multiplier in TIERS.items():
            if tier and tier.lower() != tier_name.lower():
                continue
            nightly = round(_base_rate(brand, city_upper) * multiplier, 2)
            if max_nightly_rate and nightly > max_nightly_rate:
                continue
            results.append({
                "id": f"{brand.lower().replace(' ', '-')}-{tier_name}-{city_upper}",
                "name": f"{brand} {city_upper}",
                "city": city_upper,
                "location": f"{brand} — {city_upper} City Centre",
                "tier": tier_name,
                "rating": tier_name,
                "check_in": check_in,
                "check_out": check_out,
                "nights": nights,
                "nightly_rate_usd": nightly,
                "total_usd": round(nightly * nights, 2),
                "room_type": "Standard Room",
                "available": True,
            })

    results.sort(key=lambda x: x["nightly_rate_usd"])
    return {"hotels": results[:8]}


@mcp.tool()
async def book_hotel(
    city: Annotated[str, "IATA city code"],
    hotel_name: Annotated[str, "Hotel name (e.g. Marriott SFO)"],
    tier: Annotated[str, "Hotel tier (2-star|3-star|4-star|5-star)"],
    check_in: Annotated[str, "Check-in date YYYY-MM-DD"],
    check_out: Annotated[str, "Check-out date YYYY-MM-DD"],
    guest_name: Annotated[str, "Full name of primary guest"],
) -> dict:
    """Confirm a hotel reservation. Returns confirmation number HB-YYYYMMDD-XXXX."""
    try:
        d0 = date.fromisoformat(check_in)
        d1 = date.fromisoformat(check_out)
        nights = max(1, (d1 - d0).days)
    except ValueError:
        nights = 1
        d0 = date.today()

    city_upper = city.upper()
    brand = hotel_name.replace(f" {city_upper}", "").strip()
    multiplier = TIERS.get(tier, 1.0)
    nightly = round(_base_rate(brand, city_upper) * multiplier, 2)
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    confirmation_number = f"HB-{d0.strftime('%Y%m%d')}-{suffix}"

    return {
        "confirmation_number": confirmation_number,
        "hotel": hotel_name,
        "tier": tier,
        "city": city_upper,
        "check_in": check_in,
        "check_out": check_out,
        "nights": nights,
        "nightly_rate_usd": nightly,
        "total_usd": round(nightly * nights, 2),
        "guest": guest_name,
        "status": "confirmed",
    }


@mcp.tool()
async def cancel_hotel(
    confirmation_number: Annotated[str, "Confirmation number (HB-YYYYMMDD-XXXX)"],
) -> dict:
    """Cancel a hotel reservation by confirmation number."""
    return {
        "confirmation_number": confirmation_number,
        "status": "cancelled",
        "cancelled_at": datetime.utcnow().isoformat() + "Z",
    }


# ── Custom HTTP routes (health + tool schema listing) ─────────────────────────

@mcp.custom_route("/health", methods=["GET"])
async def _health_route(request: Request) -> _JSONResponse:
    return _JSONResponse({
        "status": "ok",
        "service": "hotel-booking-mcp",
        "version": VERSION,
        "tools": ["search_hotels", "book_hotel", "cancel_hotel"],
        "brands": len(BRANDS),
        "tiers": len(TIERS),
        "cities": len(CITIES),
    })


@mcp.custom_route("/tools", methods=["GET"])
async def _tools_route(request: Request) -> _JSONResponse:
    return _JSONResponse({
        "tools": [
            {
                "name": "search_hotels",
                "description": "Search for available hotels by city, check-in/check-out dates, and optional tier filter. Returns up to 8 results sorted by nightly rate.",
                "inputSchema": {
                    "type": "object",
                    "required": ["city", "check_in", "check_out"],
                    "properties": {
                        "city":             {"type": "string", "description": "IATA city code (SFO, JFK, LHR…)"},
                        "check_in":         {"type": "string", "description": "Check-in date YYYY-MM-DD"},
                        "check_out":        {"type": "string", "description": "Check-out date YYYY-MM-DD"},
                        "tier":             {"type": "string", "description": "2-star|3-star|4-star|5-star", "enum": list(TIERS)},
                        "max_nightly_rate": {"type": "number", "description": "Max nightly rate USD"},
                    },
                },
            },
            {
                "name": "book_hotel",
                "description": "Confirm a hotel reservation. Returns confirmation number HB-YYYYMMDD-XXXX.",
                "inputSchema": {
                    "type": "object",
                    "required": ["city", "hotel_name", "tier", "check_in", "check_out", "guest_name"],
                    "properties": {
                        "city":       {"type": "string", "description": "IATA city code"},
                        "hotel_name": {"type": "string", "description": "Hotel name (e.g. Marriott SFO)"},
                        "tier":       {"type": "string", "description": "2-star|3-star|4-star|5-star", "enum": list(TIERS)},
                        "check_in":   {"type": "string", "description": "Check-in date YYYY-MM-DD"},
                        "check_out":  {"type": "string", "description": "Check-out date YYYY-MM-DD"},
                        "guest_name": {"type": "string", "description": "Full name of primary guest"},
                    },
                },
            },
            {
                "name": "cancel_hotel",
                "description": "Cancel a hotel reservation by confirmation number.",
                "inputSchema": {
                    "type": "object",
                    "required": ["confirmation_number"],
                    "properties": {
                        "confirmation_number": {"type": "string", "description": "HB-YYYYMMDD-XXXX"},
                    },
                },
            },
        ],
    })


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = 8103
    log.basicConfig(level=logging.INFO)
    log.info("Starting hotel-booking-mcp on :%d  (MCP at /mcp, health at /health)", port)
    uvicorn.run(mcp.streamable_http_app(), host="0.0.0.0", port=port, log_level="info")
