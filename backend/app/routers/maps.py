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


async def _osrm_polyline(coords: list[tuple[float, float]]) -> list[dict]:
    """Multi-point OSRM route — coords is a list of (lat, lng) tuples."""
    coord_str = ";".join(f"{lng},{lat}" for lat, lng in coords)
    url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}?geometries=geojson&overview=full"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers={"User-Agent": "FlexiShift/1.0"}, timeout=15)
    data = resp.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        return []
    return [
        {"latitude": lat, "longitude": lon}
        for lon, lat in data["routes"][0]["geometry"]["coordinates"]
    ]


async def _osrm_stats(coords: list[tuple[float, float]]) -> dict | None:
    """Return distance_km + duration_min for a multi-point route via OSRM."""
    coord_str = ";".join(f"{lng},{lat}" for lat, lng in coords)
    url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}?overview=false"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"User-Agent": "FlexiShift/1.0"}, timeout=15)
        data = resp.json()
        if data.get("code") == "Ok" and data.get("routes"):
            r = data["routes"][0]
            return {"distance_km": round(r["distance"] / 1000, 2), "duration_min": int(r["duration"] / 60)}
    except Exception:
        pass
    return None

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
    waypoints: list[dict] = Field(default_factory=list, alias="waypoints")
    model_config = {"populate_by_name": True}


async def _geocode_nominatim(address: str) -> dict:
    """Free fallback geocoder using OpenStreetMap Nominatim (no API key required)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": address, "format": "json", "limit": 1, "addressdetails": 1},
            headers={"User-Agent": "FlexiShift/1.0 (logistics-platform)"},
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


async def _photon_autocomplete(query: str) -> list[dict]:
    """Photon (OpenStreetMap) geocoder — rich POI, building, and street coverage, no key needed."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://photon.komoot.io/api/",
                params={"q": query, "limit": 7, "lang": "en"},
                headers={"User-Agent": "FlexiShift/1.0"},
                timeout=10,
            )
        features = resp.json().get("features", [])
    except Exception:
        return []

    predictions = []
    seen: set[str] = set()
    for f in features:
        props = f.get("properties", {})
        coords = f.get("geometry", {}).get("coordinates", [None, None])  # [lng, lat]

        # Build human-readable description
        parts: list[str] = []
        name = props.get("name", "")
        if name:
            parts.append(name)
        house = props.get("housenumber", "")
        street = props.get("street", "")
        if street:
            parts.append(f"{house} {street}".strip() if house else street)
        elif house:
            parts.append(house)
        if props.get("city"):
            parts.append(props["city"])
        elif props.get("town"):
            parts.append(props["town"])
        if props.get("state"):
            parts.append(props["state"])
        if props.get("country"):
            parts.append(props["country"])

        if not parts:
            continue
        description = ", ".join(parts)
        if description in seen:
            continue
        seen.add(description)

        predictions.append({
            "description": description,
            "placeId": f"photon_{props.get('osm_type', 'N')}{props.get('osm_id', '')}",
            "isGoogle": False,
            "lat": coords[1] if coords[1] is not None else None,
            "lng": coords[0] if coords[0] is not None else None,
        })
    return predictions


@router.get("/autocomplete")
async def autocomplete_address(
    input: str,
    current_user: User = Depends(get_current_user),
):
    # Try Google Places first (returns rich structured data)
    if settings.GOOGLE_MAPS_API_KEY:
        try:
            AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    AUTOCOMPLETE_URL,
                    params={"input": input, "key": settings.GOOGLE_MAPS_API_KEY},
                    timeout=10,
                )
            data = resp.json()
            if data.get("status") in ("OK", "ZERO_RESULTS"):
                predictions = [
                    {"description": p["description"], "placeId": p["place_id"], "isGoogle": True, "lat": None, "lng": None}
                    for p in data.get("predictions", [])
                ]
                return ok(data={"predictions": predictions, "total": len(predictions)}, message="Autocomplete results")
            log.warning("google_places_autocomplete_status", status=data.get("status"))
        except Exception as exc:
            log.warning("google_places_autocomplete_error", error=str(exc))

    # Fallback: Photon (OSM-based, rich POI + building + street coverage)
    predictions = await _photon_autocomplete(input)
    return ok(data={"predictions": predictions, "total": len(predictions)}, message="Autocomplete results")


