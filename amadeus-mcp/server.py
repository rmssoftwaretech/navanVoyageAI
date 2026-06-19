"""Amadeus Travel MCP Server — FastMCP implementation.

Exposes 3 MCP tools backed by 88k static records + live Amadeus API fallback:

  search_flights   — route + date + cabin search (36k records, 64 routes)
  search_hotels    — city + dates + room-type search (39k records, 30 cities)
  search_cars      — city + dates + class search (12k records, 30 cities)

Transports
----------
HTTP (Streamable-HTTP, default):
    python server.py
    → MCP protocol at  http://host:8101/mcp
    → Health check at  http://host:8101/health
    → Tool list at     http://host:8101/tools  (legacy JSON schema)

stdio (Claude Desktop / MCP Inspector):
    python server.py --stdio
"""
from __future__ import annotations

import json
import logging
import os
import random
import sys
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from fastmcp import FastMCP

log = logging.getLogger(__name__)

# ── Data directory ────────────────────────────────────────────────────────────

_DATA_DIR = Path(os.getenv("DATA_DIR", "/app/data"))

_STDIO = "--stdio" in sys.argv


@lru_cache(maxsize=3)
def _load_static(name: str) -> list[dict]:
    path = _DATA_DIR / name
    if path.exists():
        try:
            with open(path) as f:
                return json.load(f)
        except Exception as exc:
            log.warning("Failed to load %s: %s", path, exc)
    return []


# ── Amadeus live client ───────────────────────────────────────────────────────

_amadeus_client = None


def _get_amadeus():
    global _amadeus_client
    if _amadeus_client is None:
        cid = os.getenv("AMADEUS_CLIENT_ID", "")
        sec = os.getenv("AMADEUS_CLIENT_SECRET", "")
        if cid and sec:
            from amadeus import Client
            _amadeus_client = Client(
                client_id=cid,
                client_secret=sec,
                hostname=os.getenv("AMADEUS_HOSTNAME", "test"),
            )
    return _amadeus_client


# ── Static data helpers ───────────────────────────────────────────────────────

_CABIN_MULTIPLIER = {
    "Economy": 1.0, "ECONOMY": 1.0,
    "Economy Plus": 1.55, "PREMIUM_ECONOMY": 1.55,
    "Business": 3.8, "BUSINESS": 3.8,
    "First": 6.5, "FIRST": 6.5,
}

_ROUTE_MINUTES: dict[tuple[str, str], int] = {
    ("SFO", "NRT"): 645, ("SFO", "LHR"): 590, ("JFK", "LHR"): 430,
    ("JFK", "CDG"): 420, ("LAX", "SIN"): 940, ("LAX", "NRT"): 625,
    ("ORD", "LHR"): 510, ("DFW", "LHR"): 580, ("SFO", "JFK"): 330,
    ("JFK", "SFO"): 340, ("LAX", "JFK"): 320, ("ATL", "JFK"): 165,
    ("BOS", "SFO"): 370, ("SFO", "LAX"): 80,
}

_MOCK_AIRLINES = [
    ("United Airlines", "UA", 1.00), ("Delta Air Lines", "DL", 1.04),
    ("American Airlines", "AA", 0.97), ("British Airways", "BA", 1.10),
    ("Air France", "AF", 1.08), ("Lufthansa", "LH", 1.12),
    ("Qatar Airways", "QR", 1.18), ("Singapore Airlines", "SQ", 1.22),
    ("Emirates", "EK", 1.15), ("Japan Airlines", "JL", 1.09),
]

# Map IATA city codes / common aliases → airport codes used in static data
_CITY_ALIASES: dict[str, str] = {
    "NYC": "JFK", "LON": "LHR", "PAR": "CDG", "TYO": "NRT",
    "CHI": "ORD", "YTO": "YYZ", "BKK": "BKK", "GRU": "GRU",
}

