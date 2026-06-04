import math
import httpx
import structlog

from app.config import settings

log = structlog.get_logger()

GEOCODE_URL      = "https://maps.googleapis.com/maps/api/geocode/json"
DIRECTIONS_URL   = "https://maps.googleapis.com/maps/api/directions/json"
DISTANCE_URL     = "https://maps.googleapis.com/maps/api/distancematrix/json"


def _key() -> str:
    return settings.GOOGLE_MAPS_API_KEY


async def geocode_address(address: str) -> dict:
    """Geocode an address string to lat/lng using Google Geocoding API."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GEOCODE_URL,
            params={"address": address, "key": _key()},
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
    raise ValueError(f"Address not found: {address!r} (status={data.get('status')})")


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
    """Get driving distance and duration using Google Distance Matrix API."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                DISTANCE_URL,
                params={
                    "origins":      f"{origin_lat},{origin_lng}",
                    "destinations": f"{dest_lat},{dest_lng}",
                    "mode":         "driving",
                    "key":          _key(),
                },
                timeout=10,
            )
        data = resp.json()
        element = data["rows"][0]["elements"][0]
        if element["status"] == "OK":
            return {
                "distance_km": round(element["distance"]["value"] / 1000, 2),
                "duration_min": element["duration"]["value"] // 60,
            }
    except Exception as exc:
        log.warning("google_distance_matrix_error", error=str(exc))

    distance = haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
    return {"distance_km": round(distance, 2), "duration_min": int(distance * 1.5)}
