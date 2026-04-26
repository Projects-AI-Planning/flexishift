from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.dependencies import require_role
from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.models.tracking import TrackingPoint
from app.models.user import User, Role
from app.services.dashboard import driver_dashboard, haulier_dashboard

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

ACTIVE_STATUSES = [JobStatus.PAYMENT_SECURED, JobStatus.IN_TRANSIT]


@router.get("/driver")
def get_driver_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    return driver_dashboard(db, current_user)


@router.get("/driver/earnings")
def driver_earnings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    """Paginated earnings history for driver/firm."""
    q = (
        db.query(Payment, Job)
        .join(Job, Job.id == Payment.job_id)
        .filter(
            Job.selected_supplier_id == current_user.id,
            Payment.status == PaymentStatus.RELEASED,
        )
    )
    total_amount = q.with_entities(func.sum(Payment.amount)).scalar() or 0.0
    total_jobs = q.count()

    rows = (
        q.order_by(Payment.released_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    items = [
        {
            "job_id": job.id,
            "job_ref": job.job_ref,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "released_at": payment.released_at,
        }
        for payment, job in rows
    ]

    return {
        "items": items,
        "total_jobs": total_jobs,
        "total_earnings": float(total_amount),
        "page": page,
        "per_page": per_page,
    }


@router.get("/driver/jobs")
def driver_jobs_history(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    """Paginated job history for driver/firm."""
    q = db.query(Job).filter(
        Job.selected_supplier_id == current_user.id,
        Job.deleted_at.is_(None),
    )
    if status:
        q = q.filter(Job.status == JobStatus(status))

    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/haulier")
def get_haulier_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    return haulier_dashboard(db, current_user)


@router.get("/haulier/spend")
def haulier_spend(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    """Paginated payment/spend history for haulier."""
    q = (
        db.query(Payment, Job)
        .join(Job, Job.id == Payment.job_id)
        .filter(
            Job.haulier_id == current_user.id,
            Payment.status.in_([PaymentStatus.ESCROWED, PaymentStatus.RELEASED, PaymentStatus.REFUNDED]),
        )
    )
    total_spend = (
        q.filter(Payment.status.in_([PaymentStatus.ESCROWED, PaymentStatus.RELEASED]))
        .with_entities(func.sum(Payment.amount))
        .scalar() or 0.0
    )
    total_jobs = q.count()

    rows = (
        q.order_by(Payment.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    items = [
        {
            "job_id": job.id,
            "job_ref": job.job_ref,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "status": payment.status.value,
            "created_at": payment.created_at,
        }
        for payment, job in rows
    ]

    return {
        "items": items,
        "total_jobs": total_jobs,
        "total_spend": float(total_spend),
        "page": page,
        "per_page": per_page,
    }


@router.get("/haulier/active-map")
def haulier_active_map(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    """Active deliveries with last known location for map view."""
    active_jobs = (
        db.query(Job)
        .filter(
            Job.haulier_id == current_user.id,
            Job.status.in_(ACTIVE_STATUSES),
            Job.deleted_at.is_(None),
        )
        .all()
    )

    result = []
    for job in active_jobs:
        last_point = (
            db.query(TrackingPoint)
            .filter(TrackingPoint.job_id == job.id)
            .order_by(TrackingPoint.recorded_at.desc())
            .first()
        )
        result.append({
            "job_id": job.id,
            "job_ref": job.job_ref,
            "status": job.status.value,
            "pickup_address": job.pickup_address,
            "drop_address": job.drop_address,
            "pickup_lat": job.pickup_lat,
            "pickup_lng": job.pickup_lng,
            "drop_lat": job.drop_lat,
            "drop_lng": job.drop_lng,
            "last_lat": last_point.lat if last_point else None,
            "last_lng": last_point.lng if last_point else None,
            "last_seen": last_point.recorded_at if last_point else None,
        })

    return {"jobs": result, "total": len(result)}
