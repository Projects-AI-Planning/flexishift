import asyncio
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

GEOCODE_URL      = "https://maps.googleapis.com/maps/api/geocode/json"
DIRECTIONS_URL   = "https://maps.googleapis.com/maps/api/directions/json"
PLACES_AUTO_URL  = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
PLACE_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"
DISTANCE_URL     = "https://maps.googleapis.com/maps/api/distancematrix/json"


def _key() -> str:
    return settings.GOOGLE_MAPS_API_KEY


def _decode_polyline(encoded: str) -> list[dict]:
    """Decode Google Maps encoded polyline string to lat/lng list."""
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


async def _google_polyline(coords: list[tuple[float, float]]) -> list[dict]:
    """Get road-snapped polyline from Google Directions API."""
    params: dict = {
        "origin":      f"{coords[0][0]},{coords[0][1]}",
        "destination": f"{coords[-1][0]},{coords[-1][1]}",
        "mode":        "driving",
        "key":         _key(),
    }
    if len(coords) > 2:
        params["waypoints"] = "|".join(f"{lat},{lng}" for lat, lng in coords[1:-1])
    async with httpx.AsyncClient() as client:
        resp = await client.get(DIRECTIONS_URL, params=params, timeout=15)
    data = resp.json()
    if data.get("status") == "OK" and data.get("routes"):
        return _decode_polyline(data["routes"][0]["overview_polyline"]["points"])
    log.warning("google_directions_non_ok", status=data.get("status"))
    return []


async def _google_stats(coords: list[tuple[float, float]]) -> dict | None:
    """Get distance + duration for a multi-point route via Google Directions."""
    params: dict = {
        "origin":      f"{coords[0][0]},{coords[0][1]}",
        "destination": f"{coords[-1][0]},{coords[-1][1]}",
        "mode":        "driving",
        "key":         _key(),
    }
    if len(coords) > 2:
        params["waypoints"] = "|".join(f"{lat},{lng}" for lat, lng in coords[1:-1])
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(DIRECTIONS_URL, params=params, timeout=15)
        data = resp.json()
        if data.get("status") == "OK" and data.get("routes"):
            legs = data["routes"][0].get("legs", [])
            total_dist = sum(leg["distance"]["value"] for leg in legs)
            total_dur  = sum(leg["duration"]["value"] for leg in legs)
            return {
                "distance_km": round(total_dist / 1000, 2),
                "duration_min": total_dur // 60,
            }
    except Exception:
        pass
    return None


async def _geocode(address: str) -> dict:
    """Geocode via Google Geocoding API."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GEOCODE_URL,
            params={"address": address, "key": _key()},
            timeout=10,
        )
    data = resp.json()
    if data.get("status") != "OK" or not data.get("results"):
        raise HTTPException(
            status_code=422,
            detail=f"Address could not be found: {address!r} (status={data.get('status')})",
        )
    result = data["results"][0]
    loc = result["geometry"]["location"]
    return {
        "formatted_address": result["formatted_address"],
        "lat": loc["lat"],
        "lng": loc["lng"],
        "place_id": result.get("place_id"),
    }


async def _reverse_geocode(lat: float, lng: float) -> dict | None:
    """Reverse geocode lat/lng to address using Google Geocoding API."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                GEOCODE_URL,
                params={"latlng": f"{lat},{lng}", "key": _key()},
                timeout=8,
            )
        data = resp.json()
        if data.get("status") == "OK" and data.get("results"):
            result = data["results"][0]
            components = result.get("address_components", [])
            city = next(
                (c["long_name"] for c in components if "locality" in c.get("types", [])), ""
            )
            county = next(
                (c["long_name"] for c in components if "administrative_area_level_2" in c.get("types", [])), ""
            )
            country = next(
                (c["long_name"] for c in components if "country" in c.get("types", [])), ""
            )
            parts = [p for p in [city, county, country] if p]
            label = ", ".join(parts) if parts else result.get("formatted_address", "")
            return {"address": label, "lat": lat, "lng": lng}
    except Exception:
        pass
    return None


class ValidateAddressRequest(BaseModel):
    address: str