_CITY_BASE_CAR_RATE: dict[str, float] = {
    "SFO": 68, "LAX": 55, "JFK": 72, "ORD": 52, "DFW": 48,
    "LHR": 65, "CDG": 58, "NRT": 80, "SIN": 75, "DXB": 60,
}
_CITY_AIRPORT: dict[str, str] = {
    "SFO": "San Francisco Airport", "LAX": "Los Angeles Airport",
    "JFK": "JFK International Airport", "ORD": "O'Hare International Airport",
    "DFW": "Dallas Fort Worth Airport", "LHR": "London Heathrow Airport",
    "CDG": "Paris Charles de Gaulle Airport", "NRT": "Tokyo Narita Airport",
    "SIN": "Singapore Changi Airport", "DXB": "Dubai International Airport",
}


def _fallback_flights(origin: str, dest: str, depart_date: str, cabin_class: str, max_price: float | None) -> list[dict]:
    mins = _ROUTE_MINUTES.get((origin, dest), 280)
    cmult = _CABIN_MULTIPLIER.get(cabin_class, 1.0)
    random.seed(f"{origin}{dest}{depart_date}{cabin_class}")
    selected = random.sample(_MOCK_AIRLINES, min(6, len(_MOCK_AIRLINES)))
    stops_cfg = [(0, 0), (0, 0), (1, 65), (1, 80), (2, 145)]
    results = []
    for i, (carrier, code, amult) in enumerate(selected):
        stops, extra = stops_cfg[i % len(stops_cfg)]
        base = max(79.0, mins * 0.82 + random.uniform(-30, 30))
        price = round(base * cmult * amult * (0.88 if stops > 0 else 1.0), 2)
        if max_price and price > max_price:
            continue
        results.append({
            "id": str(i + 1),
            "carrier": carrier,
            "flight_number": f"{code}{random.randint(100, 999)}",
            "origin": origin,
            "destination": dest,
            "depart_date": depart_date,
            "cabin_class": cabin_class,
            "price_usd": price,
            "duration_minutes": mins + extra,
            "stops": stops,
            "seats_available": random.randint(2, 12),
        })
    results.sort(key=lambda r: r["price_usd"])
    return results


def _static_flights(origin: str, dest: str, depart_date: str, cabin_class: str, max_price: float | None) -> list[dict]:
    rows = _load_static("mock_flights.json")
    if not rows:
        return _fallback_flights(origin, dest, depart_date, cabin_class, max_price)

    def _match(r: dict) -> bool:
        if origin != "ALL" and r.get("origin", "").upper() != origin:
            return False
        if dest != "ALL" and r.get("destination", "").upper() != dest:
            return False
        if cabin_class and cabin_class.lower() not in ("all", ""):
            if r.get("cabin_class", "").lower() != cabin_class.lower():
                return False
        if max_price and r.get("price_usd", 0) > max_price:
            return False
        return True

    filtered = [r for r in rows if _match(r)]
    if not filtered:
        filtered = _fallback_flights(origin, dest, depart_date, cabin_class, max_price)
    filtered.sort(key=lambda r: r.get("price_usd", 0))
    return filtered[:20]


def _static_hotels(city_code: str, check_in: str, check_out: str, max_rate: float | None, room_type: str | None) -> list[dict]:
    rows = _load_static("mock_hotels.json")

    def _match(r: dict) -> bool:
        if city_code != "ALL" and r.get("city", "").upper() != city_code:
            return False
        if max_rate and r.get("nightly_rate_usd", 0) > max_rate:
            return False
        if room_type and room_type.lower() not in ("all", ""):
            if r.get("room_type", "").lower() != room_type.lower():
                return False
        return True

    filtered = [r for r in rows if _match(r)] if rows else []
    filtered.sort(key=lambda r: r.get("nightly_rate_usd", 0))
    return filtered[:20]


