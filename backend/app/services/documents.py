from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.document import Document, DocType, DocStatus
from app.models.local_upload import LocalUploadKind, LocalUploadStatus
from app.models.user import User
from app.services import local_storage as local_svc
from app.services import s3

_CONTENT_SUFFIX = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
}


def get_upload_url(doc_type: str, user_id: str) -> dict:
    key = f"documents/{user_id}/{doc_type}/{doc_type.lower()}.pdf"
    return s3.generate_presigned_upload(settings.AZURE_CONTAINER_DOCS, key, "application/pdf")


def parse_expiry_date(raw: str | None) -> datetime | None:
    if not raw or not str(raw).strip():
        return None
    value = str(raw).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def store_document_bytes(
    db: Session,
    user_id: str,
    doc_type: str,
    contents: bytes,
    content_type: str | None,
    filename: str | None,
) -> str:
    suffix = _CONTENT_SUFFIX.get(
        content_type or "",
        (filename or "").rsplit(".", 1)[-1] or "pdf",
    )
    key = f"documents/{user_id}/{doc_type}/{str(uuid4())[:8]}.{suffix}"
    resolved_type = content_type or "application/pdf"

    if local_svc.azure_available():
        s3.upload_bytes(settings.AZURE_CONTAINER_DOCS, key, contents, resolved_type)
        return (
            f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/"
            f"{settings.AZURE_CONTAINER_DOCS}/{key}"
        )

    local_svc.ensure_local_upload_root()
    file_path = local_svc.LOCAL_UPLOAD_ROOT / key
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(contents)
    file_url = local_svc.local_upload_url(None, key)
    record = local_svc.create_pending_upload(
        db,
        user_id=user_id,
        kind=LocalUploadKind.DOCUMENT,
        original_name=filename or f"doc.{suffix}",
        content_type=resolved_type,
        storage_key=key,
    )
    record.public_url = file_url
    record.status = LocalUploadStatus.STORED
    db.commit()
    return file_url


def upsert_document(
    db: Session,
    user_id: str,
    doc_type: str,
    file_url: str,
    custom_name: str | None = None,
    expiry_date: datetime | None = None,
    vehicle_id: str | None = None,
    status: DocStatus | None = None,
    reviewed_by: str | None = None,
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
    resolved_status = status or DocStatus.PENDING
    now = datetime.utcnow()

    if doc:
        was_rejected = doc.status == DocStatus.REJECTED or bool(doc.rejection_reason)
        doc.file_url = file_url
        doc.status = resolved_status
        if resolved_status == DocStatus.APPROVED:
            doc.reviewed_by = reviewed_by
            doc.reviewed_at = now
            doc.rejection_reason = None
        else:
            doc.reviewed_at = None
            doc.reviewed_by = None
            if not was_rejected:
                doc.rejection_reason = None
        if expiry_date is not None:
            doc.expiry_date = expiry_date
        if vehicle_id is not None:
            doc.vehicle_id = vehicle_id
        doc.updated_at = now
    else:
        doc = Document(
            user_id=user_id,
            doc_type=DocType(doc_type),
            file_url=file_url,
            custom_name=custom_name,
            expiry_date=expiry_date,
            vehicle_id=vehicle_id,
            status=resolved_status,
            reviewed_by=reviewed_by if resolved_status == DocStatus.APPROVED else None,
            reviewed_at=now if resolved_status == DocStatus.APPROVED else None,
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
