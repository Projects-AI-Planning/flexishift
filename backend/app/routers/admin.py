from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.response import ok
from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, UserStatus, Role
from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.models.document import Document, DocStatus
from app.schemas.documents import DocumentReviewRequest
from app.schemas.admin import AdminCreateUserRequest, UpdateUserStatusRequest, ApproveDocumentRequest, RejectDocumentRequest
from app.core.security import hash_password
from app.models.user import UserProfile
from app.services import documents as doc_svc
from app.services.notifications import create_notification

router = APIRouter(prefix="/admin", tags=["Admin"])

AdminDep = require_role(Role.ADMIN)


def _doc_dict(d: Document) -> dict:
    return {
        "documentId": d.id,
        "userId": d.user_id,
        "docType": d.doc_type.value,
        "fileUrl": d.file_url,
        "status": d.status.value,
        "rejectionReason": d.rejection_reason,
        "expiryDate": d.expiry_date.isoformat() if hasattr(d, "expiry_date") and d.expiry_date else None,
        "createdAt": d.created_at.isoformat() if d.created_at else None,
    }


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


@router.patch("/documents/{doc_id}/review")
async def review_document(
    doc_id: str,
    body: DocumentReviewRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(AdminDep),
):
    doc = doc_svc.review_document(db, doc_id, admin, body.status, body.rejection_reason)
    doc_label = doc.doc_type.replace("_", " ").title()
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