def _static_cars(city: str, pickup_date: str, return_date: str, vehicle_class: str | None, max_daily_rate: float | None) -> list[dict]:
    rows = _load_static("mock_cars.json")

    def _match(r: dict) -> bool:
        if city != "ALL" and r.get("city", "").upper() != city:
            return False
        if vehicle_class and vehicle_class.lower() not in ("all", ""):
            if r.get("vehicle_class", "").lower() != vehicle_class.lower():
                return False
        if max_daily_rate and r.get("daily_rate_usd", 0) > max_daily_rate:
            return False
        return True

    if rows:
        filtered = [r for r in rows if _match(r)]
        if filtered:
            filtered.sort(key=lambda r: r.get("daily_rate_usd", 0))
            return filtered[:20]

    # Fallback: generate deterministic mock
    base = _CITY_BASE_CAR_RATE.get(city, 55)
    location = _CITY_AIRPORT.get(city, f"{city} Airport")
    random.seed(f"{city}{pickup_date}")
    agencies = ["Hertz", "Avis", "Enterprise", "Budget", "National"]
    classes = [("Economy", 1.0), ("Compact", 1.2), ("Mid-size", 1.45),
               ("Full-size", 1.7), ("SUV", 2.1), ("Luxury", 3.2), ("Limousine", 5.5)]
    results = []
    for ag in agencies:
        for cls, mult in classes:
            if vehicle_class and vehicle_class.lower() not in ("all", cls.lower()):
                continue
            rate = round(base * mult * random.uniform(0.9, 1.1), 2)
            if max_daily_rate and rate > max_daily_rate:
                continue
            results.append({
                "id": f"CAR-{ag[:2]}-{cls[:3]}",
                "agency": ag,
                "vehicle_class": cls,
                "city": city,
                "location": location,
                "pickup_date": pickup_date,
                "return_date": return_date,
                "daily_rate_usd": rate,
                "available": True,
            })
    results.sort(key=lambda r: r["daily_rate_usd"])
    return results[:20]


def _parse_duration(iso: str) -> int:
    import re
    h = int(re.search(r"(\d+)H", iso).group(1)) if "H" in iso else 0
    m = int(re.search(r"(\d+)M", iso).group(1)) if "M" in iso else 0
    return h * 60 + m


# ── FastMCP server ────────────────────────────────────────────────────────────

mcp = FastMCP(
    name="travel-mcp",
    instructions=(
        "Corporate travel search tools. Use search_flights to find flights, "
        "search_hotels to find hotel rooms, and search_cars to find car rentals. "
        "Results are backed by 88,000+ pre-generated records across 30 cities. "
        "Always check policy compliance after retrieving search results."
    ),
)


@mcp.tool()
async def search_flights(
    origin: Annotated[str, "IATA departure airport code, e.g. SFO"],
    destination: Annotated[str, "IATA arrival airport code, e.g. NRT"],
    depart_date: Annotated[str, "Departure date in YYYY-MM-DD format"],
    cabin_class: Annotated[str, "Economy | Economy Plus | Business | First"] = "Economy",
    max_price: Annotated[float | None, "Maximum price in USD"] = None,
    adults: Annotated[int, "Number of adult passengers"] = 1,
    return_date: Annotated[str | None, "Return date for round-trip, YYYY-MM-DD"] = None,
) -> dict:
    """Search for flight offers by route, date, and cabin class.

    Returns up to 20 flights sorted by price. Backed by 36,000 static records
    across 64 international and domestic routes; falls back to Amadeus live API
    when credentials are configured.
    """
    origin = origin.upper()
    destination = destination.upper()
    amadeus = _get_amadeus()

    if amadeus is None:
        flights = _static_flights(origin, destination, depart_date, cabin_class, max_price)
        return {"flights": flights, "source": "static", "count": len(flights)}

    try:
        params: dict = {
            "originLocationCode": origin,
            "destinationLocationCode": destination,
            "departureDate": depart_date,
            "adults": adults,
            "travelClass": {
                "Economy": "ECONOMY",
                "Economy Plus": "PREMIUM_ECONOMY",
                "Business": "BUSINESS",
                "First": "FIRST",
            }.get(cabin_class, "ECONOMY"),
            "currencyCode": "USD",
            "max": 10,
        }
        if return_date:
            params["returnDate"] = return_date
        if max_price:
            params["maxPrice"] = int(max_price)

        resp = amadeus.shopping.flight_offers_search.get(**params)
        flights = []
        for offer in resp.data[:6]:
            seg = offer["itineraries"][0]["segments"][0]
            flights.append({
                "id": offer["id"],
                "carrier": seg["carrierCode"],
                "flight_number": f"{seg['carrierCode']}{seg['number']}",
                "origin": seg["departure"]["iataCode"],
                "destination": seg["arrival"]["iataCode"],
                "depart_date": seg["departure"]["at"][:10],
                "cabin_class": cabin_class,
                "price_usd": float(offer["price"]["total"]),
                "duration_minutes": _parse_duration(offer["itineraries"][0]["duration"]),
                "stops": len(offer["itineraries"][0]["segments"]) - 1,
                "seats_available": int(offer.get("numberOfBookableSeats", 9)),
            })
        return {"flights": flights, "source": "amadeus", "count": len(flights)}
    except Exception as exc:
        log.warning("Amadeus flight error: %s — using static data", exc)
        flights = _static_flights(origin, destination, depart_date, cabin_class, max_price)
        return {"flights": flights, "source": "static_fallback", "count": len(flights)}


