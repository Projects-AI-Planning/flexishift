from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.document import Document, DocType, DocStatus
from app.models.user import User
from app.services import s3


def get_upload_url(doc_type: str, user_id: str) -> dict:
    key = f"documents/{user_id}/{doc_type}/{doc_type.lower()}.pdf"
    return s3.generate_presigned_upload(settings.AZURE_CONTAINER_DOCS, key, "application/pdf")


def upsert_document(
    db: Session,
    user_id: str,
    doc_type: str,
    file_url: str,
    custom_name: str | None = None,
    expiry_date: datetime | None = None,
    vehicle_id: str | None = None,
) -> Document:
    # When vehicle_id is provided, scope the upsert to that specific vehicle.
    # This allows multiple VEHICLE_REG / VEHICLE_INSURANCE docs, one per vehicle.
    q = db.query(Document).filter(
        Document.user_id == user_id,
        Document.doc_type == DocType(doc_type),
        Document.custom_name == custom_name,
    )
    if vehicle_id is not None:
        q = q.filter(Document.vehicle_id == vehicle_id)
    else:
        q = q.filter(Document.vehicle_id.is_(None))
    doc = q.first()

    if doc:
        was_rejected = doc.status == DocStatus.REJECTED or bool(doc.rejection_reason)
        doc.file_url = file_url
        doc.status = DocStatus.PENDING
        doc.reviewed_at = None
        doc.reviewed_by = None
        if not was_rejected:
            doc.rejection_reason = None
        if expiry_date is not None:
            doc.expiry_date = expiry_date
        if vehicle_id is not None:
            doc.vehicle_id = vehicle_id
        doc.updated_at = datetime.utcnow()
    else:
        doc = Document(
            user_id=user_id,
            doc_type=DocType(doc_type),
            file_url=file_url,
            custom_name=custom_name,
            expiry_date=expiry_date,
            vehicle_id=vehicle_id,
        )
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
    doc.reviewed_at = datetime.utcnow()
    doc.rejection_reason = rejection_reason if status == "REJECTED" else None
    # When admin approves a doc whose expiry date is in the past, clear it so the
    # driver is not blocked by a stale expiry. The driver must supply a new expiry
    # date when they next re-upload.
    if status == "APPROVED" and doc.expiry_date and doc.expiry_date < datetime.utcnow():
        doc.expiry_date = None
    db.commit()
    db.refresh(doc)
    return doc


def list_pending_documents(db: Session, page: int = 1, per_page: int = 20, doc_type: str | None = None) -> dict:
    q = db.query(Document).filter(Document.status == DocStatus.PENDING)
    if doc_type:
        q = q.filter(Document.doc_type == DocType(doc_type.upper()))
    total = q.count()
    items = q.order_by(Document.updated_at.desc(), Document.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total}
