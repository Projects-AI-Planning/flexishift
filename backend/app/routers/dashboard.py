from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.dependencies import require_role, get_current_user
from app.models.document import Document, DocStatus
from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.models.tracking import TrackingPoint
from app.models.user import User, Role, UserStatus
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


# ── Driver sub-endpoints ───────────────────────────────────────────────────────

@router.get("/driver/jobs/upcoming")
def driver_upcoming_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    q = db.query(Job).filter(
        Job.selected_supplier_id == current_user.id,
        Job.status == JobStatus.BOOKED,
        Job.deleted_at.is_(None),
    )
    total = q.count()
    items = q.order_by(Job.job_date.asc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/driver/jobs/history")
def driver_jobs_history_sub(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    q = db.query(Job).filter(
        Job.selected_supplier_id == current_user.id,
        Job.status == JobStatus.COMPLETED,
        Job.deleted_at.is_(None),
    )
    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


# ── Haulier sub-endpoints ──────────────────────────────────────────────────────

@router.get("/haulier/jobs/active")
def haulier_active_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    q = db.query(Job).filter(
        Job.haulier_id == current_user.id,
        Job.status.in_(ACTIVE_STATUSES),
        Job.deleted_at.is_(None),
    )
    total = q.count()
    items = q.order_by(Job.job_date.asc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/haulier/jobs/pending-approval")
def haulier_pending_approval(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    q = db.query(Job).filter(
        Job.haulier_id == current_user.id,
        Job.status == JobStatus.DELIVERY_SUBMITTED,
        Job.deleted_at.is_(None),
    )
    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


# ── Admin dashboard sub-endpoints ─────────────────────────────────────────────

AdminDep = require_role(Role.ADMIN)


@router.get("/admin/overview")
def admin_overview(
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.status == UserStatus.ACTIVE).scalar() or 0
    total_jobs = db.query(func.count(Job.id)).filter(Job.deleted_at.is_(None)).scalar() or 0
    active_jobs = db.query(func.count(Job.id)).filter(
        Job.status.in_(ACTIVE_STATUSES), Job.deleted_at.is_(None)
    ).scalar() or 0
    completed_jobs = db.query(func.count(Job.id)).filter(
        Job.status == JobStatus.COMPLETED, Job.deleted_at.is_(None)
    ).scalar() or 0
    disputed_jobs = db.query(func.count(Job.id)).filter(
        Job.status == JobStatus.DISPUTED, Job.deleted_at.is_(None)
    ).scalar() or 0
    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.RELEASED
    ).scalar() or 0.0
    pending_docs = db.query(func.count(Document.id)).filter(
        Document.status == DocStatus.PENDING
    ).scalar() or 0
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "completed_jobs": completed_jobs,
        "disputed_jobs": disputed_jobs,
        "total_revenue": float(total_revenue),
        "pending_documents": pending_docs,
    }


@router.get("/admin/users/list")
def admin_list_users(
    role: str | None = Query(None),
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(User)
    if role:
        q = q.filter(User.role == Role(role))
    if status:
        q = q.filter(User.status == UserStatus(status))
    total = q.count()
    items = q.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.put("/admin/users/suspend/{user_id}")
def admin_suspend_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    from fastapi import HTTPException
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus.SUSPENDED
    db.commit()
    return {"user_id": user_id, "status": "SUSPENDED"}


@router.put("/admin/users/activate/{user_id}")
def admin_activate_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    from fastapi import HTTPException
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus.ACTIVE
    db.commit()
    return {"user_id": user_id, "status": "ACTIVE"}


@router.get("/admin/verifications/pending")
def admin_pending_verifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(Document).filter(Document.status == DocStatus.PENDING)
    total = q.count()
    items = q.order_by(Document.created_at.asc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/admin/jobs/monitor")
def admin_monitor_jobs(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(Job).filter(Job.deleted_at.is_(None))
    if status:
        q = q.filter(Job.status == JobStatus(status))
    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/admin/revenue")
def admin_revenue(
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    from sqlalchemy import extract
    total = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.RELEASED
    ).scalar() or 0.0
    escrowed = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.ESCROWED
    ).scalar() or 0.0
    refunded = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.REFUNDED
    ).scalar() or 0.0
    total_txns = db.query(func.count(Payment.id)).scalar() or 0
    return {
        "total_released": float(total),
        "total_escrowed": float(escrowed),
        "total_refunded": float(refunded),
        "total_transactions": total_txns,
    }


@router.get("/admin/disputes")
def admin_disputes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(Job).filter(Job.status == JobStatus.DISPUTED, Job.deleted_at.is_(None))
    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}