@mcp.tool()
async def search_hotels(
    city_code: Annotated[str, "IATA city code, e.g. NRT for Tokyo"],
    check_in: Annotated[str, "Check-in date in YYYY-MM-DD format"],
    check_out: Annotated[str, "Check-out date in YYYY-MM-DD format"],
    max_rate: Annotated[float | None, "Maximum nightly rate in USD"] = None,
    room_type: Annotated[str | None, "Standard Room | Double Bed | Executive Suite"] = None,
    adults: Annotated[int, "Number of adult guests"] = 1,
) -> dict:
    """Search for hotel availability in a city.

    Returns up to 20 hotels sorted by nightly rate. Backed by 39,000 static
    records across 30 cities with Standard Room, Double Bed, and Executive Suite
    room types; falls back to Amadeus live API when credentials are configured.
    """
    city_code = _CITY_ALIASES.get(city_code.upper(), city_code.upper())
    amadeus = _get_amadeus()

    if amadeus is None:
        hotels = _static_hotels(city_code, check_in, check_out, max_rate, room_type)
        return {"hotels": hotels, "source": "static", "count": len(hotels)}

    try:
        hotel_list = amadeus.reference_data.locations.hotels.by_city.get(cityCode=city_code)
        hotel_ids = [h["hotelId"] for h in hotel_list.data[:20]]
        resp = amadeus.shopping.hotel_offers_search.get(
            hotelIds=",".join(hotel_ids),
            checkInDate=check_in,
            checkOutDate=check_out,
            adults=adults,
            currency="USD",
        )
        hotels = []
        for offer in resp.data[:6]:
            rate = float(offer["offers"][0]["price"]["total"])
            if max_rate and rate > max_rate:
                continue
            hotels.append({
                "id": offer["hotel"]["hotelId"],
                "name": offer["hotel"]["name"],
                "city": city_code,
                "location": city_code,
                "check_in": check_in,
                "check_out": check_out,
                "nightly_rate_usd": rate,
                "rating": offer["hotel"].get("rating", "3-star"),
                "room_type": room_type or "Standard Room",
                "available": True,
            })
        return {"hotels": hotels, "source": "amadeus", "count": len(hotels)}
    except Exception as exc:
        log.warning("Amadeus hotel error: %s — using static data", exc)
        hotels = _static_hotels(city_code, check_in, check_out, max_rate, room_type)
        return {"hotels": hotels, "source": "static_fallback", "count": len(hotels)}


@mcp.tool()
async def search_cars(
    city: Annotated[str, "IATA city code for pickup, e.g. SFO"],
    pickup_date: Annotated[str, "Pickup date in YYYY-MM-DD format"],
    return_date: Annotated[str, "Return date in YYYY-MM-DD format"],
    vehicle_class: Annotated[str | None, "Economy | Compact | Mid-size | Full-size | SUV | Luxury | Limousine"] = None,
    max_daily_rate: Annotated[float | None, "Maximum daily rate in USD"] = None,
) -> dict:
    """Search for car rental availability at an airport.

    Returns up to 20 vehicles sorted by daily rate. Backed by 12,000 static
    records across 30 airport cities; includes Economy through Limousine classes
    from 10 major rental agencies.
    """
    resolved = _CITY_ALIASES.get(city.upper(), city.upper())
    cars = _static_cars(resolved, pickup_date, return_date, vehicle_class, max_daily_rate)
    source = "static" if _load_static("mock_cars.json") else "mock"
    return {"cars": cars, "source": source, "count": len(cars)}


