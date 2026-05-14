from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.document import Document, DocType, DocStatus
from app.models.user import User
from app.services import s3


def get_upload_url(doc_type: str, user_id: str) -> dict:
    key = f"documents/{user_id}/{doc_type}/{doc_type.lower()}.pdf"
    return s3.generate_presigned_upload(settings.AZURE_CONTAINER_DOCS, key, "application/pdf")


def upsert_document(db: Session, user_id: str, doc_type: str, file_url: str) -> Document:
    doc = db.query(Document).filter(
        Document.user_id == user_id, Document.doc_type == DocType(doc_type)
    ).first()
    if doc:
        doc.file_url = file_url
        doc.status = DocStatus.PENDING
        doc.reviewed_at = None
        doc.reviewed_by = None
        doc.rejection_reason = None
    else:
        doc = Document(user_id=user_id, doc_type=DocType(doc_type), file_url=file_url)
        db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def review_document(db: Session, doc_id: str, admin: User, status: str, rejection_reason: str | None) -> Document:
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if status not in ("APPROVED", "REJECTED"):
        raise HTTPException(status_code=422, detail="Status must be APPROVED or REJECTED")
    if status == "REJECTED" and not rejection_reason:
        raise HTTPException(status_code=422, detail="Rejection reason required")

    doc.status = DocStatus(status)
    doc.reviewed_by = admin.id
    doc.reviewed_at = datetime.now(timezone.utc)
    doc.rejection_reason = rejection_reason
    db.commit()
    db.refresh(doc)
    return doc


def list_pending_documents(db: Session, page: int = 1, per_page: int = 20, doc_type: str | None = None) -> dict:
    q = db.query(Document).filter(Document.status == DocStatus.PENDING)
    if doc_type:
        q = q.filter(Document.doc_type == DocType(doc_type.upper()))
    total = q.count()
    items = q.order_by(Document.created_at.asc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}