@router.get("/place-details")
async def get_place_details(
    place_id: str,
    current_user: User = Depends(get_current_user),
):
    """Resolve a Google place_id to formatted address + coordinates."""
    if not settings.GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=503, detail="Place details require Google Maps API key")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            params={
                "place_id": place_id,
                "fields": "formatted_address,geometry,name",
                "key": settings.GOOGLE_MAPS_API_KEY,
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
    # Prepend establishment name when it isn't already part of the formatted address
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

    # Build ordered coordinate list including any waypoints
    all_coords: list[tuple[float, float]] = [(olat, olng)]
    for wp in (body.waypoints or []):
        if wp.get("lat") is not None and wp.get("lng") is not None:
            all_coords.append((wp["lat"], wp["lng"]))
    all_coords.append((dlat, dlng))

    if len(all_coords) > 2:
        route = await _osrm_stats(all_coords) or await get_route_info(olat, olng, dlat, dlng)
    else:
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


async def _reverse_geocode_nominatim(lat: float, lng: float) -> dict | None:
    """Reverse geocode a lat/lng to a town/city name via Nominatim."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lng, "format": "json", "zoom": 10, "addressdetails": 1},
                headers={"User-Agent": "FlexiShift/1.0 (logistics-platform)"},
                timeout=8,
            )
        data = resp.json()
        addr = data.get("address", {})
        # Build a concise place label: "City, County, Country"
        city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("hamlet") or addr.get("suburb") or ""
        county = addr.get("county") or addr.get("state_district") or ""
        country = addr.get("country") or ""
        parts = [p for p in [city, county, country] if p]
        label = ", ".join(parts) if parts else data.get("display_name", "")
        return {"address": label, "lat": lat, "lng": lng}
    except Exception:
        return None


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
    """Suggest intermediate stops along the route between pickup and drop-off."""
    # Resolve coordinates
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

    # Fetch full route geometry from OSRM
    url = (
        f"https://router.project-osrm.org/route/v1/driving/"
        f"{pickup_lng},{pickup_lat};{drop_lng},{drop_lat}"
        "?geometries=geojson&overview=full"
    )
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"User-Agent": "FlexiShift/1.0"}, timeout=15)
        data = resp.json()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Route service unavailable: {exc}")

    if data.get("code") != "Ok" or not data.get("routes"):
        raise HTTPException(status_code=422, detail="Could not calculate route between these locations")

    coords = data["routes"][0]["geometry"]["coordinates"]  # [[lng, lat], ...]
    n = len(coords)

    if n < 4:
        return ok(data={"stops": []}, message="Route too short for intermediate stops")

    # Sample at evenly-spaced interior positions (exclude endpoints)
    step = n / (max_stops + 1)
    sample_indices = [round(step * (i + 1)) for i in range(max_stops)]
    # Clamp to valid interior range
    sample_indices = [max(1, min(idx, n - 2)) for idx in sample_indices]

    import asyncio
    tasks = [
        _reverse_geocode_nominatim(coords[idx][1], coords[idx][0])
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
    waypoints: str = Query(None),  # JSON array: [{"lat":...,"lng":...}, ...]
    current_user: User = Depends(get_current_user),
):
    """Return road-following polyline through origin → optional waypoints → destination."""
    import json as _json

    # Build ordered coordinate list
    all_coords: list[tuple[float, float]] = [(origin_lat, origin_lng)]
    if waypoints:
        try:
            for wp in _json.loads(waypoints):
                if wp.get("lat") is not None and wp.get("lng") is not None:
                    all_coords.append((wp["lat"], wp["lng"]))
        except Exception:
            pass
    all_coords.append((dest_lat, dest_lng))

    # Try Google Directions (supports waypoints natively)
    if settings.GOOGLE_MAPS_API_KEY:
        try:
            params: dict = {
                "origin":      f"{all_coords[0][0]},{all_coords[0][1]}",
                "destination": f"{all_coords[-1][0]},{all_coords[-1][1]}",
                "mode":        "driving",
                "key":         settings.GOOGLE_MAPS_API_KEY,
            }
            if len(all_coords) > 2:
                params["waypoints"] = "|".join(
                    f"{lat},{lng}" for lat, lng in all_coords[1:-1]
                )
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://maps.googleapis.com/maps/api/directions/json",
                    params=params,
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

    # OSRM fallback — handles multiple stops natively
    try:
        coordinates = await _osrm_polyline(all_coords)
        if coordinates:
            return ok(data={"coordinates": coordinates}, message="Route fetched via fallback")
    except Exception as exc:
        log.warning("osrm_fallback_error", error=str(exc))

    raise HTTPException(status_code=503, detail="Route service unavailable")
