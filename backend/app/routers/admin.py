from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.response import ok
from app.config import settings
from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, UserStatus, Role
from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.models.document import Document, DocStatus, DocType
from app.models.vehicle import Vehicle
from app.schemas.documents import DocumentReviewRequest
from app.schemas.admin import AdminCreateUserRequest, AdminUpdateUserRequest, UpdateUserStatusRequest, ApproveDocumentRequest, RejectDocumentRequest
from app.core.security import hash_password
from app.models.user import UserProfile
from app.services import documents as doc_svc
from app.services.notifications import create_notification
from app.routers.profile import _presigned_photo_url

_REQUIRED_DOCS_BY_AVAIL: dict[str, list[str]] = {
    'DRIVER_ONLY':       ['DRIVING_LICENCE'],
    'TRUCK_ONLY':        ['VEHICLE_REG', 'VEHICLE_INSURANCE'],
    'DRIVER_WITH_TRUCK': ['DRIVING_LICENCE', 'VEHICLE_REG', 'VEHICLE_INSURANCE'],
}


def _refresh_driver_profile_complete(db: Session, user_id: str) -> None:
    """Recompute profile_complete for a driver after a document status change."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != Role.DRIVER:
        return
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        return
    driver_avail = profile.driver_availability or ''
    if not driver_avail:
        user.profile_complete = False
        db.flush()
        return

    needs_licence = driver_avail in ('DRIVER_ONLY', 'DRIVER_WITH_TRUCK')
    needs_truck_docs = driver_avail in ('TRUCK_ONLY', 'DRIVER_WITH_TRUCK')

    if needs_licence:
        has_licence = db.query(Document).filter(
            Document.user_id == user_id,
            Document.doc_type == 'DRIVING_LICENCE',
            Document.status == DocStatus.APPROVED,
        ).first() is not None
        if not has_licence:
            user.profile_complete = False
            db.flush()
            return

    if needs_truck_docs:
        vehicles = db.query(Vehicle).filter(
            Vehicle.user_id == user_id,
            Vehicle.is_active == True,
        ).all()
        verified_truck = False
        for v in vehicles:
            has_reg = db.query(Document).filter(
                Document.vehicle_id == v.id,
                Document.doc_type == 'VEHICLE_REG',
                Document.status == DocStatus.APPROVED,
            ).first() is not None
            has_ins = db.query(Document).filter(
                Document.vehicle_id == v.id,
                Document.doc_type == 'VEHICLE_INSURANCE',
                Document.status == DocStatus.APPROVED,
            ).first() is not None
            if has_reg and has_ins:
                verified_truck = True
                break
        if not verified_truck:
            user.profile_complete = False
            db.flush()
            return

    user.profile_complete = True
    db.flush()

router = APIRouter(prefix="/admin", tags=["Admin"])

AdminDep = require_role(Role.ADMIN)


def _doc_dict(d: Document) -> dict:
    vehicle_registration = None
    if d.vehicle_id and d.vehicle:
        vehicle_registration = d.vehicle.vehicle_registration
    return {
        "documentId": d.id,
        "userId": d.user_id,
        "vehicleId": d.vehicle_id,
        "vehicleRegistration": vehicle_registration,
        "docType": d.doc_type.value,
        "customName": d.custom_name,
        "fileUrl": d.file_url,
        "status": d.status.value,
        "rejectionReason": d.rejection_reason,
        "expiryDate": d.expiry_date.date().isoformat() if d.expiry_date else None,
        "createdAt": d.created_at.isoformat() if d.created_at else None,
        "updatedAt": d.updated_at.isoformat() if d.updated_at else None,
        "isReapproval": d.status == DocStatus.PENDING and bool(d.rejection_reason),
    }


def _rejected_doc_history(db: Session, user_id: str) -> list[dict]:
    docs = (
        db.query(Document)
        .filter(
            Document.user_id == user_id,
            (
                (Document.status == DocStatus.REJECTED)
                | ((Document.status == DocStatus.PENDING) & Document.rejection_reason.isnot(None))
            ),
        )
        .order_by(Document.updated_at.desc(), Document.created_at.desc())
        .all()
    )
    return [
        {
            "documentId": doc.id,
            "docType": doc.doc_type.value,
            "fileUrl": doc.file_url,
            "status": doc.status.value,
            "rejectionReason": doc.rejection_reason,
            "createdAt": doc.created_at.isoformat() if doc.created_at else None,
            "updatedAt": doc.updated_at.isoformat() if doc.updated_at else None,
            "reviewedAt": doc.reviewed_at.isoformat() if doc.reviewed_at else None,
            "isReapproval": doc.status == DocStatus.PENDING and bool(doc.rejection_reason),
        }
        for doc in docs
    ]


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.status == UserStatus.ACTIVE).scalar()
    total_jobs = db.query(func.count(Job.id)).filter(Job.deleted_at.is_(None)).scalar()
    open_jobs = db.query(func.count(Job.id)).filter(Job.status == JobStatus.OPEN, Job.deleted_at.is_(None)).scalar()
    completed_jobs = db.query(func.count(Job.id)).filter(Job.status == JobStatus.COMPLETED, Job.deleted_at.is_(None)).scalar()
    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == PaymentStatus.RELEASED).scalar() or 0.0
    pending_documents = db.query(func.count(Document.id)).filter(Document.status == DocStatus.PENDING).scalar()
    return ok(
        data={
            "totalUsers": total_users,
            "activeUsers": active_users,
            "totalJobs": total_jobs,
            "openJobs": open_jobs,
            "completedJobs": completed_jobs,
            "totalRevenue": float(total_revenue),
            "pendingDocuments": pending_documents,
        },
        message="Stats retrieved",
    )


@router.get("/stripe/revenue")
def get_stripe_revenue(
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    # ── Stripe live balance ────────────────────────────────────────────────────
    stripe_info: dict = {"stripeConnected": False, "availableBalance": 0.0, "pendingBalance": 0.0, "currency": "GBP"}
    if settings.STRIPE_SECRET_KEY:
        try:
            import stripe as _stripe
            _stripe.api_key = settings.STRIPE_SECRET_KEY
            bal = _stripe.Balance.retrieve()
            available = sum(b["amount"] for b in bal["available"]) / 100
            pending   = sum(b["amount"] for b in bal["pending"])   / 100
            currency  = bal["available"][0]["currency"].upper() if bal["available"] else "GBP"
            stripe_info = {
                "stripeConnected": True,
                "availableBalance": round(available, 2),
                "pendingBalance":   round(pending, 2),
                "currency":         currency,
            }
        except Exception:
            pass

    # ── DB payment breakdown ───────────────────────────────────────────────────
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)

    def _sum(col, *filters):
        return float(db.query(func.sum(col)).filter(*filters).scalar() or 0)

    released = Payment.status == PaymentStatus.RELEASED
    escrowed = Payment.status == PaymentStatus.ESCROWED

    return ok(data={
        **stripe_info,
        "totalRevenue":      _sum(Payment.amount,       released),
        "monthlyRevenue":    _sum(Payment.amount,       released, Payment.released_at >= month_start),
        "platformFeeTotal":  _sum(Payment.platform_fee, released),
        "vatTotal":          _sum(Payment.vat_amount,   released),
        "escrowedAmount":    _sum(Payment.amount,       escrowed),
        "totalEscrowCount":  db.query(func.count(Payment.id)).filter(escrowed).scalar() or 0,
        "totalPaid":         db.query(func.count(Payment.id)).filter(released).scalar() or 0,
    }, message="Stripe revenue retrieved")


@router.get("/users")
def list_users(
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
                {"userId": u.id, "name": u.full_name, "email": u.email, "role": u.role.value, "status": u.status.value}
                for u in items
            ],
            "total": total,
            "page": page,
            "perPage": per_page,
        },
        message="Users retrieved",
    )


@router.post("/users")
def create_user(
    body: AdminCreateUserRequest,
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    if len(body.password.encode()) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 characters or fewer")

    new_user = User(
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
        password_hash=hash_password(body.password),
        role=Role(body.role.upper()),
        status=UserStatus(body.status.upper() if body.status else "ACTIVE"),
        verified=True,
        profile_complete=False,
    )
    db.add(new_user)
    db.flush()
    db.add(UserProfile(user_id=new_user.id))
    db.commit()
    return ok(
        data={
            "userId": new_user.id,
            "name": new_user.full_name,
            "email": new_user.email,
            "role": new_user.role.value,
            "status": new_user.status.value,
        },
        message="User created successfully",
    )


@router.get("/hauliers/pending")
def list_pending_hauliers(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(User).filter(
        User.role == Role.HAULIER,
        User.admin_approved == False,
        User.deleted_at.is_(None),
    )
    total = q.count()
    items = q.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    def _org_document(user_id: str):
        doc = (
            db.query(Document)
            .filter(Document.user_id == user_id, Document.doc_type == DocType.COMPANY_REG)
            .order_by(Document.updated_at.desc())
            .first()
        )
        if not doc:
            return None
        return {
            "docId": doc.id,
            "status": doc.status.value,
            "fileUrl": doc.file_url,
            "customName": doc.custom_name,
        }

    return ok(
        data={
            "items": [
                {
                    "userId": u.id,
                    "name": u.full_name,
                    "email": u.email,
                    "phone": u.phone,
                    "photoUrl": _presigned_photo_url(u.profile.photo_url if u.profile else None),
                    "companyName": u.profile.company_name if u.profile else None,
                    "companyAddress": u.profile.company_address if u.profile else None,
                    "vatNumber": u.profile.vat_number if u.profile else None,
                    "organisationNumber": u.profile.organisation_number if u.profile else None,
                    "country": u.country,
                    "joinedAt": u.created_at.isoformat() if u.created_at else None,
                    "organisationDocument": _org_document(u.id),
                }
                for u in items
            ],
            "total": total,
            "page": page,
            "perPage": per_page,
        },
        message="Pending hauliers retrieved",
    )


@router.patch("/hauliers/{user_id}/approve")
async def approve_haulier(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role not in (Role.HAULIER, Role.FIRM):
        raise HTTPException(status_code=400, detail="User is not a haulier")
    user.admin_approved = True
    db.commit()
    await create_notification(
        db, user.id, "ACCOUNT_APPROVED",
        "Account Approved",
        "Your haulier account has been approved. You can now post jobs and shifts.",
        {},
    )
    return ok(data={"userId": user_id, "adminApproved": True}, message="Haulier approved successfully")


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    body: UpdateUserStatusRequest,
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus(body.status)
    db.commit()
    return ok(data={"userId": user_id, "status": body.status}, message="User status updated")


@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    body: AdminUpdateUserRequest,
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.email is not None:
        existing = db.query(User).filter(User.email == body.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use")
        user.email = body.email
    if body.phone is not None:
        user.phone = body.phone
    if body.role is not None:
        user.role = Role(body.role.upper())
    if body.status is not None:
        user.status = UserStatus(body.status.upper().replace("PENDING", "INACTIVE"))
    db.commit()
    return ok(
        data={"userId": user.id, "name": user.full_name, "email": user.email, "role": user.role.value, "status": user.status.value},
        message="User updated successfully",
    )


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(AdminDep),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return ok(data={"userId": user_id}, message="User deleted successfully")


@router.get("/documents/pending")
def list_pending_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    document_type: str = Query(None, alias="documentType"),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    result = doc_svc.list_pending_documents(db, page, limit, document_type)
    docs = result.get("items", [])
    # Enrich each document with the owner's user info
    items = []
    for d in docs:
        owner = db.get(User, d.user_id)
        items.append({
            **_doc_dict(d),
            "userName": owner.full_name if owner else "Unknown",
            "userEmail": owner.email if owner else "",
            "userRole": owner.role.value if owner else "",
            "userPhone": owner.phone if owner else "",
            "rejectedDocuments": _rejected_doc_history(db, d.user_id),
        })
    return ok(
        data={
            "items": items,
            "total": result.get("total", 0),
            "page": page,
            "perPage": limit,
        },
        message="Pending documents retrieved",
    )


@router.get("/documents/expired")
async def list_expired_documents(
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    now = datetime.utcnow()
    expired_docs = (
        db.query(Document)
        .filter(
            Document.expiry_date.isnot(None),
            Document.expiry_date < now,
        )
        .order_by(Document.expiry_date.asc())
        .all()
    )
    items = []
    for d in expired_docs:
        owner = db.get(User, d.user_id)
        items.append({
            **_doc_dict(d),
            "userName": owner.full_name if owner else "Unknown",
            "userEmail": owner.email if owner else "",
            "userRole": owner.role.value if owner else "",
            "userPhone": owner.phone if owner else "",
        })
    return ok(data={"items": items, "total": len(items)}, message="Expired documents retrieved")


@router.patch("/documents/{doc_id}/review")
async def review_document(
    doc_id: str,
    body: DocumentReviewRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(AdminDep),
):
    doc = doc_svc.review_document(db, doc_id, admin, body.status, body.rejection_reason)
    doc_label = doc.doc_type.replace("_", " ").title()
    _refresh_driver_profile_complete(db, doc.user_id)
    if body.status == "APPROVED":
        await create_notification(
            db, doc.user_id, "DOCUMENT_APPROVED",
            "Document Approved",
            f"Your {doc_label} has been approved.",
            {"doc_id": doc.id, "doc_type": doc.doc_type},
        )
    elif body.status == "REJECTED":
        reason = body.rejection_reason or "No reason provided"
        await create_notification(
            db, doc.user_id, "DOCUMENT_REJECTED",
            "Document Rejected",
            f"Your {doc_label} was rejected: {reason}",
            {"doc_id": doc.id, "doc_type": doc.doc_type, "reason": reason},
        )
    db.commit()
    return ok(data=_doc_dict(doc), message="Document reviewed")


@router.put("/documents/approve/{doc_id}")
async def approve_document(
    doc_id: str,
    body: ApproveDocumentRequest = ApproveDocumentRequest(),
    db: Session = Depends(get_db),
    admin: User = Depends(AdminDep),
):
    doc = doc_svc.review_document(db, doc_id, admin, "APPROVED", body.remarks)
    doc_label = doc.doc_type.replace("_", " ").title()
    _refresh_driver_profile_complete(db, doc.user_id)
    await create_notification(
        db, doc.user_id, "DOCUMENT_APPROVED",
        "Document Approved",
        f"Your {doc_label} has been approved.",
        {"doc_id": doc.id, "doc_type": doc.doc_type},
    )
    db.commit()
    return ok(data=_doc_dict(doc), message="Document approved")


@router.put("/documents/reject/{doc_id}")
async def reject_document(
    doc_id: str,
    body: RejectDocumentRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(AdminDep),
):
    doc = doc_svc.review_document(db, doc_id, admin, "REJECTED", body.rejection_reason)
    doc_label = doc.doc_type.replace("_", " ").title()
    reason = body.rejection_reason or "No reason provided"
    await create_notification(
        db, doc.user_id, "DOCUMENT_REJECTED",
        "Document Rejected",
        f"Your {doc_label} was rejected: {reason}",
        {"doc_id": doc.id, "doc_type": doc.doc_type, "reason": reason},
    )
    db.commit()
    return ok(data=_doc_dict(doc), message="Document rejected")


@router.get("/jobs")
def list_all_jobs(
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
    items = q.order_by(Job.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return ok(
        data={
            "items": [
                {"jobId": j.id, "jobRef": j.job_ref, "status": j.status.value, "createdAt": j.created_at.isoformat()}
                for j in items
            ],
            "total": total,
            "page": page,
            "perPage": per_page,
        },
        message="Jobs retrieved",
    )
