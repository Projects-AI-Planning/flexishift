from datetime import datetime, timezone, date, timedelta
from calendar import monthrange
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import Optional

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.availability import AvailabilityBlock, AvailabilitySlot
from app.models.document import Document, DocStatus
from app.models.job import Job, JobStatus
from app.models.quote import Quote, QuoteStatus
from app.models.payment import Payment, PaymentStatus
from app.models.tracking import TrackingPoint
from app.models.user import User, Role, UserStatus, UserProfile
from app.models.compliance import ComplianceRecord
from app.models.tracking import TrackingPoint
from app.services.availability import is_available_on
from app.services import suppliers as sup_svc

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


def _supplier_search_snippet(item: dict) -> dict:
    profile = item.get("profile")
    return {
        "supplierId": item.get("id"),
        "name": item.get("full_name"),
        "email": item.get("email"),
        "phone": item.get("phone"),
        "role": item.get("role"),
        "status": item.get("status"),
        "avgRating": float(item.get("avg_rating") or 0),
        "completedJobs": item.get("completed_jobs") or 0,
        "distanceKm": item.get("distance_km"),
        "vehicleType": profile.vehicle_type if profile else None,
        "vehicleRegistration": profile.vehicle_registration if profile else None,
        "licenseNumber": profile.licence_number if profile else None,
        "coverageArea": profile.coverage_area if profile else None,
    }


def _quote_snippet(quote: Quote) -> dict:
    supplier = quote.supplier
    return {
        "quoteId": quote.id,
        "supplierId": quote.supplier_id,
        "supplierName": supplier.full_name if supplier else None,
        "supplierPhone": supplier.phone if supplier else None,
        "amount": float(quote.price),
        "currency": quote.currency,
        "status": quote.status.value if quote.status else None,
        "createdAt": quote.created_at.isoformat() if quote.created_at else None,
        "updatedAt": quote.updated_at.isoformat() if quote.updated_at else None,
    }


