import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.response import ok
from app.dependencies import get_current_user
from app.models.user import User
from app.config import settings
from app.services.maps import get_route_info

log = structlog.get_logger()
router = APIRouter(prefix="/maps", tags=["Maps"])

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


class ValidateAddressRequest(BaseModel):
    address: str


class CalculateRouteRequest(BaseModel):
    origin_address: str = Field(None, alias="originAddress")
    origin_lat: float = Field(None, alias="originLat")
    origin_lng: float = Field(None, alias="originLng")
    dest_address: str = Field(None, alias="destAddress")
    dest_lat: float = Field(None, alias="destLat")
    dest_lng: float = Field(None, alias="destLng")
    model_config = {"populate_by_name": True}


async def _geocode_nominatim(address: str) -> dict:
    """Free fallback geocoder using OpenStreetMap Nominatim (no API key required)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": address, "format": "json", "limit": 1, "addressdetails": 1},
            headers={"User-Agent": "FreightFlex/1.0 (logistics-platform)"},
            timeout=10,
        )
    results = resp.json()
    if not results:
        raise HTTPException(status_code=422, detail="Address could not be found. Please enter a more specific address.")
    r = results[0]
    return {
        "formatted_address": r.get("display_name", address),
        "lat": float(r["lat"]),
        "lng": float(r["lon"]),
        "place_id": r.get("place_id"),
    }


async def _geocode(address: str) -> dict:
    if not settings.GOOGLE_MAPS_API_KEY:
        return await _geocode_nominatim(address)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GEOCODE_URL,
            params={"address": address, "key": settings.GOOGLE_MAPS_API_KEY},
            timeout=10,
        )
    data = resp.json()
    if data.get("status") != "OK" or not data.get("results"):
        return await _geocode_nominatim(address)
    result = data["results"][0]
    loc = result["geometry"]["location"]
    return {
        "formatted_address": result["formatted_address"],
        "lat": loc["lat"],
        "lng": loc["lng"],
        "place_id": result.get("place_id"),
    }


@router.post("/validate-address")
async def validate_address(
    body: ValidateAddressRequest,
    current_user: User = Depends(get_current_user),
):
    data = await _geocode(body.address)
    return ok(
        data={
            "formattedAddress": data["formatted_address"],
            "lat": data["lat"],
            "lng": data["lng"],
            "placeId": data["place_id"],
        },
        message="Address validated",
    )


@router.get("/autocomplete")
async def autocomplete_address(
    input: str,
    current_user: User = Depends(get_current_user),
):
    if not settings.GOOGLE_MAPS_API_KEY:
        # Nominatim fallback: search and return top suggestions
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": input, "format": "json", "limit": 5, "addressdetails": 1},
                headers={"User-Agent": "FreightFlex/1.0 (logistics-platform)"},
                timeout=10,
            )
        results = resp.json()
        predictions = [
            {"description": r.get("display_name", ""), "placeId": str(r.get("place_id", ""))}
            for r in results
        ]
        return ok(data={"predictions": predictions, "total": len(predictions)}, message="Autocomplete results")

    AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            AUTOCOMPLETE_URL,
            params={"input": input, "key": settings.GOOGLE_MAPS_API_KEY, "types": "address"},
            timeout=10,
        )
    data = resp.json()
    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        raise HTTPException(status_code=422, detail="Autocomplete failed")
    predictions = [
        {"description": p["description"], "placeId": p["place_id"]}
        for p in data.get("predictions", [])
    ]
    return ok(data={"predictions": predictions, "total": len(predictions)}, message="Autocomplete results")


@router.post("/calculate-route")
async def calculate_route(
    body: CalculateRouteRequest,
    current_user: User = Depends(get_current_user),
):
    if body.origin_lat is None or body.origin_lng is None:
        if not body.origin_address:
            raise HTTPException(status_code=422, detail="Provide origin coords or address")
        origin = await _geocode(body.origin_address)
        olat, olng = origin["lat"], origin["lng"]
    else:
        olat, olng = body.origin_lat, body.origin_lng

    if body.dest_lat is None or body.dest_lng is None:
        if not body.dest_address:
            raise HTTPException(status_code=422, detail="Provide destination coords or address")
        dest = await _geocode(body.dest_address)
        dlat, dlng = dest["lat"], dest["lng"]
    else:
        dlat, dlng = body.dest_lat, body.dest_lng

    route = await get_route_info(olat, olng, dlat, dlng)
    return ok(
        data={
            "originLat": olat,
            "originLng": olng,
            "destLat": dlat,
            "destLng": dlng,
            "distanceKm": route["distance_km"],
            "durationMin": route["duration_min"],
        },
        message="Route calculated",
    )
