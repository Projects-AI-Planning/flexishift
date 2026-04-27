from datetime import date
from sqlalchemy.orm import Session

from app.models.user import User, Role, UserStatus
from app.services.maps import haversine_km
from app.services.availability import is_available_on


def search_suppliers(
    db: Session,
    lat: float,
    lng: float,
    radius_km: float = 50.0,
    vehicle_type: str | None = None,
    job_date: date | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    q = db.query(User).filter(
        User.role.in_([Role.DRIVER, Role.FIRM]),
        User.status == UserStatus.ACTIVE,
        User.verified == True,  # noqa: E712 — only verified suppliers shown
        User.deleted_at.is_(None),
        User.location_lat.isnot(None),
        User.location_lng.isnot(None),
    )

    if vehicle_type:
        from app.models.user import UserProfile
        q = q.join(UserProfile, UserProfile.user_id == User.id).filter(
            UserProfile.vehicle_type == vehicle_type
        )

    candidates = q.all()

    nearby = []
    for supplier in candidates:
        dist = haversine_km(lat, lng, float(supplier.location_lat), float(supplier.location_lng))
        if dist > radius_km:
            continue
        if job_date and not is_available_on(db, supplier.id, job_date):
            continue
        supplier._distance_km = round(dist, 2)
        nearby.append(supplier)

    nearby.sort(key=lambda s: s._distance_km)
    total = len(nearby)
    start = (page - 1) * per_page
    items = nearby[start: start + per_page]

    result = []
    for s in items:
        result.append({
            "id": s.id,
            "full_name": s.full_name,
            "email": s.email,
            "phone": s.phone,
            "role": s.role.value,
            "status": s.status.value,
            "profile_complete": s.profile_complete,
            "verified": s.verified,
            "avg_rating": float(s.avg_rating or 0),
            "completed_jobs": s.completed_jobs,
            "location_lat": float(s.location_lat),
            "location_lng": float(s.location_lng),
            "created_at": s.created_at,
            "profile": s.profile,
            "distance_km": s._distance_km,
        })

    return {"items": result, "total": total}