# ── Custom HTTP routes (health + legacy tool listing) ─────────────────────────
# These sit alongside /mcp in the same FastMCP ASGI app.

from starlette.requests import Request
from starlette.responses import JSONResponse as _JSONResponse

@mcp.custom_route("/health", methods=["GET"])
async def _health_route(request: Request) -> _JSONResponse:
    static = {
        "mock_flights": (_DATA_DIR / "mock_flights.json").exists(),
        "mock_hotels": (_DATA_DIR / "mock_hotels.json").exists(),
        "mock_cars":   (_DATA_DIR / "mock_cars.json").exists(),
    }
    return _JSONResponse({
        "status": "ok",
        "service": "travel-mcp",
        "version": "2.0.0",
        "transport": "streamable-http",
        "mcp_endpoint": "/mcp",
        "static_data": static,
        "amadeus_live": _get_amadeus() is not None,
        "tools": ["search_flights", "search_hotels", "search_cars"],
    })


@mcp.custom_route("/tools", methods=["GET"])
async def _tools_route(request: Request) -> _JSONResponse:
    """Legacy JSON schema listing for backward compatibility."""
    return _JSONResponse({
        "tools": [
            {
                "name": "search_flights",
                "description": "Search for flight offers by route, date, and cabin class. Returns up to 20 flights sorted by price.",
                "inputSchema": {
                    "type": "object",
                    "required": ["origin", "destination", "depart_date"],
                    "properties": {
                        "origin":       {"type": "string", "description": "IATA departure airport code, e.g. SFO"},
                        "destination":  {"type": "string", "description": "IATA arrival airport code, e.g. NRT"},
                        "depart_date":  {"type": "string", "description": "YYYY-MM-DD"},
                        "cabin_class":  {"type": "string", "enum": ["Economy", "Economy Plus", "Business", "First"]},
                        "max_price":    {"type": "number"},
                        "adults":       {"type": "integer"},
                        "return_date":  {"type": "string"},
                    },
                },
            },
            {
                "name": "search_hotels",
                "description": "Search for hotel availability in a city. Returns up to 20 hotels sorted by nightly rate.",
                "inputSchema": {
                    "type": "object",
                    "required": ["city_code", "check_in", "check_out"],
                    "properties": {
                        "city_code":  {"type": "string", "description": "IATA city code, e.g. NRT"},
                        "check_in":   {"type": "string", "description": "YYYY-MM-DD"},
                        "check_out":  {"type": "string", "description": "YYYY-MM-DD"},
                        "max_rate":   {"type": "number"},
                        "room_type":  {"type": "string", "enum": ["Standard Room", "Double Bed", "Executive Suite"]},
                        "adults":     {"type": "integer"},
                    },
                },
            },
            {
                "name": "search_cars",
                "description": "Search for car rental availability at an airport. Returns up to 20 vehicles sorted by daily rate.",
                "inputSchema": {
                    "type": "object",
                    "required": ["city", "pickup_date", "return_date"],
                    "properties": {
                        "city":           {"type": "string", "description": "IATA airport code, e.g. SFO"},
                        "pickup_date":    {"type": "string", "description": "YYYY-MM-DD"},
                        "return_date":    {"type": "string", "description": "YYYY-MM-DD"},
                        "vehicle_class":  {"type": "string", "enum": ["Economy", "Compact", "Mid-size", "Full-size", "SUV", "Luxury", "Limousine"]},
                        "max_daily_rate": {"type": "number"},
                    },
                },
            },
        ]
    })


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if _STDIO:
        # stdio transport — for Claude Desktop / MCP Inspector CLI
        mcp.run(transport="stdio")
    else:
        import uvicorn

        # http_app() returns a Starlette app with:
        #   /mcp    → FastMCP Streamable-HTTP transport (real MCP protocol)
        #   /health → custom health JSON (added via @mcp.custom_route above)
        #   /tools  → legacy tool schema listing
        app = mcp.http_app()

        port = int(os.getenv("AMADEUS_MCP_PORT", "8101"))
        log.info("Starting travel-mcp on :%d  (MCP at /mcp, health at /health)", port)
        uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
