import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

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
    origin_address: str | None = None
    origin_lat: float | None = None
    origin_lng: float | None = None
    dest_address: str | None = None
    dest_lat: float | None = None
    dest_lng: float | None = None


async def _geocode(address: str) -> dict:
    if not settings.GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=503, detail="Google Maps API key not configured")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GEOCODE_URL,
            params={"address": address, "key": settings.GOOGLE_MAPS_API_KEY},
            timeout=10,
        )
    data = resp.json()
    if data.get("status") != "OK" or not data.get("results"):
        raise HTTPException(status_code=422, detail="Address could not be validated")
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
    return await _geocode(body.address)


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
    return {
        "origin_lat": olat,
        "origin_lng": olng,
        "dest_lat": dlat,
        "dest_lng": dlng,
        "distance_km": route["distance_km"],
        "duration_min": route["duration_min"],
    }
