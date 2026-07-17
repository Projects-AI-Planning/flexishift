from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.job import Job, JobStatus
from app.models.tracking import TrackingPoint
from app.models.user import User, Role
from app.schemas.tracking import TrackingPointIn
from app.services import tracking as track_svc
from app.services.eta import get_eta

# ── Flat /tracking/* router (Mobile spec paths) ───────────────────────────────

flat = APIRouter(prefix="/tracking", tags=["Tracking"])


class UpdateLocationRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    latitude: float
    longitude: float
    speed: Optional[float] = None
    heading: Optional[float] = None
    accuracy: Optional[float] = None
    recorded_at: Optional[datetime] = Field(None, alias="recordedAt")
    model_config = {"populate_by_name": True}


class StopTrackingRequest(BaseModel):
    booking_id: Optional[str] = Field(None, alias="bookingId")
    final_location: Optional[dict] = Field(None, alias="finalLocation")
    model_config = {"populate_by_name": True}


class DelayAlertRequest(BaseModel):
    booking_id: Optional[str] = Field(None, alias="bookingId")
    delay_minutes: Optional[int] = Field(None, alias="delayMinutes")
    delay_reason: Optional[str] = Field(None, alias="delayReason")
    new_eta: Optional[str] = Field(None, alias="newETA")
    model_config = {"populate_by_name": True}


def _driver_snippet(supplier: Optional[User]) -> Optional[dict]:
    if not supplier:
        return None
    profile = supplier.profile
    return {
        "driverId": supplier.id,
        "name": supplier.full_name,
        "phone": supplier.phone,
        "vehicleNumber": profile.vehicle_registration if profile else None,
        "vehicleType": profile.vehicle_type if profile else None,
    }