class CalculateRouteRequest(BaseModel):
    origin_address: str = Field(None, alias="originAddress")
    origin_lat: float = Field(None, alias="originLat")
    origin_lng: float = Field(None, alias="originLng")
    dest_address: str = Field(None, alias="destAddress")
    dest_lat: float = Field(None, alias="destLat")
    dest_lng: float = Field(None, alias="destLng")
    waypoints: list[dict] = Field(default_factory=list, alias="waypoints")
    model_config = {"populate_by_name": True}


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
    """Address autocomplete using Google Places API."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                PLACES_AUTO_URL,
                params={"input": input, "key": _key()},
                timeout=10,
            )
        data = resp.json()
        if data.get("status") in ("OK", "ZERO_RESULTS"):
            predictions = [
                {
                    "description": p["description"],
                    "placeId": p["place_id"],
                    "isGoogle": True,
                    "lat": None,
                    "lng": None,
                }
                for p in data.get("predictions", [])
            ]
            return ok(data={"predictions": predictions, "total": len(predictions)}, message="Autocomplete results")
        log.warning("google_places_autocomplete_status", status=data.get("status"))
    except Exception as exc:
        log.warning("google_places_autocomplete_error", error=str(exc))

    raise HTTPException(status_code=503, detail="Autocomplete service unavailable")


@router.get("/place-details")
async def get_place_details(
    place_id: str,
    current_user: User = Depends(get_current_user),
):
    """Resolve a Google place_id to formatted address + coordinates."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            PLACE_DETAIL_URL,
            params={
                "place_id": place_id,
                "fields": "formatted_address,geometry,name",
                "key": _key(),
            },
            timeout=10,
        )
    data = resp.json()
    if data.get("status") != "OK" or not data.get("result"):
        raise HTTPException(status_code=422, detail="Place not found")
    result = data["result"]
    loc  = result["geometry"]["location"]
    name = result.get("name", "")
    fmt  = result.get("formatted_address", "")
    display = f"{name}, {fmt}" if name and name not in fmt else fmt
    return ok(data={"formattedAddress": display, "lat": loc["lat"], "lng": loc["lng"]}, message="Place details fetched")


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

    all_coords: list[tuple[float, float]] = [(olat, olng)]
    for wp in (body.waypoints or []):
        if wp.get("lat") is not None and wp.get("lng") is not None:
            all_coords.append((wp["lat"], wp["lng"]))
    all_coords.append((dlat, dlng))

    if len(all_coords) > 2:
        route = await _google_stats(all_coords) or await get_route_info(olat, olng, dlat, dlng)
    else:
        route = await get_route_info(olat, olng, dlat, dlng)

    return ok(
        data={
            "originLat": olat, "originLng": olng,
            "destLat": dlat,   "destLng": dlng,
            "distanceKm":  route["distance_km"],
            "durationMin": route["duration_min"],
        },
        message="Route calculated",
    )


@router.get("/route-stops")
async def get_route_stops(
    pickup_address: str = Query(None, alias="pickupAddress"),
    drop_address: str = Query(None, alias="dropAddress"),
    pickup_lat: float = Query(None, alias="pickupLat"),
    pickup_lng: float = Query(None, alias="pickupLng"),
    drop_lat: float = Query(None, alias="dropLat"),
    drop_lng: float = Query(None, alias="dropLng"),
    max_stops: int = Query(3, alias="maxStops", ge=1, le=5),
    current_user: User = Depends(get_current_user),
):
    """Suggest intermediate stops along the route using Google Directions."""
    if pickup_lat is None or pickup_lng is None:
        if not pickup_address:
            raise HTTPException(status_code=422, detail="Provide pickupAddress or pickupLat/pickupLng")
        geo = await _geocode(pickup_address)
        pickup_lat, pickup_lng = geo["lat"], geo["lng"]
    if drop_lat is None or drop_lng is None:
        if not drop_address:
            raise HTTPException(status_code=422, detail="Provide dropAddress or dropLat/dropLng")
        geo = await _geocode(drop_address)
        drop_lat, drop_lng = geo["lat"], geo["lng"]

    # Get full route polyline from Google Directions
    coords = await _google_polyline([(pickup_lat, pickup_lng), (drop_lat, drop_lng)])
    if not coords:
        raise HTTPException(status_code=422, detail="Could not calculate route between these locations")

    n = len(coords)
    if n < 4:
        return ok(data={"stops": []}, message="Route too short for intermediate stops")

    step = n / (max_stops + 1)
    sample_indices = [round(step * (i + 1)) for i in range(max_stops)]
    sample_indices = [max(1, min(idx, n - 2)) for idx in sample_indices]

    tasks = [
        _reverse_geocode(coords[idx]["latitude"], coords[idx]["longitude"])
        for idx in sample_indices
    ]
    results = await asyncio.gather(*tasks)

    stops = []
    seen_cities: set[str] = set()
    for order, result in enumerate(results, 1):
        if result and result["address"]:
            city_key = result["address"].split(",")[0].strip().lower()
            if city_key not in seen_cities:
                seen_cities.add(city_key)
                stops.append({**result, "order": order})

    return ok(data={"stops": stops}, message="Route stops suggested")


@router.get("/route")
async def get_road_route(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
    waypoints: str = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Return road-following polyline via Google Directions API."""
    import json as _json

    all_coords: list[tuple[float, float]] = [(origin_lat, origin_lng)]
    if waypoints:
        try:
            for wp in _json.loads(waypoints):
                if wp.get("lat") is not None and wp.get("lng") is not None:
                    all_coords.append((wp["lat"], wp["lng"]))
        except Exception:
            pass
    all_coords.append((dest_lat, dest_lng))

    try:
        coordinates = await _google_polyline(all_coords)
        if coordinates:
            return ok(data={"coordinates": coordinates}, message="Route fetched")
        log.warning("google_directions_empty_polyline")
    except Exception as exc:
        log.warning("google_directions_error", error=str(exc))

    raise HTTPException(status_code=503, detail="Route service unavailable")
