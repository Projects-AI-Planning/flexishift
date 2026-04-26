from app.core.response import ok

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

ACTIVE_STATUSES = [JobStatus.PAYMENT_SECURED, JobStatus.IN_TRANSIT]


def _job_summary(job: Job) -> dict:
    return {
        "jobId": job.id,
        "jobRef": job.job_ref,
        "status": job.status.value,
        "pickupAddress": job.pickup_address,
        "dropAddress": job.drop_address,
        "jobDate": job.job_date.isoformat() if job.job_date else None,
        "updatedAt": job.updated_at.isoformat() if job.updated_at else None,
    }


@router.get("/driver")
def get_driver_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    data = driver_dashboard(db, current_user)
    return ok(data=data, message="Driver dashboard retrieved")


@router.get("/driver/earnings")
def driver_earnings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    q = (
        db.query(Payment, Job)
        .join(Job, Job.id == Payment.job_id)
        .filter(Job.selected_supplier_id == current_user.id, Payment.status == PaymentStatus.RELEASED)
    )
    total_amount = q.with_entities(func.sum(Payment.amount)).scalar() or 0.0
    total_jobs = q.count()
    rows = q.order_by(Payment.released_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    items = [
        {
            "jobId": job.id,
            "jobRef": job.job_ref,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "releasedAt": payment.released_at.isoformat() if payment.released_at else None,
        }
        for payment, job in rows
    ]
    return ok(
        data={"items": items, "totalJobs": total_jobs, "totalEarnings": float(total_amount), "page": page, "perPage": per_page},
        message="Earnings history retrieved",
    )


@router.get("/driver/jobs")
def driver_jobs_history(
    status: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.DRIVER, Role.FIRM)),
):
    q = db.query(Job).filter(Job.selected_supplier_id == current_user.id, Job.deleted_at.is_(None))
    if status:
        q = q.filter(Job.status == JobStatus(status))
    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return ok(
        data={"items": [_job_summary(j) for j in items], "total": total, "page": page, "perPage": per_page},
        message="Driver jobs retrieved",
    )


@router.get("/haulier")
def get_haulier_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    data = haulier_dashboard(db, current_user)
    return ok(data=data, message="Haulier dashboard retrieved")


@router.get("/haulier/spend")
def haulier_spend(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
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
        .with_entities(func.sum(Payment.amount)).scalar() or 0.0
    )
    total_jobs = q.count()
    rows = q.order_by(Payment.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    items = [
        {
            "jobId": job.id,
            "jobRef": job.job_ref,
            "amount": float(payment.amount),
            "currency": payment.currency,
            "status": payment.status.value,
            "createdAt": payment.created_at.isoformat() if payment.created_at else None,
        }
        for payment, job in rows
    ]
    return ok(
        data={"items": items, "totalJobs": total_jobs, "totalSpend": float(total_spend), "page": page, "perPage": per_page},
        message="Spend history retrieved",
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
    result = []
    for job in active_jobs:
        last_point = (
            db.query(TrackingPoint)
            .filter(TrackingPoint.job_id == job.id)
            .order_by(TrackingPoint.recorded_at.desc())
            .first()
        )
        result.append({
            "jobId": job.id,
            "jobRef": job.job_ref,
            "status": job.status.value,
            "pickupAddress": job.pickup_address,
            "dropAddress": job.drop_address,
            "pickupLat": job.pickup_lat,
            "pickupLng": job.pickup_lng,
            "dropLat": job.drop_lat,
            "dropLng": job.drop_lng,
            "lastLat": last_point.lat if last_point else None,
            "lastLng": last_point.lng if last_point else None,
            "lastSeen": last_point.recorded_at.isoformat() if last_point else None,
        })
    return ok(data={"jobs": result, "total": len(result)}, message="Active map retrieved")


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
    return ok(
        data={"items": [_job_summary(j) for j in items], "total": total, "page": page, "perPage": per_page},
        message="Upcoming jobs retrieved",
    )


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
    return ok(
        data={"items": [_job_summary(j) for j in items], "total": total, "page": page, "perPage": per_page},
        message="Job history retrieved",
    )


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
    return ok(
        data={"items": [_job_summary(j) for j in items], "total": total, "page": page, "perPage": per_page},
        message="Active jobs retrieved",
    )


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
    return ok(
        data={"items": [_job_summary(j) for j in items], "total": total, "page": page, "perPage": per_page},
        message="Pending approval jobs retrieved",
    )


# ── Admin dashboard sub-endpoints ─────────────────────────────────────────────

AdminDep = require_role(Role.ADMIN)


@router.get("/admin/overview")
def admin_overview(
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    from fastapi import HTTPException
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
    return ok(
        data={
            "totalUsers": total_users,
            "activeUsers": active_users,
            "totalJobs": total_jobs,
            "activeJobs": active_jobs,
            "completedJobs": completed_jobs,
            "disputedJobs": disputed_jobs,
            "totalRevenue": float(total_revenue),
            "pendingDocuments": pending_docs,
        },
        message="Admin overview retrieved",
    )


@router.get("/admin/users/list")
def admin_list_users(
    role: str = Query(None),
    status: str = Query(None),
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
    return ok(
        data={
            "items": [
                {
                    "userId": u.id,
                    "name": u.full_name,
                    "email": u.email,
                    "role": u.role.value,
                    "status": u.status.value,
                    "createdAt": u.created_at.isoformat() if u.created_at else None,
                }
                for u in items
            ],
            "total": total,
            "page": page,
            "perPage": per_page,
        },
        message="Users retrieved",
    )


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
    return ok(data={"userId": user_id, "status": "SUSPENDED"}, message="User suspended")


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
    return ok(data={"userId": user_id, "status": "ACTIVE"}, message="User activated")


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
    return ok(
        data={
            "items": [
                {
                    "documentId": d.id,
                    "userId": d.user_id,
                    "docType": d.doc_type,
                    "status": d.status.value,
                    "createdAt": d.created_at.isoformat() if d.created_at else None,
                }
                for d in items
            ],
            "total": total,
            "page": page,
            "perPage": per_page,
        },
        message="Pending verifications retrieved",
    )


@router.get("/admin/jobs/monitor")
def admin_monitor_jobs(
    status: str = Query(None),
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
    return ok(
        data={"items": [_job_summary(j) for j in items], "total": total, "page": page, "perPage": per_page},
        message="Jobs monitored",
    )


@router.get("/admin/revenue")
def admin_revenue(
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    total = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.RELEASED).scalar() or 0.0
    escrowed = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.ESCROWED).scalar() or 0.0
    refunded = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.REFUNDED).scalar() or 0.0
    total_txns = db.query(func.count(Payment.id)).scalar() or 0
    return ok(
        data={
            "totalReleased": float(total),
            "totalEscrowed": float(escrowed),
            "totalRefunded": float(refunded),
            "totalTransactions": total_txns,
        },
        message="Revenue data retrieved",
    )


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
    return ok(
        data={"items": [_job_summary(j) for j in items], "total": total, "page": page, "perPage": per_page},
        message="Disputes retrieved",
    )
