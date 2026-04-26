from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.job import Job, JobStatus
from app.models.user import User, Role
from app.services import quotes as quotes_svc
from app.services.jobs import cancel_job

router = APIRouter(prefix="/bookings", tags=["Bookings"])

BOOKED_STATUSES = [
    JobStatus.BOOKED, JobStatus.PAYMENT_PENDING, JobStatus.PAYMENT_SECURED,
    JobStatus.IN_TRANSIT, JobStatus.DELIVERY_SUBMITTED,
    JobStatus.COMPLETED, JobStatus.DISPUTED,
]


def _booking_dict(job: Job) -> dict:
    return {
        "bookingId": job.id,
        "jobRef": job.job_ref,
        "status": job.status.value,
        "haulierId": job.haulier_id,
        "supplierId": job.selected_supplier_id,
        "pickupAddress": job.pickup_address,
        "dropAddress": job.drop_address,
        "jobDate": job.job_date.isoformat() if job.job_date else None,
        "timeSlot": job.time_slot,
        "createdAt": job.created_at.isoformat() if job.created_at else None,
        "updatedAt": job.updated_at.isoformat() if job.updated_at else None,
    }


@router.post("/create", status_code=201)
async def create_booking(
    job_id: str = Query(...),
    quote_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    quote = await quotes_svc.select_quote(db, job_id, quote_id, current_user)
    job = db.get(Job, quote.job_id)
    return created(data=_booking_dict(job), message="Booking confirmed")


@router.get("/list")
@router.get("")
def list_bookings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Job).filter(Job.status.in_(BOOKED_STATUSES), Job.deleted_at.is_(None))
    if current_user.role == Role.HAULIER:
        q = q.filter(Job.haulier_id == current_user.id)
    elif current_user.role in (Role.DRIVER, Role.FIRM):
        q = q.filter(Job.selected_supplier_id == current_user.id)

    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return ok(
        data={"items": [_booking_dict(j) for j in items], "total": total, "page": page, "perPage": per_page},
        message="Bookings retrieved",
    )


@router.get("/{booking_id}")
def get_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    return ok(data=_booking_dict(job), message="Booking retrieved")


@router.put("/cancel/{booking_id}")
def cancel_booking(
    booking_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.ADMIN)),
):
    job = db.query(Job).filter(Job.id == booking_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Booking not found")
    cancel_job(db, booking_id, current_user)
    return ok(data=None, message="Booking cancelled")
