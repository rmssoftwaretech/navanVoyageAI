# Amadeus API Notes

Placeholder — populated during NVA-10 (SearchAgent implementation).

## Sandbox credentials
Set `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` in `.env`.
Sandbox base URL: `https://test.api.amadeus.com`

## Key endpoints used
- `GET /v2/shopping/flight-offers` — flight search
- `GET /v3/shopping/hotel-offers` — hotel search
- `POST /v1/booking/flight-orders` — booking creation (sandbox only)
