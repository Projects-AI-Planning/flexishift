from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.job import Job
from app.models.tracking import TrackingPoint
from app.models.user import User, Role
from app.schemas.tracking import TrackingPointIn, TrackingPointOut, TrackingListOut
from app.services import tracking as track_svc
from app.services.eta import get_eta

router = APIRouter(prefix="/jobs", tags=["Tracking"])

# ── Flat /tracking/* router (Mobile spec paths) ───────────────────────────────

flat = APIRouter(prefix="/tracking", tags=["Tracking"])


class UpdateLocationRequest(BaseModel):
    job_id: str
    lat: float
    lng: float
    recorded_at: Optional[datetime] = None


@flat.post("/update-location", response_model=TrackingPointOut, status_code=201)
async def update_location(
    body: UpdateLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    return await track_svc.add_tracking_point(
        db, body.job_id, current_user.id, body.lat, body.lng, body.recorded_at
    )


@flat.get("/live/{job_id}")
def get_live_location(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    last = (
        db.query(TrackingPoint)
        .filter(TrackingPoint.job_id == job_id)
        .order_by(TrackingPoint.recorded_at.desc())
        .first()
    )
    if not last:
        raise HTTPException(status_code=404, detail="No tracking data yet")
    return {"job_id": job_id, "lat": last.lat, "lng": last.lng, "recorded_at": last.recorded_at}


@flat.get("/history/{job_id}", response_model=TrackingListOut)
def get_tracking_history(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return track_svc.list_tracking(db, job_id, current_user.id)


@flat.get("/eta/{job_id}")
async def flat_job_eta(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_eta(db, job_id)


@flat.post("/start/{job_id}")
async def flat_start_tracking(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job or job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found or forbidden")
    from app.models.job import JobStatus
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
    return {"detail": "Tracking started", "job_id": job_id, "status": job.status.value}


@flat.post("/stop/{job_id}")
async def flat_stop_tracking(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job or job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found or forbidden")
    from app.services.notifications import create_notification
    await create_notification(
        db, job.haulier_id, "TRACKING_STOPPED", "Driver Arrived",
        f"Driver has reached the destination for job {job.job_ref}.",
        data={"job_id": job_id},
    )
    db.commit()
    return {"detail": "Tracking stopped", "job_id": job_id, "status": job.status.value}


@flat.post("/delay-alert/{job_id}")
async def flat_delay_alert(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job or job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found or forbidden")
    from app.services.notifications import create_notification
    await create_notification(
        db, job.haulier_id, "DELAY_ALERT", "Delivery Delay Alert",
        f"Driver has reported a delay on job {job.job_ref}.",
        data={"job_id": job_id, "job_ref": job.job_ref},
    )
    db.commit()
    return {"detail": "Delay alert sent"}


router = APIRouter(prefix="/jobs", tags=["Tracking"])


@router.post("/{job_id}/tracking", response_model=TrackingPointOut, status_code=201)
async def add_tracking_point(
    job_id: str,
    body: TrackingPointIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    return await track_svc.add_tracking_point(
        db, job_id, current_user.id, body.lat, body.lng, body.recorded_at
    )


@router.get("/{job_id}/tracking", response_model=TrackingListOut)
def list_tracking(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return track_svc.list_tracking(db, job_id, current_user.id)


@router.get("/{job_id}/eta")
async def job_eta(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_eta(db, job_id)


@router.post("/{job_id}/tracking/start")
async def start_tracking(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    """Signal that the driver has started the trip; transitions PAYMENT_SECURED → IN_TRANSIT."""
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    from app.models.job import JobStatus
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
    return {"detail": "Tracking started", "job_id": job_id, "status": job.status.value}


@router.post("/{job_id}/tracking/stop")
async def stop_tracking(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    """Signal that the driver has reached the destination and stopped GPS tracking."""
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
    return {"detail": "Tracking stopped", "job_id": job_id, "status": job.status.value}


@router.post("/{job_id}/tracking/delay-alert")
async def send_delay_alert(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    """Manually trigger a delay notification to the haulier."""
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    from app.services.notifications import create_notification
    await create_notification(
        db,
        job.haulier_id,
        "DELAY_ALERT",
        "Delivery Delay Alert",
        f"Driver has reported a delay on job {job.job_ref}. Please check ETA.",
        data={"job_id": job_id, "job_ref": job.job_ref},
    )
    db.commit()
    return {"detail": "Delay alert sent to haulier"}
