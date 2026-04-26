from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.job import Job, JobStatus
from app.models.user import User, Role
from app.schemas.jobs import JobOut
from app.services import quotes as quotes_svc

router = APIRouter(prefix="/bookings", tags=["Bookings"])

BOOKED_STATUSES = [
    JobStatus.BOOKED, JobStatus.PAYMENT_PENDING, JobStatus.PAYMENT_SECURED,
    JobStatus.IN_TRANSIT, JobStatus.DELIVERY_SUBMITTED,
    JobStatus.COMPLETED, JobStatus.DISPUTED,
]


@router.post("/create", response_model=JobOut)
async def create_booking(
    job_id: str = Query(..., description="Job ID to book"),
    quote_id: str = Query(..., description="Quote ID to select"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    """Select a supplier quote to confirm booking."""
    quote = await quotes_svc.select_quote(db, job_id, quote_id, current_user)
    job = db.get(Job, quote.job_id)
    return job


@router.get("", response_model=dict)
def list_bookings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all bookings (booked jobs) for the current user."""
    q = db.query(Job).filter(
        Job.status.in_(BOOKED_STATUSES),
        Job.deleted_at.is_(None),
    )
    if current_user.role == Role.HAULIER:
        q = q.filter(Job.haulier_id == current_user.id)
    elif current_user.role in (Role.DRIVER, Role.FIRM):
        q = q.filter(Job.selected_supplier_id == current_user.id)

    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/{booking_id}", response_model=JobOut)
def get_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get booking details (booking_id == job_id)."""
    job = db.query(Job).filter(
        Job.id == booking_id,
        Job.status.in_(BOOKED_STATUSES),
        Job.deleted_at.is_(None),
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role not in (Role.ADMIN,):
        if job.haulier_id != current_user.id and job.selected_supplier_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    return job
