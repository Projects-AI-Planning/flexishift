from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.document import Document, DocType, DocStatus
from app.models.user import User, Role
from app.schemas.availability import AvailabilitySlotIn, AvailabilitySlotOut, AvailabilityBlockIn, AvailabilityBlockOut
from app.schemas.documents import DocumentOut, DocumentListOut
from app.services import documents as doc_svc
from app.services import availability as avail_svc

router = APIRouter(prefix="/supplier", tags=["Supplier"])

SupplierDep = require_role(Role.DRIVER, Role.FIRM)


# ── Documents ─────────────────────────────────────────────────────────────────

@router.post("/documents/upload")
def get_document_upload_url(
    doc_type: str = Query(...),
    current_user: User = Depends(SupplierDep),
):
    DocType(doc_type)
    return doc_svc.get_upload_url(doc_type, current_user.id)


@router.get("/documents/list", response_model=DocumentListOut)
def list_my_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    items = db.query(Document).filter(Document.user_id == current_user.id).all()
    return {"items": items, "total": len(items)}


@router.get("/documents/status")
def get_verification_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    docs = db.query(Document).filter(Document.user_id == current_user.id).all()
    summary = {doc.doc_type.value: doc.status.value for doc in docs}
    all_approved = all(d.status == DocStatus.APPROVED for d in docs) if docs else False
    return {
        "verified": current_user.verified,
        "profile_complete": current_user.profile_complete,
        "document_statuses": summary,
        "all_documents_approved": all_approved,
    }


@router.get("/documents/{doc_id}", response_model=DocumentOut)
def get_my_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/documents/delete/{doc_id}", status_code=204)
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


# ── Availability ──────────────────────────────────────────────────────────────

@router.post("/availability/set", response_model=AvailabilitySlotOut, status_code=201)
def set_availability(
    body: AvailabilitySlotIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    return avail_svc.add_slot(db, current_user, body.day_of_week, body.start_time, body.end_time)


@router.put("/availability/update/{slot_id}", response_model=AvailabilitySlotOut)
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
    return slot


@router.put("/availability/toggle/{slot_id}", response_model=AvailabilitySlotOut)
def toggle_availability(
    slot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    return avail_svc.toggle_slot(db, slot_id, current_user)


@router.get("/availability/{supplier_id}")
def get_supplier_availability(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slots = avail_svc.list_slots(db, supplier_id)
    blocks = avail_svc.list_blocks(db, supplier_id)
    return {"slots": slots, "blocks": blocks}
