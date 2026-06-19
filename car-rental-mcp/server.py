"""Car Rental MCP Server — FastMCP implementation.

Exposes 3 tools backed by deterministic mock data:
  search_cars  — find available rentals by city, dates, optional class
  book_car     — confirm a rental; returns CR-YYYYMMDD-XXXX confirmation
  cancel_car   — cancel by confirmation number

HTTP transport (default):
    python server.py
    → MCP protocol at  http://host:8102/mcp
    → Health check at  http://host:8102/health
    → Tool list at     http://host:8102/tools
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

AGENCIES = ["Hertz", "Avis", "Enterprise", "Budget", "National", "Europcar"]

CLASSES: dict[str, float] = {
    "Economy":   1.00,
    "Compact":   1.20,
    "Mid-size":  1.45,
    "Full-size": 1.70,
    "SUV":       2.10,
    "Luxury":    3.20,
}

CITIES = [
    "SFO", "JFK", "LAX", "ORD", "DFW", "MIA", "SEA", "BOS", "ATL", "DEN",
    "LHR", "CDG", "NRT", "DXB", "SYD", "SIN", "HKG", "AMS", "FRA", "ZRH",
]

VERSION = "1.0.0"


def _base_rate(agency: str, city: str) -> float:
    """Deterministic base daily rate $50–$90 per agency+city pair."""
    h = int(hashlib.md5(f"{agency}:{city}".encode()).hexdigest(), 16)
    return 50.0 + (h % 41)


# ── FastMCP app ───────────────────────────────────────────────────────────────

mcp = FastMCP(
    name="car-rental-mcp",
    instructions="Car rental search and booking tools for corporate travel.",
)


@mcp.tool()
async def search_cars(
    city: Annotated[str, "IATA city code (e.g. SFO, JFK, LHR)"],
    pickup_date: Annotated[str, "Pickup date YYYY-MM-DD"],
    return_date: Annotated[str, "Return date YYYY-MM-DD"],
    vehicle_class: Annotated[str | None, "Economy|Compact|Mid-size|Full-size|SUV|Luxury"] = None,
    max_daily_rate: Annotated[float | None, "Maximum daily rate USD"] = None,
) -> dict:
    """Search for available car rentals by city, date range, and optional class."""
    city_upper = city.upper()
    try:
        d0 = date.fromisoformat(pickup_date)
        d1 = date.fromisoformat(return_date)
        days = max(1, (d1 - d0).days)
    except ValueError:
        days = 1

    results = []
    for agency in AGENCIES:
        for cls, multiplier in CLASSES.items():
            if vehicle_class and vehicle_class.lower() != cls.lower():
                continue
            daily = round(_base_rate(agency, city_upper) * multiplier, 2)
            if max_daily_rate and daily > max_daily_rate:
                continue
            results.append({
                "id": f"{agency.lower()}-{cls.lower().replace('-', '').replace(' ', '')}-{city_upper}",
                "agency": agency,
                "vehicle_class": cls,
                "city": city_upper,
                "location": f"{agency} — {city_upper} Airport",
                "pickup_date": pickup_date,
                "return_date": return_date,
                "days": days,
                "daily_rate_usd": daily,
                "total_usd": round(daily * days, 2),
                "available": True,
            })

    results.sort(key=lambda x: x["daily_rate_usd"])
    return {"cars": results[:6]}


@mcp.tool()
async def book_car(
    city: Annotated[str, "IATA city code"],
    agency: Annotated[str, "Rental agency name (Hertz, Avis, Enterprise, Budget, National, Europcar)"],
    vehicle_class: Annotated[str, "Vehicle class (Economy|Compact|Mid-size|Full-size|SUV|Luxury)"],
    pickup_date: Annotated[str, "Pickup date YYYY-MM-DD"],
    return_date: Annotated[str, "Return date YYYY-MM-DD"],
    driver_name: Annotated[str, "Full name of the primary driver"],
) -> dict:
    """Confirm a car rental booking. Returns confirmation number CR-YYYYMMDD-XXXX."""
    try:
        d0 = date.fromisoformat(pickup_date)
        d1 = date.fromisoformat(return_date)
        days = max(1, (d1 - d0).days)
    except ValueError:
        days = 1
        d0 = date.today()

    city_upper = city.upper()
    multiplier = CLASSES.get(vehicle_class, 1.0)
    daily = round(_base_rate(agency, city_upper) * multiplier, 2)
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    confirmation_number = f"CR-{d0.strftime('%Y%m%d')}-{suffix}"

    return {
        "confirmation_number": confirmation_number,
        "agency": agency,
        "vehicle_class": vehicle_class,
        "pickup_city": city_upper,
        "pickup_date": pickup_date,
        "return_date": return_date,
        "days": days,
        "daily_rate_usd": daily,
        "total_usd": round(daily * days, 2),
        "driver": driver_name,
        "status": "confirmed",
    }


@mcp.tool()
async def cancel_car(
    confirmation_number: Annotated[str, "Confirmation number (CR-YYYYMMDD-XXXX)"],
) -> dict:
    """Cancel a car rental booking by confirmation number."""
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
        "service": "car-rental-mcp",
        "version": VERSION,
        "tools": ["search_cars", "book_car", "cancel_car"],
        "agencies": len(AGENCIES),
        "vehicle_classes": len(CLASSES),
        "cities": len(CITIES),
    })


@mcp.custom_route("/tools", methods=["GET"])
async def _tools_route(request: Request) -> _JSONResponse:
    return _JSONResponse({
        "tools": [
            {
                "name": "search_cars",
                "description": "Search for available car rentals by city, date range, and optional class filter. Returns up to 6 results sorted by daily rate.",
                "inputSchema": {
                    "type": "object",
                    "required": ["city", "pickup_date", "return_date"],
                    "properties": {
                        "city":           {"type": "string", "description": "IATA city code (SFO, JFK, LHR…)"},
                        "pickup_date":    {"type": "string", "description": "Pickup date YYYY-MM-DD"},
                        "return_date":    {"type": "string", "description": "Return date YYYY-MM-DD"},
                        "vehicle_class":  {"type": "string", "description": "Economy|Compact|Mid-size|Full-size|SUV|Luxury", "enum": list(CLASSES)},
                        "max_daily_rate": {"type": "number", "description": "Max daily rate USD"},
                    },
                },
            },
            {
                "name": "book_car",
                "description": "Confirm a car rental booking. Returns confirmation number CR-YYYYMMDD-XXXX.",
                "inputSchema": {
                    "type": "object",
                    "required": ["city", "agency", "vehicle_class", "pickup_date", "return_date", "driver_name"],
                    "properties": {
                        "city":          {"type": "string", "description": "IATA city code"},
                        "agency":        {"type": "string", "description": "Rental agency", "enum": AGENCIES},
                        "vehicle_class": {"type": "string", "description": "Vehicle class", "enum": list(CLASSES)},
                        "pickup_date":   {"type": "string", "description": "Pickup date YYYY-MM-DD"},
                        "return_date":   {"type": "string", "description": "Return date YYYY-MM-DD"},
                        "driver_name":   {"type": "string", "description": "Full name of primary driver"},
                    },
                },
            },
            {
                "name": "cancel_car",
                "description": "Cancel a car rental booking by confirmation number.",
                "inputSchema": {
                    "type": "object",
                    "required": ["confirmation_number"],
                    "properties": {
                        "confirmation_number": {"type": "string", "description": "CR-YYYYMMDD-XXXX"},
                    },
                },
            },
        ],
    })


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = 8102
    log.basicConfig(level=logging.INFO)
    log.info("Starting car-rental-mcp on :%d  (MCP at /mcp, health at /health)", port)
    uvicorn.run(mcp.streamable_http_app(), host="0.0.0.0", port=port, log_level="info")