@flat.post("/update-location", status_code=201)
async def update_location(
    body: UpdateLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    point = await track_svc.add_tracking_point(
        db, body.job_id, current_user.id, body.latitude, body.longitude, body.recorded_at
    )
    return created(
        data={
            "trackingId": point.id,
            "jobId": body.job_id,
            "latitude": body.latitude,
            "longitude": body.longitude,
            "speed": body.speed,
            "heading": body.heading,
            "accuracy": body.accuracy,
            "recordedAt": point.recorded_at.isoformat() if point.recorded_at else None,
        },
        message="Location updated",
    )


@flat.get("/live/{job_id}")
def get_live_location(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.IN_TRANSIT:
        raise HTTPException(status_code=400, detail="Tracking is not active for this job.")

    last = (
        db.query(TrackingPoint)
        .filter(TrackingPoint.job_id == job_id)
        .order_by(TrackingPoint.recorded_at.desc())
        .first()
    )
    current_lat = float(last.lat) if last else float(job.pickup_lat)
    current_lng = float(last.lng) if last else float(job.pickup_lng)
    last_updated = last.recorded_at.isoformat() if last else (job.updated_at.isoformat() if job.updated_at else None)
    tracking_id = last.id if last else None

    supplier = db.get(User, job.selected_supplier_id) if job.selected_supplier_id else None
    return ok(
        data={
            "trackingId": tracking_id,
            "jobId": job_id,
            "jobReference": job.job_ref,
            "driver": _driver_snippet(supplier),
            "currentLocation": {
                "latitude": current_lat,
                "longitude": current_lng,
            },
            "status": "active",
            "lastUpdatedAt": last_updated,
        },
        message="Live location fetched successfully.",
    )


@flat.get("/history/{job_id}")
def get_tracking_history(
    job_id: str,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    q = db.query(TrackingPoint).filter(TrackingPoint.job_id == job_id).order_by(TrackingPoint.recorded_at.asc())
    total = q.count()
    points = q.offset((page - 1) * limit).limit(limit).all()

    first_point = (
        db.query(TrackingPoint)
        .filter(TrackingPoint.job_id == job_id)
        .order_by(TrackingPoint.recorded_at.asc())
        .first()
    )
    last_point = (
        db.query(TrackingPoint)
        .filter(TrackingPoint.job_id == job_id)
        .order_by(TrackingPoint.recorded_at.desc())
        .first()
    )

    location_history = [
        {
            "latitude": float(p.lat),
            "longitude": float(p.lng),
            "timestamp": p.recorded_at.isoformat() if p.recorded_at else None,
        }
        for p in points
    ]

    return ok(
        data={
            "jobId": job_id,
            "jobReference": job.job_ref,
            "locationHistory": location_history,
            "totalPoints": total,
            "startedAt": first_point.recorded_at.isoformat() if first_point else None,
            "completedAt": last_point.recorded_at.isoformat() if last_point and job.status == JobStatus.COMPLETED else None,
            "page": page,
            "limit": limit,
        },
        message="Tracking history fetched successfully.",
    )


@flat.get("/eta/{job_id}")
async def flat_job_eta(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    eta_data = await get_eta(db, job_id)

    last = (
        db.query(TrackingPoint)
        .filter(TrackingPoint.job_id == job_id)
        .order_by(TrackingPoint.recorded_at.desc())
        .first()
    )
    origin_lat = float(last.lat) if last else float(job.pickup_lat)
    origin_lng = float(last.lng) if last else float(job.pickup_lng)

    return ok(
        data={
            "jobId": job_id,
            "jobReference": job.job_ref,
            "destination": {
                "address": job.drop_address,
                "latitude": float(job.drop_lat) if job.drop_lat else None,
                "longitude": float(job.drop_lng) if job.drop_lng else None,
            },
            "currentLocation": {
                "latitude": origin_lat,
                "longitude": origin_lng,
            },
            "originalETA": job.original_eta.isoformat() if job.original_eta else None,
            "lastCalculatedAt": datetime.now(timezone.utc).isoformat(),
            **eta_data,
        },
        message="ETA fetched successfully.",
    )


@flat.post("/start/{job_id}")
async def flat_start_tracking(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job or job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found or forbidden")
    if job.status == JobStatus.PAYMENT_SECURED:
        job.status = JobStatus.IN_TRANSIT
        db.commit()
    from app.services.notifications import create_notification
    await create_notification(
        db, job.haulier_id, "TRIP_STARTED", "Trip Started",
        f"Driver has started the trip for job {job.job_ref}.",
        data={"job_id": job_id},
    )
    db.commit()
    return ok(data={"jobId": job_id, "status": job.status.value}, message="Tracking started")


@flat.post("/stop/{job_id}")
async def flat_stop_tracking(
    job_id: str,
    body: StopTrackingRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job or job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found or forbidden")

    first_point = (
        db.query(TrackingPoint)
        .filter(TrackingPoint.job_id == job_id)
        .order_by(TrackingPoint.recorded_at.asc())
        .first()
    )
    last_point = (
        db.query(TrackingPoint)
        .filter(TrackingPoint.job_id == job_id)
        .order_by(TrackingPoint.recorded_at.desc())
        .first()
    )

    from app.services.notifications import create_notification
    await create_notification(
        db, job.haulier_id, "TRACKING_STOPPED", "Driver Arrived",
        f"Driver has reached the destination for job {job.job_ref}.",
        data={"job_id": job_id},
    )
    db.commit()
    return ok(
        data={
            "jobId": job_id,
            "jobReference": job.job_ref,
            "status": "completed",
            "finalLocation": body.final_location if body and body.final_location else None,
            "startedAt": first_point.recorded_at.isoformat() if first_point else None,
            "stoppedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="Tracking session stopped successfully.",
    )


@flat.post("/delay-alert/{job_id}")
async def flat_delay_alert(
    job_id: str,
    body: DelayAlertRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job or job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found or forbidden")

    haulier = db.get(User, job.haulier_id)
    now = datetime.now(timezone.utc)

    from app.services.notifications import create_notification
    from uuid import uuid4
    await create_notification(
        db, job.haulier_id, "DELAY_ALERT", "Delivery Delay Alert",
        f"Driver has reported a delay on job {job.job_ref}.",
        data={"job_id": job_id, "job_ref": job.job_ref},
    )
    db.commit()
    return ok(
        data={
            "jobId": job_id,
            "alertId": f"alt_{str(uuid4())[:8]}",
            "delayMinutes": body.delay_minutes if body else None,
            "newETA": body.new_eta if body else None,
            "notifiedTo": {
                "haulierId": job.haulier_id,
                "name": haulier.full_name if haulier else None,
            },
            "sentVia": ["push_notification"],
            "sentAt": now.isoformat(),
        },
        message="Delay alert sent to haulier successfully.",
    )


# ── Job-scoped /jobs/:id/tracking/* endpoints ─────────────────────────────────

router = APIRouter(prefix="/jobs", tags=["Tracking"])


@router.post("/{job_id}/tracking", status_code=201)
async def add_tracking_point(
    job_id: str,
    body: TrackingPointIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    point = await track_svc.add_tracking_point(
        db, job_id, current_user.id, body.lat, body.lng, body.recorded_at
    )
    return created(
        data={
            "trackingId": point.id,
            "jobId": job_id,
            "latitude": float(point.lat),
            "longitude": float(point.lng),
            "recordedAt": point.recorded_at.isoformat() if point.recorded_at else None,
        },
        message="Location recorded",
    )


@router.get("/{job_id}/tracking")
def list_tracking(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = track_svc.list_tracking(db, job_id, current_user.id)
    points = [
        {
            "trackingId": p.id,
            "latitude": float(p.lat),
            "longitude": float(p.lng),
            "recordedAt": p.recorded_at.isoformat() if p.recorded_at else None,
        }
        for p in result["items"]
    ]
    return ok(data={"jobId": job_id, "items": points, "total": result["total"]}, message="Tracking history retrieved")


@router.get("/{job_id}/eta")
async def job_eta(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    eta = await get_eta(db, job_id)
    return ok(data=eta, message="ETA retrieved")


@router.post("/{job_id}/tracking/start")
async def start_tracking(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if job.status not in (JobStatus.PAYMENT_SECURED, JobStatus.IN_TRANSIT):
        raise HTTPException(status_code=422, detail="Job must be PAYMENT_SECURED to start tracking")
    if job.status == JobStatus.PAYMENT_SECURED:
        job.status = JobStatus.IN_TRANSIT
        db.commit()
    from app.services.notifications import create_notification
    await create_notification(
        db, job.haulier_id, "TRIP_STARTED",
        "Trip Started", f"Driver has started the trip for job {job.job_ref}.",
        data={"job_id": job_id},
    )
    db.commit()
    return ok(data={"jobId": job_id, "status": job.status.value}, message="Tracking started")


@router.post("/{job_id}/tracking/stop")
async def stop_tracking(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.services.notifications import create_notification
    await create_notification(
        db, job.haulier_id, "TRACKING_STOPPED",
        "Driver Arrived", f"Driver has reached the destination for job {job.job_ref}.",
        data={"job_id": job_id},
    )
    db.commit()
    return ok(data={"jobId": job_id, "status": job.status.value}, message="Tracking stopped")


@router.post("/{job_id}/tracking/delay-alert")
async def send_delay_alert(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.services.notifications import create_notification
    await create_notification(
        db, job.haulier_id, "DELAY_ALERT",
        "Delivery Delay Alert", f"Driver has reported a delay on job {job.job_ref}. Please check ETA.",
        data={"job_id": job_id, "job_ref": job.job_ref},
    )
    db.commit()
    return ok(data=None, message="Delay alert sent to haulier")
