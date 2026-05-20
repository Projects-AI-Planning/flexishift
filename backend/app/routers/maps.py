import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.response import ok
from app.dependencies import get_current_user
from app.models.user import User
from app.config import settings
from app.services.maps import get_route_info

log = structlog.get_logger()
router = APIRouter(prefix="/maps", tags=["Maps"])


def _decode_polyline(encoded: str) -> list[dict]:
    """Decode Google Maps encoded polyline string to lat/lng coordinate list."""
    coords: list[dict] = []
    index = 0
    lat = 0
    lng = 0
    length = len(encoded)
    while index < length:
        result = shift = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lat += (~(result >> 1) if result & 1 else result >> 1)
        result = shift = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lng += (~(result >> 1) if result & 1 else result >> 1)
        coords.append({"latitude": lat / 1e5, "longitude": lng / 1e5})
    return coords


async def _road_route_osrm(
    origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float
) -> list[dict]:
    """OSRM open-source routing fallback — no API key required."""
    url = (
        f"https://router.project-osrm.org/route/v1/driving/"
        f"{origin_lng},{origin_lat};{dest_lng},{dest_lat}"
        "?geometries=geojson&overview=full"
    )
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            url, headers={"User-Agent": "FreightFlex/1.0"}, timeout=15
        )
    data = resp.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        return []
    return [
        {"latitude": lat, "longitude": lon}
        for lon, lat in data["routes"][0]["geometry"]["coordinates"]
    ]

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


@router.get("/route")
async def get_road_route(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Return road-following polyline coordinates between two lat/lng points.

    Tries Google Maps Directions API first (if GOOGLE_MAPS_API_KEY is set),
    then falls back to the public OSRM demo server.
    """
    if settings.GOOGLE_MAPS_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://maps.googleapis.com/maps/api/directions/json",
                    params={
                        "origin": f"{origin_lat},{origin_lng}",
                        "destination": f"{dest_lat},{dest_lng}",
                        "mode": "driving",
                        "key": settings.GOOGLE_MAPS_API_KEY,
                    },
                    timeout=15,
                )
            data = resp.json()
            if data.get("status") == "OK" and data.get("routes"):
                encoded = data["routes"][0]["overview_polyline"]["points"]
                coordinates = _decode_polyline(encoded)
                return ok(data={"coordinates": coordinates}, message="Route fetched")
            log.warning("google_directions_non_ok", status=data.get("status"))
        except Exception as exc:
            log.warning("google_directions_error", error=str(exc))

    # OSRM fallback
    try:
        coordinates = await _road_route_osrm(origin_lat, origin_lng, dest_lat, dest_lng)
        if coordinates:
            return ok(data={"coordinates": coordinates}, message="Route fetched via fallback")
    except Exception as exc:
        log.warning("osrm_fallback_error", error=str(exc))

    raise HTTPException(status_code=503, detail="Route service unavailable")
