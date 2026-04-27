from datetime import datetime, timezone, date
from calendar import monthrange
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional

from app.core.response import ok
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.document import Document, DocStatus
from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.models.tracking import TrackingPoint
from app.models.user import User, Role, UserStatus
from app.models.compliance import ComplianceRecord

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

ACTIVE_STATUSES = [JobStatus.PAYMENT_SECURED, JobStatus.IN_TRANSIT]
AdminDep = require_role(Role.ADMIN)


# ── Shared helpers ────────────────────────────────────────────────────────────

def _compliance_step_status(record: Optional[ComplianceRecord]) -> dict:
    if not record:
        return {"loadCode": "pending", "handover": "pending", "delivery": "pending"}
    return {
        "loadCode": "completed" if record.load_code_verified_at else "pending",
        "handover": "completed" if record.step1_completed_at else "pending",
        "delivery": "completed" if record.step3_approved_at else (
            "submitted" if record.step2_completed_at else "pending"
        ),
    }


def _driver_snippet(supplier: Optional[User]) -> Optional[dict]:
    if not supplier:
        return None
    p = supplier.profile
    return {
        "name": supplier.full_name,
        "phone": supplier.phone,
        "vehicleNumber": p.vehicle_registration if p else None,
        "vehicleType": p.vehicle_type if p else None,
    }


def _week_ranges(year: int, month: int):
    """Return (label, start_date, end_date) for each week of the month."""
    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])
    weeks = []
    d = first_day
    week_num = 1
    while d <= last_day:
        week_end = min(date(year, month, d.day + 6), last_day)
        weeks.append((f"Week {week_num} ({d.strftime('%b %-d')}–{week_end.strftime('%-d')})", d, week_end))
        d = date(year, month, week_end.day + 1) if week_end.day < last_day.day else last_day + __import__('datetime').timedelta(days=1)
        week_num += 1
    return weeks


# ── Driver Dashboard (APIs 86-89) ─────────────────────────────────────────────

