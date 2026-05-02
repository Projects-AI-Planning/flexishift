import math
import httpx
import structlog

from app.config import settings

log = structlog.get_logger()

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {"User-Agent": "FreightFlex/1.0 (logistics-platform)"}
GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


async def geocode_address(address: str) -> dict:
    """Geocode an address string to lat/lng. Uses Google Maps if key configured, else Nominatim."""
    if settings.GOOGLE_MAPS_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    GEOCODE_URL,
                    params={"address": address, "key": settings.GOOGLE_MAPS_API_KEY},
                    timeout=10,
                )
            data = resp.json()
            if data.get("status") == "OK" and data.get("results"):
                result = data["results"][0]
                loc = result["geometry"]["location"]
                return {
                    "formatted_address": result["formatted_address"],
                    "lat": loc["lat"],
                    "lng": loc["lng"],
                }
        except Exception as exc:
            log.warning("google_geocode_error", error=str(exc))

    # Nominatim fallback (free, no key required)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            NOMINATIM_URL,
            params={"q": address, "format": "json", "limit": 1, "addressdetails": 1},
            headers=NOMINATIM_HEADERS,
            timeout=10,
        )
    results = resp.json()
    if not results:
        raise ValueError(f"Address not found: {address!r}")
    r = results[0]
    return {
        "formatted_address": r.get("display_name", address),
        "lat": float(r["lat"]),
        "lng": float(r["lon"]),
    }


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def get_route_info(
    origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float
) -> dict:
    if not settings.GOOGLE_MAPS_API_KEY:
        distance = haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
        return {"distance_km": round(distance, 2), "duration_min": int(distance * 1.5)}

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": f"{origin_lat},{origin_lng}",
        "destinations": f"{dest_lat},{dest_lng}",
        "mode": "driving",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10)
            data = resp.json()
        element = data["rows"][0]["elements"][0]
        if element["status"] == "OK":
            return {
                "distance_km": round(element["distance"]["value"] / 1000, 2),
                "duration_min": element["duration"]["value"] // 60,
            }
    except Exception as exc:
        log.warning("maps_api_error", error=str(exc))

    distance = haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
    return {"distance_km": round(distance, 2), "duration_min": int(distance * 1.5)}
