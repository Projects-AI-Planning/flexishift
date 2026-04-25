from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, Role
from app.schemas.tracking import TrackingPointIn, TrackingPointOut, TrackingListOut
from app.services import tracking as track_svc

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
