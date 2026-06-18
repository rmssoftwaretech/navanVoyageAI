"""Amadeus MCP sidecar — FastAPI wrapper around Amadeus sandbox API.

Exposes:
  POST /tools/search_flights
  POST /tools/search_hotels
  GET  /health
"""
from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

log = logging.getLogger(__name__)
app = FastAPI(title="amadeus-mcp", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_amadeus_client = None


def _get_amadeus():
    global _amadeus_client
    if _amadeus_client is None:
        client_id = os.getenv("AMADEUS_CLIENT_ID", "")
        client_secret = os.getenv("AMADEUS_CLIENT_SECRET", "")
        hostname = os.getenv("AMADEUS_HOSTNAME", "test")
        if client_id and client_secret:
            from amadeus import Client
            _amadeus_client = Client(
                client_id=client_id,
                client_secret=client_secret,
                hostname=hostname,
            )
    return _amadeus_client


# ── Request / Response models ─────────────────────────────────────────────────

class FlightSearchRequest(BaseModel):
    origin: str
    destination: str
    depart_date: str
    return_date: str | None = None
    cabin_class: str = "ECONOMY"
    max_price: float | None = None
    adults: int = 1


class HotelSearchRequest(BaseModel):
    city_code: str
    check_in: str
    check_out: str
    adults: int = 1
    max_rate: float | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cabin_map(cabin: str) -> str:
    mapping = {
        "Economy": "ECONOMY",
        "Economy Plus": "PREMIUM_ECONOMY",
        "Business": "BUSINESS",
        "First": "FIRST",
    }
    return mapping.get(cabin, cabin.upper())


def _mock_flights(req: FlightSearchRequest) -> list[dict]:
    """Fallback mock data when Amadeus credentials are absent."""
    return [
        {
            "id": "1",
            "carrier": "Air France",
            "flight_number": "AF009",
            "origin": req.origin,
            "destination": req.destination,
            "depart_date": req.depart_date,
            "return_date": req.return_date,
            "cabin_class": req.cabin_class,
            "price_usd": 742.00,
            "duration_minutes": 430,
            "stops": 0,
            "seats_available": 4,
        },
        {
            "id": "2",
            "carrier": "Delta",
            "flight_number": "DL401",
            "origin": req.origin,
            "destination": req.destination,
            "depart_date": req.depart_date,
            "return_date": req.return_date,
            "cabin_class": req.cabin_class,
            "price_usd": 798.00,
            "duration_minutes": 465,
            "stops": 1,
            "seats_available": 8,
        },
    ]


def _mock_hotels(req: HotelSearchRequest) -> list[dict]:
    return [
        {
            "id": "H1",
            "name": "Marriott City Center",
            "city": req.city_code,
            "check_in": req.check_in,
            "check_out": req.check_out,
            "nightly_rate_usd": 189.00,
            "rating": "4-star",
            "available": True,
        },
        {
            "id": "H2",
            "name": "Hilton Garden Inn",
            "city": req.city_code,
            "check_in": req.check_in,
            "check_out": req.check_out,
            "nightly_rate_usd": 145.00,
            "rating": "3-star",
            "available": True,
        },
    ]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "amadeus-mcp"}


@app.post("/tools/search_flights")
async def search_flights(req: FlightSearchRequest) -> dict:
    amadeus = _get_amadeus()
    if amadeus is None:
        log.warning("Amadeus credentials not set — returning mock flight data")
        return {"flights": _mock_flights(req), "source": "mock"}

    try:
        params: dict[str, Any] = {
            "originLocationCode": req.origin.upper(),
            "destinationLocationCode": req.destination.upper(),
            "departureDate": req.depart_date,
            "adults": req.adults,
            "travelClass": _cabin_map(req.cabin_class),
            "currencyCode": "USD",
            "max": 10,
        }
        if req.return_date:
            params["returnDate"] = req.return_date
        if req.max_price:
            params["maxPrice"] = int(req.max_price)

        response = amadeus.shopping.flight_offers_search.get(**params)
        flights = []
        for offer in response.data[:5]:
            seg = offer["itineraries"][0]["segments"][0]
            price = float(offer["price"]["total"])
            flights.append({
                "id": offer["id"],
                "carrier": seg["carrierCode"],
                "flight_number": f"{seg['carrierCode']}{seg['number']}",
                "origin": seg["departure"]["iataCode"],
                "destination": seg["arrival"]["iataCode"],
                "depart_date": seg["departure"]["at"][:10],
                "cabin_class": req.cabin_class,
                "price_usd": price,
                "duration_minutes": _parse_duration(offer["itineraries"][0]["duration"]),
                "stops": len(offer["itineraries"][0]["segments"]) - 1,
                "seats_available": int(offer.get("numberOfBookableSeats", 9)),
            })
        return {"flights": flights, "source": "amadeus"}
    except Exception as exc:
        log.error("Amadeus flight search error: %s", exc)
        return {"flights": _mock_flights(req), "source": "mock_fallback", "error": str(exc)}


@app.post("/tools/search_hotels")
async def search_hotels(req: HotelSearchRequest) -> dict:
    amadeus = _get_amadeus()
    if amadeus is None:
        log.warning("Amadeus credentials not set — returning mock hotel data")
        results = _mock_hotels(req)
        if req.max_rate:
            results = [h for h in results if h["nightly_rate_usd"] <= req.max_rate]
        return {"hotels": results, "source": "mock"}

    try:
        hotel_list = amadeus.reference_data.locations.hotels.by_city.get(cityCode=req.city_code)
        hotel_ids = [h["hotelId"] for h in hotel_list.data[:20]]

        offers_resp = amadeus.shopping.hotel_offers_search.get(
            hotelIds=",".join(hotel_ids),
            checkInDate=req.check_in,
            checkOutDate=req.check_out,
            adults=req.adults,
            currency="USD",
        )
        hotels = []
        for offer in offers_resp.data[:5]:
            rate = float(offer["offers"][0]["price"]["total"])
            if req.max_rate and rate > req.max_rate:
                continue
            hotels.append({
                "id": offer["hotel"]["hotelId"],
                "name": offer["hotel"]["name"],
                "city": req.city_code,
                "check_in": req.check_in,
                "check_out": req.check_out,
                "nightly_rate_usd": rate,
                "rating": offer["hotel"].get("rating", "3-star"),
                "available": True,
            })
        return {"hotels": hotels, "source": "amadeus"}
    except Exception as exc:
        log.error("Amadeus hotel search error: %s", exc)
        return {"hotels": _mock_hotels(req), "source": "mock_fallback", "error": str(exc)}


def _parse_duration(iso_duration: str) -> int:
    """PT7H10M → 430 minutes."""
    import re
    hours = int(re.search(r"(\d+)H", iso_duration).group(1)) if "H" in iso_duration else 0
    mins = int(re.search(r"(\d+)M", iso_duration).group(1)) if "M" in iso_duration else 0
    return hours * 60 + mins


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("AMADEUS_MCP_PORT", "8101")))
