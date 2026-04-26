from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, UserStatus, Role
from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.models.document import Document, DocStatus
from app.schemas.users import UserOut
from app.schemas.documents import DocumentReviewRequest, DocumentListOut, DocumentOut
from app.schemas.admin import UpdateUserStatusRequest, AdminStatsOut
from app.services import documents as doc_svc

router = APIRouter(prefix="/admin", tags=["Admin"])

AdminDep = require_role(Role.ADMIN)


@router.get("/stats", response_model=AdminStatsOut)
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

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_jobs": total_jobs,
        "open_jobs": open_jobs,
        "completed_jobs": completed_jobs,
        "total_revenue": float(total_revenue),
        "pending_documents": pending_documents,
    }


@router.get("/users")
def list_users(
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


@router.patch("/users/{user_id}/status", response_model=UserOut)
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
    db.refresh(user)
    return user


@router.get("/documents", response_model=DocumentListOut)
def list_pending_documents(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    return doc_svc.list_pending_documents(db, page, per_page)


@router.patch("/documents/{doc_id}/review", response_model=DocumentOut)
def review_document(
    doc_id: str,
    body: DocumentReviewRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(AdminDep),
):
    return doc_svc.review_document(db, doc_id, admin, body.status, body.rejection_reason)


@router.put("/documents/approve/{doc_id}", response_model=DocumentOut)
def approve_document(
    doc_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(AdminDep),
):
    return doc_svc.review_document(db, doc_id, admin, "APPROVED", None)


@router.put("/documents/reject/{doc_id}", response_model=DocumentOut)
def reject_document(
    doc_id: str,
    reason: str,
    db: Session = Depends(get_db),
    admin: User = Depends(AdminDep),
):
    return doc_svc.review_document(db, doc_id, admin, "REJECTED", reason)


@router.get("/jobs")
def list_all_jobs(
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
    items = q.order_by(Job.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}
