from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.job import Job, JobStatus
from app.models.tracking import TrackingPoint
from app.core.connection_manager import manager


async def add_tracking_point(
    db: Session, job_id: str, supplier_id: str, lat: float, lng: float, recorded_at: datetime
) -> TrackingPoint:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.selected_supplier_id != supplier_id:
        raise HTTPException(status_code=403, detail="Only the assigned supplier can update tracking")
    if job.status != JobStatus.IN_TRANSIT:
        raise HTTPException(status_code=422, detail="Job is not in transit")

    point = TrackingPoint(job_id=job_id, lat=lat, lng=lng, recorded_at=recorded_at)
    db.add(point)
    db.commit()
    db.refresh(point)

    await manager.broadcast(job_id, {
        "type": "tracking_update",
        "job_id": job_id,
        "lat": float(point.lat),
        "lng": float(point.lng),
        "recorded_at": point.recorded_at.isoformat(),
    })

    return point


def list_tracking(db: Session, job_id: str, current_user_id: str) -> dict:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    points = (
        db.query(TrackingPoint)
        .filter(TrackingPoint.job_id == job_id)
        .order_by(TrackingPoint.recorded_at.asc())
        .all()
    )
    return {"items": points, "total": len(points)}
