from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.job import Job, JobStatus
from app.models.tracking import TrackingPoint
from app.services.maps import get_route_info, haversine_km

ETA_DELAY_THRESHOLD_MINUTES = 15


async def get_eta(db: Session, job_id: str) -> dict:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.IN_TRANSIT:
        raise HTTPException(status_code=422, detail="ETA only available while job is in transit")

    last_point = (
        db.query(TrackingPoint)
        .filter(TrackingPoint.job_id == job_id)
        .order_by(TrackingPoint.recorded_at.desc())
        .first()
    )
    origin_lat = float(last_point.lat) if last_point else float(job.pickup_lat)
    origin_lng = float(last_point.lng) if last_point else float(job.pickup_lng)

    route = await get_route_info(
        origin_lat, origin_lng,
        float(job.drop_lat), float(job.drop_lng),
    )

    now = datetime.now(timezone.utc)
    eta_dt = now + timedelta(minutes=route["duration_min"])

    delay_minutes = None
    is_delayed = False
    if job.original_eta:
        original_eta = job.original_eta
        if original_eta.tzinfo is None:
            original_eta = original_eta.replace(tzinfo=timezone.utc)
        delay_minutes = int((eta_dt - original_eta).total_seconds() / 60)
        is_delayed = delay_minutes > ETA_DELAY_THRESHOLD_MINUTES

    return {
        "job_id": job_id,
        "current_lat": origin_lat,
        "current_lng": origin_lng,
        "last_updated": last_point.recorded_at.isoformat() if last_point else (job.updated_at.isoformat() if job.updated_at else None),
        "remaining_distance_km": route["distance_km"],
        "remaining_duration_min": route["duration_min"],
        "eta": eta_dt.isoformat(),
        "original_eta": job.original_eta.isoformat() if job.original_eta else None,
        "is_delayed": is_delayed,
        "delay_minutes": delay_minutes,
    }
