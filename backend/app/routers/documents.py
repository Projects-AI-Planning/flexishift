from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user
from app.models.document import Document, DocType, DocStatus
from app.models.local_upload import LocalUploadKind, LocalUploadStatus
from app.models.user import User, Role
from app.services import documents as doc_svc
from app.services import local_storage as local_svc
from app.services.notifications import create_notification
from app.config import settings

router = APIRouter(prefix="/users/me/documents", tags=["Documents"])

import re as _re

def _fix_url(url: str | None) -> str | None:
    if not url:
        return url
    return _re.sub(r'https?://(127\.0\.0\.1|localhost)(:\d+)?', settings.BACKEND_URL.rstrip("/"), url)


def _doc_dict(d: Document) -> dict:
    return {
        "documentId": d.id,
        "userId": d.user_id,
        "vehicleId": d.vehicle_id,
        "docType": d.doc_type.value,
        "fileUrl": _fix_url(d.file_url),
        "status": d.status.value,
        "rejectionReason": d.rejection_reason,
        "expiryDate": d.expiry_date.date().isoformat() if d.expiry_date else None,
        "reviewedAt": d.reviewed_at.isoformat() if d.reviewed_at else None,
        "createdAt": d.created_at.isoformat() if d.created_at else None,
        "updatedAt": d.updated_at.isoformat() if d.updated_at else None,
        "isReapproval": d.status == DocStatus.PENDING and bool(d.rejection_reason),
    }


def _validate_doc_type(doc_type: str) -> None:
    try:
        DocType(doc_type)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid doc_type '{doc_type}'. Must be one of: {[e.value for e in DocType]}",
        )


@router.get("")
def list_my_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.updated_at.desc(), Document.created_at.desc())
        .all()
    )
    return ok(data={"items": [_doc_dict(d) for d in items], "total": len(items)}, message="Documents retrieved")


# /upload-url MUST be declared before /{doc_id} — FastAPI matches in declaration
# order, so a parameterised route would otherwise swallow this literal path.
@router.get("/upload-url")
def get_upload_url(
    request: Request,
    doc_type: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _validate_doc_type(doc_type)
    if local_svc.azure_available():
        result = doc_svc.get_upload_url(doc_type, current_user.id)
        return ok(data={**result, "upload_url": result["upload_url"]}, message="Upload URL generated")

    # Use build_storage_key so each upload gets a unique key — the fixed-key
    # approach violated the UNIQUE index on re-uploads.
    pending = local_svc.create_pending_upload(
        db,
        user_id=current_user.id,
        kind=LocalUploadKind.DOCUMENT,
        original_name=f"{doc_type.lower()}.pdf",
        content_type="application/pdf",
    )
    upload_url = local_svc.local_upload_endpoint_url(request, pending.upload_token)
    file_url = local_svc.local_upload_url(request, pending.storage_key)
    pending.public_url = file_url
    db.commit()
    return ok(
        data={
            "key": pending.storage_key,
            "url": upload_url,
            "upload_url": upload_url,
            "file_url": file_url,
            "storage": "local",
            "upload_token": pending.upload_token,
        },
        message="Local upload URL generated",
    )


@router.get("/{doc_id}")
def get_my_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return ok(data=_doc_dict(doc), message="Document retrieved")


async def _notify_admins_new_doc(db: Session, submitter: User, doc: Document) -> None:
    admins = db.query(User).filter(User.role == Role.ADMIN).all()
    doc_label = doc.doc_type.value.replace("_", " ").title()
    for admin in admins:
        await create_notification(
            db, admin.id, "DOCUMENT_SUBMITTED",
            "New Document for Review",
            f"{submitter.full_name} submitted a {doc_label} for verification.",
            {"doc_id": doc.id, "doc_type": doc.doc_type.value, "user_id": submitter.id},
        )
    db.commit()


@router.post("", status_code=201)
async def submit_document(
    doc_type: str = Query(...),
    file_url: str = Query(...),
    vehicle_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _validate_doc_type(doc_type)
    doc = doc_svc.upsert_document(db, current_user.id, doc_type, file_url, vehicle_id=vehicle_id)
    await _notify_admins_new_doc(db, current_user, doc)
    return created(data=_doc_dict(doc), message="Document submitted for review")


@router.post("/submit-upload", status_code=201)
async def submit_uploaded_document(
    request: Request,
    doc_type: str = Query(...),
    key: str = Query(...),
    expiry_date: str = Query(None),
    vehicle_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _validate_doc_type(doc_type)
    if local_svc.azure_available():
        file_url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{key}"
    else:
        upload = local_svc.get_upload_by_key(db, key, current_user.id)
        if not upload:
            raise HTTPException(status_code=404, detail="Local upload not found")
        if upload.status != LocalUploadStatus.STORED:
            raise HTTPException(status_code=400, detail="File has not been uploaded yet. Please upload the file first.")
        file_url = upload.public_url or local_svc.local_upload_url(request, key)

    parsed_expiry = None
    if expiry_date:
        for fmt in ("%Y-%m-%d", "%d-%m-%Y"):
            try:
                parsed_expiry = datetime.strptime(expiry_date.strip(), fmt)
                break
            except ValueError:
                continue

    doc = doc_svc.upsert_document(
        db, current_user.id, doc_type, file_url,
        expiry_date=parsed_expiry, vehicle_id=vehicle_id,
    )
    await _notify_admins_new_doc(db, current_user, doc)
    return created(data=_doc_dict(doc), message="Document uploaded and submitted for review")