@router.get("/driver/overview")
def driver_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    active_job = db.query(Job).filter(
        Job.selected_supplier_id == current_user.id,
        Job.status.in_(ACTIVE_STATUSES),
        Job.deleted_at.is_(None),
    ).order_by(Job.updated_at.desc()).first()

    today = datetime.now(timezone.utc).date()
    today_completed = db.query(func.count(Job.id)).filter(
        Job.selected_supplier_id == current_user.id,
        Job.status == JobStatus.COMPLETED,
        func.date(Job.updated_at) == today,
        Job.deleted_at.is_(None),
    ).scalar() or 0

    today_earnings = db.query(func.sum(Payment.amount)).join(
        Job, Job.id == Payment.job_id
    ).filter(
        Job.selected_supplier_id == current_user.id,
        Payment.status == PaymentStatus.RELEASED,
        func.date(Payment.released_at) == today,
    ).scalar() or 0.0

    upcoming = db.query(func.count(Job.id)).filter(
        Job.selected_supplier_id == current_user.id,
        Job.status == JobStatus.BOOKED,
        Job.deleted_at.is_(None),
    ).scalar() or 0

    active_job_data = None
    if active_job:
        active_job_data = {
            "jobId": active_job.id,
            "jobReference": active_job.job_ref,
            "status": active_job.status.value.lower(),
            "pickupLocation": active_job.pickup_address,
            "dropLocation": active_job.drop_address,
            "complianceStep": "delivery_report",
        }

    return ok(
        data={
            "driverId": current_user.id,
            "name": current_user.full_name,
            "isVerified": current_user.verified,
            "activeJob": active_job_data,
            "todaySummary": {
                "jobsCompleted": today_completed,
                "todayEarnings": float(today_earnings),
                "currency": "INR",
            },
            "upcomingJobs": upcoming,
            "rating": float(current_user.avg_rating) if current_user.avg_rating else 0.0,
            "completedJobs": current_user.completed_jobs,
            "lastUpdatedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="Driver dashboard fetched successfully.",
    )


@router.get("/driver/earnings")
def driver_earnings(
    period: str = Query("monthly"),
    month: int = Query(None),
    year: int = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    q = (
        db.query(Payment, Job)
        .join(Job, Job.id == Payment.job_id)
        .filter(Job.selected_supplier_id == current_user.id, Payment.status == PaymentStatus.RELEASED)
    )
    all_time_total = q.with_entities(func.sum(Payment.amount)).scalar() or 0.0
    all_time_jobs = q.count()

    month_q = q.filter(
        func.extract("month", Payment.released_at) == m,
        func.extract("year", Payment.released_at) == y,
    )
    month_total = month_q.with_entities(func.sum(Payment.amount)).scalar() or 0.0
    month_jobs = month_q.count()

    recent = month_q.order_by(Payment.released_at.desc()).limit(10).all()
    recent_payments = [
        {
            "paymentId": p.id,
            "jobReference": j.job_ref,
            "amount": float(p.amount),
            "currency": p.currency,
            "paidAt": p.released_at.isoformat() if p.released_at else None,
        }
        for p, j in recent
    ]

    month_name = datetime(y, m, 1).strftime("%B %Y")
    avg = round(float(month_total) / month_jobs, 0) if month_jobs else 0

    return ok(
        data={
            "driverId": current_user.id,
            "period": month_name,
            "summary": {
                "totalEarnings": float(month_total),
                "totalJobs": month_jobs,
                "averagePerJob": avg,
                "currency": "INR",
            },
            "recentPayments": recent_payments,
            "allTimeEarnings": float(all_time_total),
            "allTimeJobs": all_time_jobs,
        },
        message="Earnings fetched successfully.",
    )


@router.get("/driver/jobs/upcoming")
def driver_upcoming_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    q = db.query(Job).filter(
        Job.selected_supplier_id == current_user.id,
        Job.status.in_([JobStatus.BOOKED, JobStatus.PAYMENT_SECURED]),
        Job.deleted_at.is_(None),
    )
    total = q.count()
    items = q.order_by(Job.job_date.asc()).offset((page - 1) * limit).limit(limit).all()

    jobs = []
    for j in items:
        payment = j.payment
        haulier = j.haulier
        jobs.append({
            "jobId": j.id,
            "jobReference": j.job_ref,
            "status": j.status.value.lower(),
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
            "distance": f"{float(j.distance_km):.1f} km" if j.distance_km else None,
            "goodsType": j.goods_type,
            "weight": f"{float(j.weight_kg)} kg" if j.weight_kg else None,
            "jobDate": j.job_date.isoformat() if j.job_date else None,
            "timeSlot": j.time_slot.value if j.time_slot else None,
            "agreedAmount": float(payment.amount) if payment else None,
            "currency": "INR",
            "haulier": {
                "name": haulier.full_name if haulier else None,
                "phone": haulier.phone if haulier else None,
            },
            "paymentSecured": j.status == JobStatus.PAYMENT_SECURED,
        })

    return ok(
        data={"jobs": jobs, "totalUpcoming": total, "page": page, "limit": limit},
        message="Upcoming jobs fetched successfully.",
    )


@router.get("/driver/jobs/history")
def driver_jobs_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    q = db.query(Job).filter(
        Job.selected_supplier_id == current_user.id,
        Job.status == JobStatus.COMPLETED,
        Job.deleted_at.is_(None),
    )
    if start_date:
        q = q.filter(func.date(Job.updated_at) >= start_date)
    if end_date:
        q = q.filter(func.date(Job.updated_at) <= end_date)

    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()
    total_pages = (total + limit - 1) // limit

    jobs = []
    for j in items:
        payment = j.payment
        jobs.append({
            "jobId": j.id,
            "jobReference": j.job_ref,
            "status": j.status.value.lower(),
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
            "distance": f"{float(j.distance_km):.1f} km" if j.distance_km else None,
            "goodsType": j.goods_type,
            "jobDate": j.job_date.isoformat() if j.job_date else None,
            "agreedAmount": float(payment.amount) if payment else None,
            "currency": "INR",
            "completedAt": j.updated_at.isoformat() if j.updated_at else None,
        })

    return ok(
        data={"jobs": jobs, "totalJobs": total, "page": page, "limit": limit, "totalPages": total_pages},
        message="Job history fetched successfully.",
    )


# ── Haulier Dashboard (APIs 90-94) ────────────────────────────────────────────

@router.get("/haulier/overview")
def haulier_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    now = datetime.now(timezone.utc)
    profile = current_user.profile

    active_jobs = db.query(Job).filter(
        Job.haulier_id == current_user.id,
        Job.status.in_(ACTIVE_STATUSES),
        Job.deleted_at.is_(None),
    ).all()

    awaiting = db.query(func.count(Job.id)).filter(
        Job.haulier_id == current_user.id,
        Job.status == JobStatus.DELIVERY_SUBMITTED,
        Job.deleted_at.is_(None),
    ).scalar() or 0

    open_with_quotes = db.query(func.count(Job.id)).filter(
        Job.haulier_id == current_user.id,
        Job.status == JobStatus.OPEN,
        Job.deleted_at.is_(None),
    ).scalar() or 0

    month_jobs = db.query(func.count(Job.id)).filter(
        Job.haulier_id == current_user.id,
        func.extract("month", Job.created_at) == now.month,
        func.extract("year", Job.created_at) == now.year,
        Job.deleted_at.is_(None),
    ).scalar() or 0

    month_spend = db.query(func.sum(Payment.amount)).join(
        Job, Job.id == Payment.job_id
    ).filter(
        Job.haulier_id == current_user.id,
        Payment.status.in_([PaymentStatus.ESCROWED, PaymentStatus.RELEASED]),
        func.extract("month", Payment.created_at) == now.month,
        func.extract("year", Payment.created_at) == now.year,
    ).scalar() or 0.0

    active_job_list = []
    for j in active_jobs[:5]:
        supplier = j.supplier
        active_job_list.append({
            "jobId": j.id,
            "jobReference": j.job_ref,
            "status": j.status.value.lower(),
            "driverName": supplier.full_name if supplier else None,
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
        })

    return ok(
        data={
            "haulierId": current_user.id,
            "companyName": profile.company_name if profile else current_user.full_name,
            "summary": {
                "totalActiveJobs": len(active_jobs),
                "jobsAwaitingApproval": awaiting,
                "openJobsWithQuotes": open_with_quotes,
                "totalJobsThisMonth": month_jobs,
                "totalSpentThisMonth": float(month_spend),
                "currency": "INR",
            },
            "activeJobs": active_job_list,
            "quickActions": ["post_new_job", "view_active_map"],
            "lastUpdatedAt": now.isoformat(),
        },
        message="Haulier dashboard fetched successfully.",
    )


@router.get("/haulier/jobs/active")
def haulier_active_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    q = db.query(Job).filter(
        Job.haulier_id == current_user.id,
        Job.status.in_(ACTIVE_STATUSES),
        Job.deleted_at.is_(None),
    )
    total = q.count()
    items = q.order_by(Job.job_date.asc()).offset((page - 1) * limit).limit(limit).all()

    jobs = []
    for j in items:
        supplier = j.supplier
        payment = j.payment
        last_point = (
            db.query(TrackingPoint)
            .filter(TrackingPoint.job_id == j.id)
            .order_by(TrackingPoint.recorded_at.desc())
            .first()
        )
        jobs.append({
            "jobId": j.id,
            "jobReference": j.job_ref,
            "status": j.status.value.lower(),
            "driver": _driver_snippet(supplier),
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
            "currentLocation": {
                "latitude": float(last_point.lat),
                "longitude": float(last_point.lng),
            } if last_point else None,
            "isDelayed": False,
            "complianceStatus": _compliance_step_status(j.compliance),
            "agreedAmount": float(payment.amount) if payment else None,
            "paymentStatus": payment.status.value.lower() if payment else None,
        })

    return ok(
        data={"jobs": jobs, "totalActiveJobs": total, "page": page, "limit": limit},
        message="Active jobs fetched successfully.",
    )


@router.get("/haulier/jobs/pending-approval")
def haulier_pending_approval(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    q = db.query(Job).filter(
        Job.haulier_id == current_user.id,
        Job.status == JobStatus.DELIVERY_SUBMITTED,
        Job.deleted_at.is_(None),
    )
    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()

    jobs = []
    for j in items:
        supplier = j.supplier
        record = j.compliance
        payment = j.payment
        jobs.append({
            "jobId": j.id,
            "jobReference": j.job_ref,
            "driver": _driver_snippet(supplier),
            "dropLocation": j.drop_address,
            "deliveryProof": {
                "deliveryPhotoUrl": record.delivery_photo_url if record else None,
                "recipientSignatureUrl": record.recipient_signature_url if record else None,
                "deliveryNotes": record.delivery_notes if record else None,
                "submittedAt": record.delivery_submitted_at.isoformat() if record and record.delivery_submitted_at else None,
            },
            "agreedAmount": float(payment.amount) if payment else None,
            "currency": "INR",
            "awaitingApprovalSince": record.delivery_submitted_at.isoformat() if record and record.delivery_submitted_at else j.updated_at.isoformat() if j.updated_at else None,
        })

    return ok(
        data={"jobs": jobs, "totalPending": total, "page": page, "limit": limit},
        message="Jobs pending approval fetched successfully.",
    )


@router.get("/haulier/spend-summary")
def haulier_spend_summary(
    period: str = Query("monthly"),
    month: int = Query(None),
    year: int = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    q = (
        db.query(Payment, Job)
        .join(Job, Job.id == Payment.job_id)
        .filter(
            Job.haulier_id == current_user.id,
            Payment.status.in_([PaymentStatus.ESCROWED, PaymentStatus.RELEASED]),
        )
    )
    all_time_total = q.with_entities(func.sum(Payment.amount)).scalar() or 0.0
    all_time_jobs = q.count()

    month_q = q.filter(
        func.extract("month", Payment.created_at) == m,
        func.extract("year", Payment.created_at) == y,
    )
    month_total = month_q.with_entities(func.sum(Payment.amount)).scalar() or 0.0
    month_jobs = month_q.count()
    avg = round(float(month_total) / month_jobs, 0) if month_jobs else 0

    month_name = datetime(y, m, 1).strftime("%B %Y")

    return ok(
        data={
            "haulierId": current_user.id,
            "period": month_name,
            "summary": {
                "totalSpent": float(month_total),
                "totalJobs": month_jobs,
                "averagePerJob": avg,
                "currency": "INR",
            },
            "allTimeSpent": float(all_time_total),
            "allTimeJobs": all_time_jobs,
        },
        message="Spend summary fetched successfully.",
    )


@router.get("/haulier/active-map")
def haulier_active_map(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    active_jobs = db.query(Job).filter(
        Job.haulier_id == current_user.id,
        Job.status.in_(ACTIVE_STATUSES),
        Job.deleted_at.is_(None),
    ).all()

    deliveries = []
    for j in active_jobs:
        supplier = j.supplier
        last_point = (
            db.query(TrackingPoint)
            .filter(TrackingPoint.job_id == j.id)
            .order_by(TrackingPoint.recorded_at.desc())
            .first()
        )
        p = supplier.profile if supplier else None
        deliveries.append({
            "jobId": j.id,
            "jobReference": j.job_ref,
            "driver": {
                "name": supplier.full_name if supplier else None,
                "vehicleNumber": p.vehicle_registration if p else None,
            },
            "currentLocation": {
                "latitude": float(last_point.lat),
                "longitude": float(last_point.lng),
            } if last_point else None,
            "pickup": {
                "latitude": float(j.pickup_lat) if j.pickup_lat else None,
                "longitude": float(j.pickup_lng) if j.pickup_lng else None,
                "address": j.pickup_address,
            },
            "destination": {
                "latitude": float(j.drop_lat) if j.drop_lat else None,
                "longitude": float(j.drop_lng) if j.drop_lng else None,
                "address": j.drop_address,
            },
            "isDelayed": False,
            "status": j.status.value.lower(),
        })

    return ok(
        data={"totalActiveDeliveries": len(deliveries), "deliveries": deliveries},
        message="Active map data fetched successfully.",
    )


# ── Admin Dashboard (APIs 95-102) ─────────────────────────────────────────────

@router.get("/admin/overview")
def admin_overview(
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    now = datetime.now(timezone.utc)
    today = now.date()

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_drivers = db.query(func.count(User.id)).filter(User.role == Role.DRIVER).scalar() or 0
    total_hauliers = db.query(func.count(User.id)).filter(User.role == Role.HAULIER).scalar() or 0
    total_admins = db.query(func.count(User.id)).filter(User.role == Role.ADMIN).scalar() or 0
    active_today = db.query(func.count(User.id)).filter(User.status == UserStatus.ACTIVE).scalar() or 0

    total_jobs = db.query(func.count(Job.id)).filter(Job.deleted_at.is_(None)).scalar() or 0
    active_jobs = db.query(func.count(Job.id)).filter(Job.status.in_(ACTIVE_STATUSES), Job.deleted_at.is_(None)).scalar() or 0
    completed_jobs = db.query(func.count(Job.id)).filter(Job.status == JobStatus.COMPLETED, Job.deleted_at.is_(None)).scalar() or 0
    cancelled_jobs = db.query(func.count(Job.id)).filter(Job.status == JobStatus.CANCELLED, Job.deleted_at.is_(None)).scalar() or 0
    jobs_today = db.query(func.count(Job.id)).filter(func.date(Job.created_at) == today, Job.deleted_at.is_(None)).scalar() or 0

    total_rev = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.RELEASED).scalar() or 0.0
    month_rev = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.RELEASED,
        func.extract("month", Payment.released_at) == now.month,
        func.extract("year", Payment.released_at) == now.year,
    ).scalar() or 0.0
    today_rev = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.RELEASED,
        func.date(Payment.released_at) == today,
    ).scalar() or 0.0

    pending_docs = db.query(func.count(Document.id)).filter(Document.status == DocStatus.PENDING).scalar() or 0
    active_disputes = db.query(func.count(Job.id)).filter(Job.status == JobStatus.DISPUTED, Job.deleted_at.is_(None)).scalar() or 0
    suspended = db.query(func.count(User.id)).filter(User.status == UserStatus.SUSPENDED).scalar() or 0

    return ok(
        data={
            "platformStats": {
                "totalUsers": total_users,
                "totalDrivers": total_drivers,
                "totalHauliers": total_hauliers,
                "totalAdmins": total_admins,
                "activeUsersToday": active_today,
            },
            "jobStats": {
                "totalJobs": total_jobs,
                "activeJobs": active_jobs,
                "completedJobs": completed_jobs,
                "cancelledJobs": cancelled_jobs,
                "jobsPostedToday": jobs_today,
            },
            "revenueStats": {
                "totalRevenue": float(total_rev),
                "revenueThisMonth": float(month_rev),
                "revenueToday": float(today_rev),
                "currency": "INR",
                "platformCommission": round(float(total_rev) * 0.05, 2),
            },
            "pendingActions": {
                "pendingVerifications": pending_docs,
                "activeDisputes": active_disputes,
                "suspendedUsers": suspended,
            },
            "lastUpdatedAt": now.isoformat(),
        },
        message="Admin dashboard fetched successfully.",
    )


@router.get("/admin/users/list")
def admin_list_users(
    role: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(User).filter(User.deleted_at.is_(None))
    if role:
        try:
            q = q.filter(User.role == Role(role.upper()))
        except ValueError:
            pass
    if status:
        try:
            q = q.filter(User.status == UserStatus(status.upper()))
        except ValueError:
            pass
    if search:
        q = q.filter(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    total = q.count()
    total_pages = (total + limit - 1) // limit
    items = q.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    users = [
        {
            "userId": u.id,
            "name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role.value.lower(),
            "isVerified": u.verified,
            "isProfileComplete": u.profile_complete,
            "accountStatus": u.status.value.lower(),
            "totalJobs": u.completed_jobs,
            "rating": float(u.avg_rating) if u.avg_rating else 0.0,
            "joinedAt": u.created_at.isoformat() if u.created_at else None,
        }
        for u in items
    ]

    return ok(
        data={"users": users, "totalUsers": total, "page": page, "limit": limit, "totalPages": total_pages},
        message="Users fetched successfully.",
    )


class SuspendUserRequest(BaseModel):
    reason: Optional[str] = None
    suspension_duration: Optional[str] = Field(None, alias="suspensionDuration")
    notify_user: bool = Field(True, alias="notifyUser")
    model_config = {"populate_by_name": True}


class ActivateUserRequest(BaseModel):
    reason: Optional[str] = None
    notify_user: bool = Field(True, alias="notifyUser")
    model_config = {"populate_by_name": True}


@router.put("/admin/users/suspend/{user_id}")
def admin_suspend_user(
    user_id: str,
    body: SuspendUserRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(AdminDep),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus.SUSPENDED
    db.commit()
    now = datetime.now(timezone.utc)
    return ok(
        data={
            "userId": user_id,
            "name": user.full_name,
            "accountStatus": "suspended",
            "reason": body.reason,
            "suspendedBy": current_admin.id,
            "suspendedAt": now.isoformat(),
        },
        message="User suspended successfully.",
    )


@router.put("/admin/users/activate/{user_id}")
def admin_activate_user(
    user_id: str,
    body: ActivateUserRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(AdminDep),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus.ACTIVE
    db.commit()
    now = datetime.now(timezone.utc)
    return ok(
        data={
            "userId": user_id,
            "name": user.full_name,
            "accountStatus": "active",
            "activatedBy": current_admin.id,
            "activatedAt": now.isoformat(),
        },
        message="User account activated successfully.",
    )


@router.get("/admin/verifications/pending")
def admin_pending_verifications(
    role: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(User).join(Document, Document.user_id == User.id).filter(
        Document.status == DocStatus.PENDING,
        User.deleted_at.is_(None),
    ).distinct()
    if role:
        try:
            q = q.filter(User.role == Role(role.upper()))
        except ValueError:
            pass
    total = q.count()
    users = q.order_by(User.created_at.asc()).offset((page - 1) * limit).limit(limit).all()

    pending = []
    for u in users:
        docs = db.query(Document).filter(Document.user_id == u.id, Document.status == DocStatus.PENDING).all()
        pending.append({
            "supplierId": u.id,
            "name": u.full_name,
            "role": u.role.value.lower(),
            "email": u.email,
            "phone": u.phone,
            "joinedAt": u.created_at.isoformat() if u.created_at else None,
            "documents": [
                {
                    "documentId": d.id,
                    "documentType": d.doc_type,
                    "fileUrl": d.file_url,
                    "status": d.status.value.lower(),
                    "uploadedAt": d.created_at.isoformat() if d.created_at else None,
                }
                for d in docs
            ],
            "totalPendingDocuments": len(docs),
        })

    return ok(
        data={"pendingVerifications": pending, "totalPending": total, "page": page, "limit": limit},
        message="Pending verifications fetched successfully.",
    )


@router.get("/admin/jobs/monitor")
def admin_monitor_jobs(
    status: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(Job).filter(Job.deleted_at.is_(None))
    if status:
        try:
            q = q.filter(Job.status == JobStatus(status.upper()))
        except ValueError:
            pass
    total = q.count()
    total_pages = (total + limit - 1) // limit
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()

    jobs = []
    for j in items:
        haulier = j.haulier
        supplier = j.supplier
        payment = j.payment
        jobs.append({
            "jobId": j.id,
            "jobReference": j.job_ref,
            "status": j.status.value.lower(),
            "haulier": {
                "name": haulier.full_name if haulier else None,
                "phone": haulier.phone if haulier else None,
            },
            "driver": _driver_snippet(supplier),
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
            "agreedAmount": float(payment.amount) if payment else None,
            "paymentStatus": payment.status.value.lower() if payment else None,
            "jobDate": j.job_date.isoformat() if j.job_date else None,
            "isDelayed": False,
            "hasDispute": j.status == JobStatus.DISPUTED,
            "complianceStatus": _compliance_step_status(j.compliance),
        })

    return ok(
        data={"jobs": jobs, "totalJobs": total, "page": page, "limit": limit},
        message="Jobs monitoring data fetched successfully.",
    )


@router.get("/admin/revenue")
def admin_revenue(
    period: str = Query("monthly"),
    month: int = Query(None),
    year: int = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    month_q = db.query(Payment).filter(
        Payment.status == PaymentStatus.RELEASED,
        func.extract("month", Payment.released_at) == m,
        func.extract("year", Payment.released_at) == y,
    )
    month_total = month_q.with_entities(func.sum(Payment.amount)).scalar() or 0.0
    month_txns = month_q.count()
    commission = round(float(month_total) * 0.05, 2)

    refunded = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.REFUNDED,
        func.extract("month", Payment.created_at) == m,
        func.extract("year", Payment.created_at) == y,
    ).scalar() or 0.0

    all_time_rev = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.RELEASED).scalar() or 0.0
    all_time_txns = db.query(func.count(Payment.id)).filter(Payment.status == PaymentStatus.RELEASED).scalar() or 0

    month_name = datetime(y, m, 1).strftime("%B %Y")

    return ok(
        data={
            "period": month_name,
            "summary": {
                "totalTransactionValue": float(month_total),
                "platformCommission": commission,
                "commissionRate": "5%",
                "totalRefunds": float(refunded),
                "netRevenue": round(commission - float(refunded), 2),
                "currency": "INR",
            },
            "allTimeRevenue": round(float(all_time_rev) * 0.05, 2),
            "allTimeTransactions": all_time_txns,
        },
        message="Revenue report fetched successfully.",
    )


@router.get("/admin/disputes")
def admin_disputes(
    status: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    total_disputes = db.query(func.count(Job.id)).filter(Job.status == JobStatus.DISPUTED, Job.deleted_at.is_(None)).scalar() or 0

    q = db.query(Job).filter(Job.status == JobStatus.DISPUTED, Job.deleted_at.is_(None))
    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()

    disputes = []
    for j in items:
        haulier = j.haulier
        supplier = j.supplier
        record = j.compliance
        payment = j.payment
        disputes.append({
            "disputeId": record.id if record else None,
            "jobReference": j.job_ref,
            "haulier": {
                "name": haulier.full_name if haulier else None,
                "phone": haulier.phone if haulier else None,
            },
            "driver": {
                "name": supplier.full_name if supplier else None,
                "phone": supplier.phone if supplier else None,
            },
            "disputeReason": record.dispute_reason if record else None,
            "paymentOnHold": float(payment.amount) if payment else None,
            "currency": "INR",
            "status": "under_review",
            "raisedAt": record.disputed_at.isoformat() if record and record.disputed_at else None,
        })

    return ok(
        data={
            "summary": {
                "totalDisputes": total_disputes,
                "underReview": total_disputes,
                "resolved": 0,
                "escalated": 0,
            },
            "disputes": disputes,
            "totalDisputes": total,
            "page": page,
            "limit": limit,
        },
        message="Disputes overview fetched successfully.",
    )


# ── Legacy aliases ────────────────────────────────────────────────────────────

@router.get("/driver")
def get_driver_dashboard_legacy(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    return driver_overview(db=db, current_user=current_user)


@router.get("/haulier")
def get_haulier_dashboard_legacy(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    return haulier_overview(db=db, current_user=current_user)