def _job_load_snippet(job: Job) -> dict:
    supplier = job.supplier
    payment = job.payment
    return {
        "jobId": job.id,
        "jobReference": job.job_ref,
        "loadCode": job.load_code,
        "status": job.status.value.lower(),
        "pickupLocation": job.pickup_address,
        "dropLocation": job.drop_address,
        "goodsType": job.goods_type,
        "vehicleType": job.vehicle_type,
        "jobDate": job.job_date.isoformat() if job.job_date else None,
        "timeSlot": job.time_slot.value if job.time_slot else None,
        "distanceKm": float(job.distance_km) if job.distance_km is not None else None,
        "agreedAmount": float(payment.amount) if payment else None,
        "paymentStatus": payment.status.value.lower() if payment else None,
        "selectedSupplier": _driver_snippet(supplier),
        "createdAt": job.created_at.isoformat() if job.created_at else None,
        "updatedAt": job.updated_at.isoformat() if job.updated_at else None,
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
        weeks.append((f"Week {week_num} ({d.strftime('%b')} {d.day}–{week_end.day})", d, week_end))
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
        last_point = (
            db.query(TrackingPoint)
            .filter(TrackingPoint.job_id == active_job.id)
            .order_by(TrackingPoint.recorded_at.desc())
            .first()
        )
        active_job_data = {
            "jobId": active_job.id,
            "jobReference": active_job.job_ref,
            "status": active_job.status.value.lower(),
            "pickupLocation": active_job.pickup_address,
            "dropLocation": active_job.drop_address,
            "pickupLat": float(active_job.pickup_lat) if active_job.pickup_lat else None,
            "pickupLng": float(active_job.pickup_lng) if active_job.pickup_lng else None,
            "dropLat": float(active_job.drop_lat) if active_job.drop_lat else None,
            "dropLng": float(active_job.drop_lng) if active_job.drop_lng else None,
            "distanceKm": float(active_job.distance_km) if active_job.distance_km is not None else None,
            "durationMin": int(active_job.duration_min) if active_job.duration_min is not None else None,
            "originalEta": active_job.original_eta.isoformat() if active_job.original_eta else None,
            "currentLocation": {
                "latitude": float(last_point.lat),
                "longitude": float(last_point.lng),
                "lastUpdatedAt": last_point.recorded_at.isoformat() if last_point.recorded_at else None,
            } if last_point else None,
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
        # Payment row only exists after haulier pays — fall back to the winning quote price
        # Use a direct query (avoids SQLAlchemy lazy-load session issues)
        selected_quote = db.query(Quote).filter(
            Quote.job_id == j.id,
            Quote.status == QuoteStatus.SELECTED,
        ).first()
        agreed_amount = (
            float(payment.amount) if payment
            else float(selected_quote.price) if selected_quote
            else None
        )
        jobs.append({
            "jobId": j.id,
            "jobReference": j.job_ref,
            "status": j.status.value.lower(),
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
            "distanceKm": float(j.distance_km) if j.distance_km else None,
            "goodsType": j.goods_type,
            "weight": f"{float(j.weight_kg)} kg" if j.weight_kg else None,
            "jobDate": j.job_date.isoformat() if j.job_date else None,
            "timeSlot": j.time_slot.value if j.time_slot else None,
            "agreedAmount": agreed_amount,
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
            "distanceKm": float(j.distance_km) if j.distance_km else None,
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

    booked_jobs = db.query(Job).filter(
        Job.haulier_id == current_user.id,
        Job.status == JobStatus.BOOKED,
        Job.deleted_at.is_(None),
    ).order_by(Job.job_date.asc()).all()

    active_job_list = []
    for j in booked_jobs[:10] + active_jobs[:10]:
        supplier = j.supplier
        payment = j.payment
        active_job_list.append({
            "jobId": j.id,
            "jobReference": j.job_ref,
            "status": j.status.value.lower(),
            "driverName": supplier.full_name if supplier else None,
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
            "goodsType": j.goods_type,
            "weightKg": float(j.weight_kg) if j.weight_kg else None,
            "distanceKm": float(j.distance_km) if j.distance_km else None,
            "jobDate": j.job_date.isoformat() if j.job_date else None,
            "timeSlot": j.time_slot,
            "agreedAmount": float(payment.amount) if payment else None,
            "paymentRequired": j.status == JobStatus.BOOKED,
            "paymentStatus": payment.status.value.lower() if payment else None,
        })

    return ok(
        data={
            "haulierId": current_user.id,
            "companyName": profile.company_name if profile else current_user.full_name,
            "summary": {
                "totalActiveJobs": len(active_jobs) + len(booked_jobs),
                "bookedAwaitingPayment": len(booked_jobs),
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


@router.get("/haulier/costs")
def haulier_costs(
    period: str = Query("monthly"),
    month: int = Query(None),
    year: int = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
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
            Payment.status.in_([PaymentStatus.ESCROWED, PaymentStatus.RELEASED, PaymentStatus.REFUNDED]),
        )
    )

    month_q = q.filter(
        func.extract("month", Payment.created_at) == m,
        func.extract("year", Payment.created_at) == y,
    )

    rows = month_q.order_by(Payment.created_at.desc()).all()
    total_spend = sum(float(p.amount) for p, _ in rows if p.status in (PaymentStatus.ESCROWED, PaymentStatus.RELEASED))
    refunded = sum(float(p.amount) for p, _ in rows if p.status == PaymentStatus.REFUNDED)
    escrowed = sum(float(p.amount) for p, _ in rows if p.status == PaymentStatus.ESCROWED)
    released = sum(float(p.amount) for p, _ in rows if p.status == PaymentStatus.RELEASED)
    net_spend = max(total_spend - refunded, 0.0)
    job_count = len({j.id for _, j in rows})
    avg_per_job = round(net_spend / job_count, 2) if job_count else 0.0

    items = []
    for p, j in rows[(page - 1) * per_page: (page - 1) * per_page + per_page]:
        items.append({
            "paymentId": p.id,
            "jobId": j.id,
            "jobReference": j.job_ref,
            "route": f"{j.pickup_address} → {j.drop_address}",
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status.value.lower(),
            "jobStatus": j.status.value.lower(),
            "createdAt": p.created_at.isoformat() if p.created_at else None,
        })

    month_name = datetime(y, m, 1).strftime("%B %Y")

    return ok(
        data={
            "period": month_name,
            "summary": {
                "totalSpend": total_spend,
                "escrowedAmount": escrowed,
                "releasedAmount": released,
                "refunds": refunded,
                "netSpend": net_spend,
                "averagePerJob": avg_per_job,
                "loadsWithSpend": job_count,
                "currency": "INR",
            },
            "breakdown": [
                {"label": "Escrowed", "value": escrowed},
                {"label": "Released", "value": released},
                {"label": "Refunds", "value": refunded},
                {"label": "Net Spend", "value": net_spend},
            ],
            "items": items,
            "total": len(rows),
            "page": page,
            "perPage": per_page,
            "filters": {
                "period": period,
                "month": m,
                "year": y,
            },
        },
        message="Cost report fetched successfully.",
    )


@router.get("/haulier/revenue")
def haulier_revenue(
    period: str = Query("monthly"),
    month: int = Query(None),
    year: int = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
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
            Payment.status.in_([PaymentStatus.RELEASED, PaymentStatus.ESCROWED, PaymentStatus.PENDING, PaymentStatus.REFUNDED]),
        )
    )
    period_q = q.filter(
        func.extract("month", Payment.created_at) == m,
        func.extract("year", Payment.created_at) == y,
    )

    rows = period_q.order_by(Payment.created_at.desc()).all()
    released = sum(float(p.amount) for p, _ in rows if p.status == PaymentStatus.RELEASED)
    escrowed = sum(float(p.amount) for p, _ in rows if p.status == PaymentStatus.ESCROWED)
    pending = sum(float(p.amount) for p, _ in rows if p.status == PaymentStatus.PENDING)
    refunded = sum(float(p.amount) for p, _ in rows if p.status == PaymentStatus.REFUNDED)
    net_revenue = max(released - refunded, 0.0)
    completed_jobs = db.query(func.count(Job.id)).filter(
        Job.haulier_id == current_user.id,
        Job.status == JobStatus.COMPLETED,
        Job.deleted_at.is_(None),
    ).scalar() or 0
    avg_per_load = round(released / completed_jobs, 2) if completed_jobs else 0.0

    items = []
    for p, j in rows[(page - 1) * per_page: (page - 1) * per_page + per_page]:
        items.append({
            "paymentId": p.id,
            "jobId": j.id,
            "jobReference": j.job_ref,
            "route": f"{j.pickup_address} → {j.drop_address}",
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status.value.lower(),
            "jobStatus": j.status.value.lower(),
            "releasedAt": p.released_at.isoformat() if p.released_at else None,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
        })

    month_name = datetime(y, m, 1).strftime("%B %Y")

    return ok(
        data={
            "period": month_name,
            "summary": {
                "totalRevenue": released,
                "releasedRevenue": released,
                "escrowedRevenue": escrowed,
                "pendingRevenue": pending,
                "refunds": refunded,
                "netRevenue": net_revenue,
                "averagePerLoad": avg_per_load,
                "completedJobs": completed_jobs,
                "currency": "INR",
            },
            "breakdown": [
                {"label": "Released", "value": released},
                {"label": "Escrowed", "value": escrowed},
                {"label": "Pending", "value": pending},
                {"label": "Net Revenue", "value": net_revenue},
            ],
            "items": items,
            "total": len(rows),
            "page": page,
            "perPage": per_page,
            "filters": {
                "period": period,
                "month": m,
                "year": y,
            },
        },
        message="Revenue report fetched successfully.",
    )


@router.get("/haulier/performance")
def haulier_performance(
    period: str = Query("monthly"),
    month: int = Query(None),
    year: int = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    total_jobs = db.query(func.count(Job.id)).filter(
        Job.haulier_id == current_user.id,
        Job.deleted_at.is_(None),
    ).scalar() or 0
    active_jobs = db.query(func.count(Job.id)).filter(
        Job.haulier_id == current_user.id,
        Job.status.in_(ACTIVE_STATUSES),
        Job.deleted_at.is_(None),
    ).scalar() or 0
    completed_jobs = db.query(func.count(Job.id)).filter(
        Job.haulier_id == current_user.id,
        Job.status == JobStatus.COMPLETED,
        Job.deleted_at.is_(None),
    ).scalar() or 0
    disputed_jobs = db.query(func.count(Job.id)).filter(
        Job.haulier_id == current_user.id,
        Job.status == JobStatus.DISPUTED,
        Job.deleted_at.is_(None),
    ).scalar() or 0
    open_jobs = db.query(func.count(Job.id)).filter(
        Job.haulier_id == current_user.id,
        Job.status == JobStatus.OPEN,
        Job.deleted_at.is_(None),
    ).scalar() or 0
    this_month_jobs = db.query(func.count(Job.id)).filter(
        Job.haulier_id == current_user.id,
        func.extract("month", Job.created_at) == m,
        func.extract("year", Job.created_at) == y,
        Job.deleted_at.is_(None),
    ).scalar() or 0
    released_revenue = db.query(func.sum(Payment.amount)).join(
        Job, Job.id == Payment.job_id
    ).filter(
        Job.haulier_id == current_user.id,
        Payment.status == PaymentStatus.RELEASED,
    ).scalar() or 0.0

    completion_rate = round((completed_jobs / total_jobs) * 100, 1) if total_jobs else 0.0
    active_rate = round((active_jobs / total_jobs) * 100, 1) if total_jobs else 0.0

    recent_jobs = (
        db.query(Job)
        .filter(Job.haulier_id == current_user.id, Job.deleted_at.is_(None))
        .order_by(Job.updated_at.desc())
        .limit(8)
        .all()
    )

    items = []
    for job in recent_jobs:
        payment = job.payment
        items.append({
            "jobId": job.id,
            "jobReference": job.job_ref,
            "status": job.status.value.lower(),
            "vehicleType": job.vehicle_type,
            "goodsType": job.goods_type,
            "jobDate": job.job_date.isoformat() if job.job_date else None,
            "agreedAmount": float(payment.amount) if payment else None,
            "paymentStatus": payment.status.value.lower() if payment else None,
        })

    profile = current_user.profile
    month_name = datetime(y, m, 1).strftime("%B %Y")

    return ok(
        data={
            "period": month_name,
            "summary": {
                "totalJobs": total_jobs,
                "activeJobs": active_jobs,
                "completedJobs": completed_jobs,
                "disputedJobs": disputed_jobs,
                "openJobs": open_jobs,
                "thisMonthJobs": this_month_jobs,
                "completionRate": completion_rate,
                "activeRate": active_rate,
                "rating": float(current_user.avg_rating or 0),
                "verified": current_user.verified,
                "profileComplete": current_user.profile_complete,
                "releasedRevenue": float(released_revenue),
                "currency": "INR",
            },
            "breakdown": [
                {"label": "Completed", "value": completed_jobs},
                {"label": "Active", "value": active_jobs},
                {"label": "Open", "value": open_jobs},
                {"label": "Disputed", "value": disputed_jobs},
            ],
            "items": items,
            "profile": {
                "companyName": profile.company_name if profile else current_user.full_name,
                "vehicleType": profile.vehicle_type if profile else None,
                "coverageArea": profile.coverage_area if profile else None,
                "vehicleRegistration": profile.vehicle_registration if profile else None,
            },
            "filters": {
                "period": period,
                "month": m,
                "year": y,
            },
        },
        message="Performance report fetched successfully.",
    )


@router.get("/haulier/loads/matching")
def haulier_load_matching(
    search: str = Query(None),
    vehicle_type: str = Query(None),
    radius_km: float = Query(50.0, ge=1.0, le=500.0),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    q = db.query(Job).filter(
        Job.haulier_id == current_user.id,
        Job.status == JobStatus.OPEN,
        Job.deleted_at.is_(None),
    )

    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Job.job_ref.ilike(like),
                Job.goods_type.ilike(like),
                Job.pickup_address.ilike(like),
                Job.drop_address.ilike(like),
                Job.vehicle_type.ilike(like),
            )
        )

    if vehicle_type:
        q = q.filter(Job.vehicle_type == vehicle_type)

    jobs = q.order_by(Job.created_at.desc()).all()
    rows = []
    for job in jobs:
        matches = sup_svc.search_suppliers(
            db,
            float(job.pickup_lat),
            float(job.pickup_lng),
            radius_km=radius_km,
            vehicle_type=job.vehicle_type,
            job_date=job.job_date,
            page=1,
            per_page=3,
        )
        rows.append({
            **_job_load_snippet(job),
            "matchCount": matches["total"],
            "topMatches": [_supplier_search_snippet(item) for item in matches["items"]],
        })

    total = len(rows)
    start = (page - 1) * per_page
    items = rows[start:start + per_page]

    return ok(
        data={
            "items": items,
            "total": total,
            "page": page,
            "perPage": per_page,
            "summary": {
                "openLoads": total,
                "withMatches": sum(1 for row in rows if row["matchCount"] > 0),
                "avgMatchesPerLoad": round(sum(row["matchCount"] for row in rows) / total, 1) if total else 0,
            },
            "filters": {
                "search": search,
                "vehicleType": vehicle_type,
                "radiusKm": radius_km,
            },
        },
        message="Matching loads fetched successfully.",
    )


@router.get("/haulier/loads/bids")
def haulier_load_bids(
    search: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    q = db.query(Job).filter(
        Job.haulier_id == current_user.id,
        Job.deleted_at.is_(None),
    )

    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Job.job_ref.ilike(like),
                Job.goods_type.ilike(like),
                Job.pickup_address.ilike(like),
                Job.drop_address.ilike(like),
            )
        )

    jobs = q.order_by(Job.updated_at.desc()).all()
    rows = []
    for job in jobs:
        quotes = (
            db.query(Quote)
            .filter(Quote.job_id == job.id)
            .order_by(Quote.created_at.desc())
            .all()
        )
        if not quotes and not job.selected_supplier_id:
            continue
        active_quotes = [quote for quote in quotes if quote.status == QuoteStatus.ACTIVE]
        selected_quote = next((quote for quote in quotes if quote.status == QuoteStatus.SELECTED), None)
        rows.append({
            **_job_load_snippet(job),
            "quoteCount": len(quotes),
            "activeQuoteCount": len(active_quotes),
            "selectedQuote": _quote_snippet(selected_quote) if selected_quote else None,
            "quotes": [_quote_snippet(quote) for quote in quotes[:5]],
            "lowestQuote": min((float(quote.price) for quote in active_quotes), default=None),
        })

    total = len(rows)
    start = (page - 1) * per_page
    items = rows[start:start + per_page]

    return ok(
        data={
            "items": items,
            "total": total,
            "page": page,
            "perPage": per_page,
            "summary": {
                "jobsWithBids": total,
                "activeQuotes": sum(row["activeQuoteCount"] for row in rows),
                "selectedLoads": sum(1 for row in rows if row["selectedSupplier"]),
            },
            "filters": {
                "search": search,
            },
        },
        message="Bids fetched successfully.",
    )


@router.get("/haulier/loads/awarded")
def haulier_load_awarded(
    search: str = Query(None),
    status: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    q = db.query(Job).filter(
        Job.haulier_id == current_user.id,
        Job.selected_supplier_id.isnot(None),
        Job.deleted_at.is_(None),
    )

    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Job.job_ref.ilike(like),
                Job.goods_type.ilike(like),
                Job.pickup_address.ilike(like),
                Job.drop_address.ilike(like),
            )
        )

    if status:
        try:
            q = q.filter(Job.status == JobStatus(status.upper()))
        except ValueError:
            pass

    jobs = q.order_by(Job.updated_at.desc()).all()
    rows = []
    for job in jobs:
        payment = job.payment
        rows.append({
            **_job_load_snippet(job),
            "currentStage": job.status.value.lower(),
            "hasPayment": payment is not None,
            "quoteCount": db.query(func.count(Quote.id)).filter(Quote.job_id == job.id).scalar() or 0,
        })

    total = len(rows)
    start = (page - 1) * per_page
    items = rows[start:start + per_page]

    return ok(
        data={
            "items": items,
            "total": total,
            "page": page,
            "perPage": per_page,
            "summary": {
                "awardedLoads": total,
                "inTransit": sum(1 for row in rows if row["status"] == "in_transit"),
                "completed": sum(1 for row in rows if row["status"] == "completed"),
            },
            "filters": {
                "search": search,
                "status": status,
            },
        },
        message="Awarded loads fetched successfully.",
    )


class DriverAssignmentRequest(BaseModel):
    driver_id: str = Field(..., alias="driverId")
    note: Optional[str] = Field(None, alias="note")
    model_config = {"populate_by_name": True}


@router.get("/haulier/drivers/all")
def haulier_list_drivers(
    search: str = Query(None),
    vehicle_type: str = Query(None),
    availability: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    q = (
        db.query(User)
        .join(UserProfile, UserProfile.user_id == User.id)
        .filter(
            User.role.in_([Role.DRIVER, Role.FIRM]),
            User.status == UserStatus.ACTIVE,
            User.deleted_at.is_(None),
        )
    )

    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            or_(
                User.full_name.ilike(like),
                User.email.ilike(like),
                User.phone.ilike(like),
                UserProfile.vehicle_registration.ilike(like),
                UserProfile.company_name.ilike(like),
            )
        )

    if vehicle_type:
        q = q.filter(UserProfile.vehicle_type == vehicle_type)

    candidates = q.order_by(User.created_at.desc()).all()
    today = datetime.now(timezone.utc).date()
    rows = []
    for driver in candidates:
        profile = driver.profile
        slot_rows = (
            db.query(AvailabilitySlot)
            .filter(AvailabilitySlot.driver_id == driver.id)
            .order_by(AvailabilitySlot.day_of_week.asc(), AvailabilitySlot.start_time.asc())
            .all()
        )
        block_rows = (
            db.query(AvailabilityBlock)
            .filter(AvailabilityBlock.driver_id == driver.id)
            .order_by(AvailabilityBlock.block_start.desc())
            .all()
        )
        slots = len(slot_rows)
        blocks = len(block_rows)
        available_today = is_available_on(db, driver.id, today)
        if availability == "available" and not available_today:
            continue
        if availability == "busy" and available_today:
            continue
        rows.append({
            "driverId": driver.id,
            "name": driver.full_name,
            "email": driver.email,
            "phone": driver.phone,
            "role": driver.role.value,
            "status": driver.status.value,
            "isVerified": driver.verified,
            "profileComplete": driver.profile_complete,
            "avgRating": float(driver.avg_rating or 0),
            "completedJobs": driver.completed_jobs,
            "joinedAt": driver.created_at.isoformat() if driver.created_at else None,
            "vehicleType": profile.vehicle_type if profile else None,
            "vehicleRegistration": profile.vehicle_registration if profile else None,
            "licenseNumber": profile.licence_number if profile else None,
            "companyName": profile.company_name if profile else None,
            "coverageArea": profile.coverage_area if profile else None,
            "availabilityToday": available_today,
            "availabilitySlots": slots,
            "availabilityBlocks": blocks,
            "schedule": {
                "slots": [
                    {
                        "dayOfWeek": slot.day_of_week,
                        "startTime": slot.start_time.isoformat(),
                        "endTime": slot.end_time.isoformat(),
                        "isActive": slot.is_active,
                    }
                    for slot in slot_rows
                ],
                "blocks": [
                    {
                        "blockStart": block.block_start.isoformat(),
                        "blockEnd": block.block_end.isoformat(),
                        "reason": block.reason,
                    }
                    for block in block_rows
                ],
            },
        })

    total = len(rows)
    start = (page - 1) * per_page
    items = rows[start:start + per_page]

    return ok(
        data={
            "items": items,
            "total": total,
            "page": page,
            "perPage": per_page,
            "filters": {
                "search": search,
                "vehicleType": vehicle_type,
                "availability": availability,
            },
            "summary": {
                "totalDrivers": total,
                "availableToday": sum(1 for row in rows if row["availabilityToday"]),
                "verifiedDrivers": sum(1 for row in rows if row["isVerified"]),
            },
        },
        message="Drivers retrieved successfully.",
    )


@router.get("/haulier/drivers/assignments")
def haulier_list_driver_assignments(
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    profile = current_user.profile
    items = list(profile.driver_assignments or []) if profile else []
    return ok(
        data={"items": items, "total": len(items)},
        message="Driver assignments retrieved successfully.",
    )


@router.post("/haulier/drivers/assignments", status_code=201)
def haulier_assign_driver(
    body: DriverAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=404, detail="Haulier profile not found")

    driver = db.query(User).filter(
        User.id == body.driver_id,
        User.role.in_([Role.DRIVER, Role.FIRM]),
        User.deleted_at.is_(None),
    ).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    assignments = list(profile.driver_assignments or [])
    if any(item.get("driverId") == driver.id for item in assignments):
        raise HTTPException(status_code=409, detail="Driver already assigned")

    driver_profile = driver.profile
    item = {
        "driverId": driver.id,
        "name": driver.full_name,
        "email": driver.email,
        "phone": driver.phone,
        "vehicleType": driver_profile.vehicle_type if driver_profile else None,
        "vehicleRegistration": driver_profile.vehicle_registration if driver_profile else None,
        "licenseNumber": driver_profile.licence_number if driver_profile else None,
        "assignedAt": datetime.now(timezone.utc).isoformat(),
        "note": body.note,
    }
    assignments.insert(0, item)
    profile.driver_assignments = assignments
    db.commit()
    return created(data=item, message="Driver assigned")


@router.delete("/haulier/drivers/assignments/{driver_id}")
def haulier_unassign_driver(
    driver_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=404, detail="Haulier profile not found")

    assignments = list(profile.driver_assignments or [])
    filtered = [item for item in assignments if item.get("driverId") != driver_id]
    if len(filtered) == len(assignments):
        raise HTTPException(status_code=404, detail="Driver assignment not found")

    profile.driver_assignments = filtered
    db.commit()
    return ok(data=None, message="Driver unassigned")


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
                    "documentType": d.doc_type.value,
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


@router.get("/admin/verifications/processed")
def admin_processed_verifications(
    role: str = Query(None),
    status: str = Query(None),  # "approved" or "rejected" — blank means both
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    statuses = []
    if status and status.upper() == "APPROVED":
        statuses = [DocStatus.APPROVED]
    elif status and status.upper() == "REJECTED":
        statuses = [DocStatus.REJECTED]
    else:
        statuses = [DocStatus.APPROVED, DocStatus.REJECTED]

    q = db.query(User).join(Document, Document.user_id == User.id).filter(
        Document.status.in_(statuses),
        User.deleted_at.is_(None),
    ).distinct()
    if role:
        try:
            q = q.filter(User.role == Role(role.upper()))
        except ValueError:
            pass
    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    processed = []
    for u in users:
        docs = db.query(Document).filter(
            Document.user_id == u.id,
            Document.status.in_(statuses),
        ).all()
        processed.append({
            "userId": u.id,
            "name": u.full_name,
            "role": u.role.value.lower(),
            "email": u.email,
            "phone": u.phone,
            "joinedAt": u.created_at.isoformat() if u.created_at else None,
            "documents": [
                {
                    "documentId": d.id,
                    "documentType": d.doc_type.value,
                    "fileUrl": d.file_url,
                    "status": d.status.value.lower(),
                    "rejectionReason": d.rejection_reason,
                    "reviewedAt": d.reviewed_at.isoformat() if d.reviewed_at else None,
                    "uploadedAt": d.created_at.isoformat() if d.created_at else None,
                }
                for d in docs
            ],
            "totalDocuments": len(docs),
        })

    return ok(
        data={"processedVerifications": processed, "total": total, "page": page, "limit": limit},
        message="Processed verifications fetched successfully.",
    )


@router.get("/admin/jobs/monitor")
def admin_monitor_jobs(
    status: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    ACTIVE_JOB_STATUSES = [JobStatus.PAYMENT_SECURED, JobStatus.IN_TRANSIT]

    q = db.query(Job).filter(Job.deleted_at.is_(None))
    if status:
        upper = status.upper()
        if upper == "ACTIVE":
            q = q.filter(Job.status.in_(ACTIVE_JOB_STATUSES))
        else:
            try:
                q = q.filter(Job.status == JobStatus(upper))
            except ValueError:
                pass
    if search:
        like = f"%{search}%"
        q = q.filter(
            Job.job_ref.ilike(like) |
            Job.pickup_address.ilike(like) |
            Job.drop_address.ilike(like)
        )
    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()

    jobs = []
    for j in items:
        haulier = j.haulier
        supplier = j.supplier
        payment = j.payment
        quote_count = len(j.quotes) if hasattr(j, 'quotes') and j.quotes else 0
        jobs.append({
            "jobId": j.id,
            "jobReference": j.job_ref,
            "loadCode": j.load_code,
            "status": j.status.value.lower(),
            "haulier": {
                "name": haulier.full_name if haulier else None,
                "phone": haulier.phone if haulier else None,
            },
            "driver": _driver_snippet(supplier),
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
            "goodsType": j.goods_type,
            "vehicleType": j.vehicle_type,
            "weightKg": float(j.weight_kg) if j.weight_kg else None,
            "agreedAmount": float(payment.amount) if payment else None,
            "paymentStatus": payment.status.value.lower() if payment else None,
            "jobDate": j.job_date.isoformat() if j.job_date else None,
            "createdAt": j.created_at.isoformat() if j.created_at else None,
            "isDelayed": False,
            "hasDispute": j.status == JobStatus.DISPUTED,
            "complianceStatus": _compliance_step_status(j.compliance),
            "quoteCount": quote_count,
        })

    return ok(
        data={"jobs": jobs, "totalJobs": total, "page": page, "limit": limit},
        message="Jobs monitoring data fetched successfully.",
    )


@router.get("/admin/invoices/list")
def admin_list_invoices(
    search: str = Query(None),
    payment_status: str = Query(None, alias="paymentStatus"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = (
        db.query(Job, Payment)
        .join(Payment, Payment.job_id == Job.id)
        .filter(Job.invoice_url.isnot(None), Job.deleted_at.is_(None))
    )
    if search:
        q = q.filter(Job.job_ref.ilike(f"%{search}%"))
    if payment_status:
        try:
            q = q.filter(Payment.status == PaymentStatus(payment_status.upper()))
        except ValueError:
            pass
    total = q.count()
    rows = q.order_by(Job.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()

    items = []
    for j, p in rows:
        haulier = db.query(User).filter(User.id == j.haulier_id).first()
        items.append({
            "jobId": j.id,
            "jobRef": j.job_ref,
            "invoiceUrl": j.invoice_url,
            "amount": float(p.amount),
            "currency": p.currency,
            "paymentStatus": p.status.value,
            "jobStatus": j.status.value.lower(),
            "jobDate": j.job_date.isoformat() if j.job_date else None,
            "createdAt": j.created_at.isoformat() if j.created_at else None,
            "haulier": {
                "name": haulier.full_name if haulier else None,
                "email": haulier.email if haulier else None,
                "phone": haulier.phone if haulier else None,
            },
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
            "goodsType": j.goods_type,
        })

    return ok(
        data={"items": items, "total": total, "page": page, "limit": limit},
        message="Invoice list fetched successfully.",
    )


@router.get("/admin/payments/list")
def admin_list_payments(
    status: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(Payment, Job).join(Job, Job.id == Payment.job_id)
    if status:
        try:
            q = q.filter(Payment.status == PaymentStatus(status.upper()))
        except ValueError:
            pass
    if search:
        like = f"%{search}%"
        q = q.filter(Job.job_ref.ilike(like))
    total = q.count()
    rows = q.order_by(Payment.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    items = []
    for p, j in rows:
        haulier = db.query(User).filter(User.id == j.haulier_id).first()
        supplier = db.query(User).filter(User.id == j.selected_supplier_id).first() if j.selected_supplier_id else None
        items.append({
            "paymentId": p.id,
            "jobId": j.id,
            "jobRef": j.job_ref,
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status.value,
            "haulier": {
                "name": haulier.full_name if haulier else None,
                "phone": haulier.phone if haulier else None,
            },
            "driver": {
                "name": supplier.full_name if supplier else None,
                "phone": supplier.phone if supplier else None,
            },
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
            "escrowedAt": p.escrowed_at.isoformat() if p.escrowed_at else None,
            "releasedAt": p.released_at.isoformat() if p.released_at else None,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
        })

    return ok(
        data={"items": items, "total": total, "page": page, "limit": limit},
        message="Payment list fetched successfully.",
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


@router.get("/admin/live-tracking")
def admin_live_tracking(
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    active_jobs = db.query(Job).filter(
        Job.status == JobStatus.IN_TRANSIT,
        Job.deleted_at.is_(None),
    ).order_by(Job.updated_at.desc()).all()

    deliveries = []
    for j in active_jobs:
        haulier = j.haulier
        supplier = j.supplier
        profile = supplier.profile if supplier else None
        payment = j.payment

        last_point = (
            db.query(TrackingPoint)
            .filter(TrackingPoint.job_id == j.id)
            .order_by(TrackingPoint.recorded_at.desc())
            .first()
        )

        deliveries.append({
            "jobId": j.id,
            "jobRef": j.job_ref,
            "status": j.status.value.lower(),
            "haulier": {
                "name": haulier.full_name if haulier else None,
                "phone": haulier.phone if haulier else None,
            },
            "driver": {
                "name": supplier.full_name if supplier else None,
                "phone": supplier.phone if supplier else None,
                "vehicleNumber": profile.vehicle_registration if profile else None,
                "vehicleType": profile.vehicle_type if profile else None,
            },
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
            "pickupLat": float(j.pickup_lat) if j.pickup_lat else None,
            "pickupLng": float(j.pickup_lng) if j.pickup_lng else None,
            "dropLat": float(j.drop_lat) if j.drop_lat else None,
            "dropLng": float(j.drop_lng) if j.drop_lng else None,
            "currentLocation": {
                "latitude": float(last_point.lat),
                "longitude": float(last_point.lng),
                "lastUpdatedAt": last_point.recorded_at.isoformat() if last_point.recorded_at else None,
            } if last_point else None,
            "agreedAmount": float(payment.amount) if payment else None,
            "goodsType": j.goods_type,
            "vehicleType": j.vehicle_type,
            "weightKg": float(j.weight_kg) if j.weight_kg else None,
            "jobDate": j.job_date.isoformat() if j.job_date else None,
        })

    return ok(
        data={
            "totalActive": len(deliveries),
            "deliveries": deliveries,
        },
        message="Live tracking data fetched successfully.",
    )


@router.get("/admin/disputes/active")
def admin_active_disputes(
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = (
        db.query(Job)
        .join(ComplianceRecord, ComplianceRecord.job_id == Job.id)
        .filter(Job.status == JobStatus.DISPUTED, Job.deleted_at.is_(None))
    )
    if search:
        q = q.filter(Job.job_ref.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(ComplianceRecord.disputed_at.desc()).offset((page - 1) * limit).limit(limit).all()

    disputes = []
    for j in items:
        haulier = j.haulier
        supplier = j.supplier
        record = j.compliance
        payment = j.payment
        disputes.append({
            "disputeId": record.id if record else j.id,
            "jobId": j.id,
            "jobReference": j.job_ref,
            "haulier": {"name": haulier.full_name if haulier else None, "phone": haulier.phone if haulier else None},
            "driver": {"name": supplier.full_name if supplier else None, "phone": supplier.phone if supplier else None},
            "disputeReason": record.dispute_reason if record else None,
            "paymentOnHold": float(payment.amount) if payment else None,
            "currency": "INR",
            "status": "under_review",
            "raisedAt": record.disputed_at.isoformat() if record and record.disputed_at else None,
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
        })

    return ok(
        data={"disputes": disputes, "total": total, "page": page, "limit": limit},
        message="Active disputes fetched successfully.",
    )


@router.get("/admin/disputes/resolved")
def admin_resolved_disputes(
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = (
        db.query(Job)
        .join(ComplianceRecord, ComplianceRecord.job_id == Job.id)
        .filter(
            ComplianceRecord.disputed_at.isnot(None),
            ComplianceRecord.step3_approved_at.isnot(None),
            Job.status == JobStatus.COMPLETED,
        )
    )
    if search:
        q = q.filter(Job.job_ref.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(ComplianceRecord.step3_approved_at.desc()).offset((page - 1) * limit).limit(limit).all()

    disputes = []
    for j in items:
        haulier = j.haulier
        supplier = j.supplier
        record = j.compliance
        payment = j.payment
        disputes.append({
            "disputeId": record.id if record else j.id,
            "jobId": j.id,
            "jobReference": j.job_ref,
            "haulier": {"name": haulier.full_name if haulier else None, "phone": haulier.phone if haulier else None},
            "driver": {"name": supplier.full_name if supplier else None, "phone": supplier.phone if supplier else None},
            "disputeReason": record.dispute_reason if record else None,
            "paymentOnHold": float(payment.amount) if payment else None,
            "currency": "INR",
            "status": "resolved",
            "raisedAt": record.disputed_at.isoformat() if record and record.disputed_at else None,
            "resolvedAt": record.step3_approved_at.isoformat() if record and record.step3_approved_at else None,
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
        })

    return ok(
        data={"disputes": disputes, "total": total, "page": page, "limit": limit},
        message="Resolved disputes fetched successfully.",
    )


@router.get("/admin/disputes/escalated")
def admin_escalated_disputes(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    threshold = datetime.now(timezone.utc) - timedelta(hours=48)
    q = (
        db.query(Job)
        .join(ComplianceRecord, ComplianceRecord.job_id == Job.id)
        .filter(
            Job.status == JobStatus.DISPUTED,
            Job.deleted_at.is_(None),
            ComplianceRecord.disputed_at <= threshold,
        )
    )
    total = q.count()
    items = q.order_by(ComplianceRecord.disputed_at.asc()).offset((page - 1) * limit).limit(limit).all()

    now = datetime.now(timezone.utc)
    disputes = []
    for j in items:
        haulier = j.haulier
        supplier = j.supplier
        record = j.compliance
        payment = j.payment
        hours_open = (
            int((now - record.disputed_at.replace(tzinfo=timezone.utc)).total_seconds() / 3600)
            if record and record.disputed_at else 0
        )
        disputes.append({
            "disputeId": record.id if record else j.id,
            "jobId": j.id,
            "jobReference": j.job_ref,
            "haulier": {"name": haulier.full_name if haulier else None, "phone": haulier.phone if haulier else None},
            "driver": {"name": supplier.full_name if supplier else None, "phone": supplier.phone if supplier else None},
            "disputeReason": record.dispute_reason if record else None,
            "paymentOnHold": float(payment.amount) if payment else None,
            "currency": "INR",
            "status": "escalated",
            "raisedAt": record.disputed_at.isoformat() if record and record.disputed_at else None,
            "hoursOpen": hours_open,
            "pickupLocation": j.pickup_address,
            "dropLocation": j.drop_address,
        })

    return ok(
        data={"disputes": disputes, "total": total, "page": page, "limit": limit},
        message="Escalated disputes fetched successfully.",
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
