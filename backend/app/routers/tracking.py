from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.job import Job
from app.models.user import User, Role
from app.schemas.tracking import TrackingPointIn, TrackingPointOut, TrackingListOut
from app.services import tracking as track_svc
from app.services.eta import get_eta

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
