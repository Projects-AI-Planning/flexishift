from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.compliance import ComplianceRecord
from app.models.job import Job, JobStatus
from app.models.payment import Payment
from app.models.quote import Quote, QuoteStatus
from app.models.user import User, Role
from app.services import quotes as quotes_svc
from app.services.jobs import cancel_job

router = APIRouter(prefix="/bookings", tags=["Bookings"])

BOOKED_STATUSES = [
    JobStatus.BOOKED, JobStatus.PAYMENT_PENDING, JobStatus.PAYMENT_SECURED,
    JobStatus.IN_TRANSIT, JobStatus.DELIVERY_SUBMITTED,
    JobStatus.COMPLETED, JobStatus.DISPUTED,
]


class CreateBookingRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    quote_id: str = Field(..., alias="quoteId")

    model_config = {"populate_by_name": True}


class CancelBookingRequest(BaseModel):
    reason: Optional[str] = None


def _compliance_status(record: Optional[ComplianceRecord]) -> str:
    if not record:
        return "PENDING"
    if record.step3_approved_at:
        return "COMPLETED"
    if record.disputed_at:
        return "DISPUTED"
    if record.step2_completed_at:
        return "DELIVERY_SUBMITTED"
    if record.step1_completed_at:
        return "IN_TRANSIT"
    if record.load_code_verified_at:
        return "LOAD_CODE_VERIFIED"
    return "PENDING"


def _booking_dict(job: Job) -> dict:
    haulier = job.haulier
    supplier = job.supplier
    supplier_profile = supplier.profile if supplier else None

    payment = job.payment
    payment_status = payment.status.value if payment else None
    agreed_amount = float(payment.amount) if payment else None

    # Selected quote price — always present even before payment is created
    selected_quote = next(
        (q for q in (job.quotes or []) if q.status == QuoteStatus.SELECTED), None
    )
    quote_amount = float(selected_quote.price) if selected_quote else None
    quote_currency = selected_quote.currency if selected_quote else "INR"

    # Prefer payment amount (final); fall back to the winning quote price
    display_amount = agreed_amount if agreed_amount is not None else quote_amount

    compliance = job.compliance
    compliance_status = _compliance_status(compliance)

    return {
        "bookingId": job.id,
        "jobRef": job.job_ref,
        "status": job.status.value,
        "haulierId": job.haulier_id,
        "haulier": {
            "userId": haulier.id,
            "name": haulier.full_name,
            "email": haulier.email,
            "phone": haulier.phone,
        } if haulier else None,
        "supplierId": job.selected_supplier_id,
        "supplier": {
            "userId": supplier.id,
            "name": supplier.full_name,
            "phone": supplier.phone,
            "photoUrl": supplier_profile.photo_url if supplier_profile else None,
            "vehicleType": supplier_profile.vehicle_type if supplier_profile else None,
            "vehicleNumber": supplier_profile.vehicle_registration if supplier_profile else None,
            "avgRating": float(supplier.avg_rating) if supplier.avg_rating is not None else None,
        } if supplier else None,
        "pickupAddress": job.pickup_address,
        "dropAddress": job.drop_address,
        "jobDate": job.job_date.isoformat() if job.job_date else None,
        "timeSlot": job.time_slot.value if job.time_slot else None,
        "goodsType": job.goods_type,
        "weightKg": float(job.weight_kg) if job.weight_kg is not None else None,
        "vehicleType": job.vehicle_type,
        "distanceKm": float(job.distance_km) if job.distance_km else None,
        "agreedAmount": display_amount,
        "quoteAmount": quote_amount,
        "currency": quote_currency,
        "complianceStatus": compliance_status,
        "paymentStatus": payment_status,
        "createdAt": job.created_at.isoformat() if job.created_at else None,
        "updatedAt": job.updated_at.isoformat() if job.updated_at else None,
    }


@router.post("/create", status_code=201)
async def create_booking(
    body: CreateBookingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    quote = await quotes_svc.select_quote(db, body.job_id, body.quote_id, current_user)
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
    body: CancelBookingRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.ADMIN)),
):
    job = db.query(Job).filter(Job.id == booking_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Booking not found")
    cancel_job(db, booking_id, current_user)
    return ok(
        data={
            "bookingId": booking_id,
            "status": "CANCELLED",
            "reason": body.reason if body else None,
            "cancelledAt": job.updated_at.isoformat() if job.updated_at else None,
        },
        message="Booking cancelled",
    )
