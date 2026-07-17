from fastapi import APIRouter, Depends, File, Form, Query, HTTPException, UploadFile
from uuid import uuid4
from sqlalchemy.orm import Session

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.document import Document, DocType, DocStatus
from app.models.user import User, Role
from app.schemas.availability import AvailabilitySlotIn, AvailabilityBlockIn
from app.models.local_upload import LocalUploadKind, LocalUploadStatus
from app.services import documents as doc_svc
from app.services import availability as avail_svc
from app.services import local_storage as local_svc
from app.services import s3
from app.config import settings

router = APIRouter(prefix="/supplier", tags=["Supplier"])

SupplierDep = require_role(Role.DRIVER, Role.FIRM)


def _doc_dict(d: Document) -> dict:
    return {
        "documentId": d.id,
        "userId": d.user_id,
        "docType": d.doc_type.value,
        "fileUrl": d.file_url,
        "status": d.status.value,
        "rejectionReason": d.rejection_reason,
        "createdAt": d.created_at.isoformat() if d.created_at else None,
    }


# ── Documents ─────────────────────────────────────────────────────────────────

@router.post("/documents/upload", status_code=201)
async def upload_document_direct(
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
    # Mobile sends 'documentType'; also accept 'doc_type' for web clients
    documentType: str = Form(None),
    doc_type: str = Form(None),
    expiryDate: str = Form(None),
    file: UploadFile = File(...),
):
    raw_type = (documentType or doc_type or "").strip().upper()
    try:
        DocType(raw_type)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid documentType '{raw_type}'. Must be one of: {[e.value for e in DocType]}",
        )

    suffix = {
        "image/jpeg": "jpg", "image/jpg": "jpg",
        "image/png": "png", "image/webp": "webp",
        "application/pdf": "pdf",
    }.get(file.content_type or "", (file.filename or "").rsplit(".", 1)[-1] or "pdf")

    contents = await file.read()

    if local_svc.azure_available():
        key = f"documents/{current_user.id}/{raw_type}/{str(uuid4())[:8]}.{suffix}"
        s3.upload_bytes(settings.AZURE_CONTAINER_DOCS, key, contents, file.content_type or "application/pdf")
        file_url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{key}"
    else:
        local_svc.ensure_local_upload_root()
        key = f"documents/{current_user.id}/{raw_type}/{str(uuid4())[:8]}.{suffix}"
        file_path = local_svc.LOCAL_UPLOAD_ROOT / key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(contents)
        file_url = f"{settings.BACKEND_URL}/uploads/{key}"
        record = local_svc.create_pending_upload(
            db,
            user_id=current_user.id,
            kind=LocalUploadKind.DOCUMENT,
            original_name=file.filename or f"doc.{suffix}",
            content_type=file.content_type or "application/pdf",
            storage_key=key,
        )
        record.public_url = file_url
        record.status = LocalUploadStatus.STORED
        db.commit()

    doc = doc_svc.upsert_document(db, current_user.id, raw_type, file_url)
    return created(data=_doc_dict(doc), message="Document uploaded and submitted for review")


@router.get("/documents/list")
def list_my_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    items = db.query(Document).filter(Document.user_id == current_user.id).all()
    return ok(data={"items": [_doc_dict(d) for d in items], "total": len(items)}, message="Documents retrieved")


@router.get("/documents/status")
def get_verification_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    docs = db.query(Document).filter(Document.user_id == current_user.id).all()
    summary = {doc.doc_type.value: doc.status.value for doc in docs}
    all_approved = all(d.status == DocStatus.APPROVED for d in docs) if docs else False
    return ok(
        data={
            "isVerified": current_user.verified,
            "profileComplete": current_user.profile_complete,
            "documentStatuses": summary,
            "allDocumentsApproved": all_approved,
        },
        message="Verification status retrieved",
    )


@router.get("/documents/{doc_id}")
def get_my_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return ok(data=_doc_dict(doc), message="Document retrieved")


@router.delete("/documents/delete/{doc_id}")
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return ok(data=None, message="Document deleted")


# ── Availability ──────────────────────────────────────────────────────────────

@router.post("/availability/set", status_code=201)
@router.post("/availability/slot/add", status_code=201)
def set_availability(
    body: AvailabilitySlotIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    slot = avail_svc.add_slot(db, current_user, body.day_of_week, body.start_time, body.end_time)
    return created(data={"slotId": slot.id, "dayOfWeek": slot.day_of_week}, message="Availability slot added")


@router.put("/availability/update/{slot_id}")
@router.put("/availability/slot/{slot_id}")
def update_availability(
    slot_id: str,
    body: AvailabilitySlotIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    from app.models.availability import AvailabilitySlot
    slot = db.get(AvailabilitySlot, slot_id)
    if not slot or slot.driver_id != current_user.id:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot.day_of_week = body.day_of_week
    slot.start_time = body.start_time
    slot.end_time = body.end_time
    db.commit()
    db.refresh(slot)
    return ok(data={"slotId": slot.id, "dayOfWeek": slot.day_of_week}, message="Slot updated")


@router.delete("/availability/slot/{slot_id}")
def delete_availability_slot(
    slot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    from app.models.availability import AvailabilitySlot
    slot = db.get(AvailabilitySlot, slot_id)
    if not slot or slot.driver_id != current_user.id:
        raise HTTPException(status_code=404, detail="Slot not found")
    db.delete(slot)
    db.commit()
    return ok(data=None, message="Slot deleted")


@router.put("/availability/toggle/{slot_id}")
def toggle_availability(
    slot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    slot = avail_svc.toggle_slot(db, slot_id, current_user)
    return ok(data={"slotId": slot.id, "isActive": slot.is_active}, message="Slot toggled")


@router.post("/availability/block", status_code=201)
def add_availability_block(
    body: AvailabilityBlockIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    block = avail_svc.add_block(db, current_user, body.start_date, body.end_date, body.reason)
    return created(data={"blockId": block.id}, message="Availability block added")


@router.delete("/availability/block/{block_id}")
def delete_availability_block(
    block_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    from app.models.availability import AvailabilityBlock
    block = db.get(AvailabilityBlock, block_id)
    if not block or block.driver_id != current_user.id:
        raise HTTPException(status_code=404, detail="Block not found")
    db.delete(block)
    db.commit()
    return ok(data=None, message="Block deleted")


@router.get("/availability/me")
def get_my_availability(
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    slots = avail_svc.list_slots(db, current_user.id)
    blocks = avail_svc.list_blocks(db, current_user.id)
    return ok(data={"slots": slots, "blocks": blocks}, message="Availability retrieved")


@router.get("/availability/{supplier_id}")
def get_supplier_availability(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slots = avail_svc.list_slots(db, supplier_id)
    blocks = avail_svc.list_blocks(db, supplier_id)
    return ok(data={"slots": slots, "blocks": blocks}, message="Availability retrieved")
