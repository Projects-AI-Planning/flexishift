"""
Flat /compliance/* endpoints matching the 125-API production spec.
The original job-scoped /jobs/:id/compliance/* endpoints are kept for backward
compatibility in compliance.py.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.compliance import ComplianceRecord
from app.models.job import Job, JobStatus
from app.models.user import User, Role
from app.schemas.compliance import ComplianceOut
from app.services import compliance as comp_svc
from app.services import s3
from app.config import settings

router = APIRouter(prefix="/compliance", tags=["Compliance"])

DriverDep = require_role(Role.DRIVER, Role.FIRM)
HaulierDep = require_role(Role.HAULIER, Role.FIRM)
AdminDep = require_role(Role.ADMIN)


# ── Load Code ─────────────────────────────────────────────────────────────────

class LoadCodeRequest(BaseModel):
    job_id: str
    code: str


class ResendLoadCodeRequest(BaseModel):
    job_id: str


@router.post("/load-code/verify")
def verify_load_code(
    body: LoadCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(DriverDep),
):
    record = comp_svc.verify_load_code(db, body.job_id, current_user.id, body.code)
    return {
        "verified": True,
        "job_id": body.job_id,
        "load_code_verified_at": record.load_code_verified_at,
    }


@router.get("/load-code/status/{job_id}")
def get_load_code_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    return {
        "job_id": job_id,
        "verified": bool(record and record.load_code_verified_at),
        "verified_at": record.load_code_verified_at if record else None,
    }


@router.post("/load-code/resend")
async def resend_load_code(
    body: ResendLoadCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(HaulierDep),
):
    job = db.query(Job).filter(Job.id == body.job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.haulier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not job.selected_supplier_id:
        raise HTTPException(status_code=422, detail="No supplier assigned to this job")
    from app.services.notifications import create_notification
    await create_notification(
        db,
        job.selected_supplier_id,
        "LOAD_CODE",
        "Load Code Reminder",
        f"Your load code for job {job.job_ref} is: {job.load_code}",
        data={"job_id": job.id, "load_code": job.load_code},
    )
    db.commit()
    return {"detail": "Load code resent to supplier"}


# ── Handover (Step 1) ─────────────────────────────────────────────────────────

class ChecklistRequest(BaseModel):
    job_id: str
    checklist_data: dict


class PhotosUploadRequest(BaseModel):
    job_id: str
    count: int = 1


class SignRequest(BaseModel):
    job_id: str
    signature_url: str


@router.post("/handover/checklist/submit")
def submit_handover_checklist(
    body: ChecklistRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(DriverDep),
):
    job = db.query(Job).filter(Job.id == body.job_id, Job.deleted_at.is_(None)).first()
    if not job or job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found or forbidden")
    record = comp_svc.get_or_create_compliance(db, body.job_id)
    record.checklist_data = body.checklist_data
    db.commit()
    return {"job_id": body.job_id, "checklist_saved": True}


@router.post("/handover/photos/upload")
def get_handover_photo_upload_urls(
    body: PhotosUploadRequest,
    current_user: User = Depends(DriverDep),
):
    from uuid import uuid4
    urls = []
    for i in range(min(body.count, 10)):
        key = f"compliance/{body.job_id}/handover/{uuid4()}.jpg"
        result = s3.generate_presigned_upload(settings.AWS_S3_BUCKET_DOCS, key, "image/jpeg")
        file_url = f"https://{settings.AWS_S3_BUCKET_DOCS}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
        urls.append({**result, "file_url": file_url})
    return {
        "uploads": urls,
        "note": "After uploading photos, call /compliance/handover/sign/driver with condition_photo_urls",
    }


@router.get("/handover/photos/list/{job_id}")
def list_handover_photos(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    if not record:
        return {"job_id": job_id, "photos": [], "total": 0}
    photos = record.condition_photo_urls or []
    return {"job_id": job_id, "photos": photos, "total": len(photos)}


@router.post("/handover/sign/driver")
def driver_sign_handover(
    body: SignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(DriverDep),
):
    from datetime import datetime, timezone
    job = db.query(Job).filter(Job.id == body.job_id, Job.deleted_at.is_(None)).first()
    if not job or job.selected_supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found or forbidden")
    record = comp_svc.get_or_create_compliance(db, body.job_id)
    record.driver_signature_url = body.signature_url
    record.driver_signed_at = datetime.now(timezone.utc)
    _try_complete_step1(record, job, db)
    db.commit()
    return {
        "job_id": body.job_id,
        "driver_signed": True,
        "step1_completed": bool(record.step1_completed_at),
    }


@router.post("/handover/sign/haulier")
def haulier_sign_handover(
    body: SignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(HaulierDep),
):
    from datetime import datetime, timezone
    job = db.query(Job).filter(Job.id == body.job_id, Job.deleted_at.is_(None)).first()
    if not job or job.haulier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found or forbidden")
    record = comp_svc.get_or_create_compliance(db, body.job_id)
    record.haulier_signature_url = body.signature_url
    record.haulier_signed_at = datetime.now(timezone.utc)
    _try_complete_step1(record, job, db)
    db.commit()
    return {
        "job_id": body.job_id,
        "haulier_signed": True,
        "step1_completed": bool(record.step1_completed_at),
    }


def _try_complete_step1(record: ComplianceRecord, job: Job, db: Session) -> None:
    from datetime import datetime, timezone
    if (
        record.driver_signature_url
        and record.haulier_signature_url
        and not record.step1_completed_at
    ):
        record.step1_completed_at = datetime.now(timezone.utc)
        job.status = JobStatus.IN_TRANSIT


@router.get("/handover/status/{job_id}")
def get_handover_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    return {
        "job_id": job_id,
        "checklist_submitted": bool(record and record.checklist_data),
        "driver_signed": bool(record and record.driver_signature_url),
        "haulier_signed": bool(record and record.haulier_signature_url),
        "step1_completed": bool(record and record.step1_completed_at),
        "step1_completed_at": record.step1_completed_at if record else None,
    }


# ── Delivery (Step 2 & 3) ─────────────────────────────────────────────────────

class DeliverySubmitRequest(BaseModel):
    job_id: str
    delivery_photo_url: str
    recipient_signature_url: str
    delivery_notes: Optional[str] = None


class DeliveryPhotoUploadRequest(BaseModel):
    job_id: str
    count: int = 1


class DisputeRequest(BaseModel):
    dispute_reason: str


@router.post("/delivery/submit")
def submit_delivery(
    body: DeliverySubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(DriverDep),
):
    record = comp_svc.complete_step2(db, body.job_id, current_user.id, body.model_dump())
    return {
        "job_id": body.job_id,
        "delivery_submitted": True,
        "step2_completed_at": record.step2_completed_at,
    }


@router.post("/delivery/photos/upload")
def get_delivery_photo_upload_urls(
    body: DeliveryPhotoUploadRequest,
    current_user: User = Depends(DriverDep),
):
    from uuid import uuid4
    urls = []
    for _ in range(min(body.count, 10)):
        key = f"compliance/{body.job_id}/delivery/{uuid4()}.jpg"
        result = s3.generate_presigned_upload(settings.AWS_S3_BUCKET_DOCS, key, "image/jpeg")
        file_url = f"https://{settings.AWS_S3_BUCKET_DOCS}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
        urls.append({**result, "file_url": file_url})
    return {"uploads": urls}


@router.post("/delivery/approve/{job_id}")
def approve_delivery(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(HaulierDep),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job or job.haulier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    record = comp_svc.approve_delivery(db, job_id)
    return {"job_id": job_id, "approved": True, "step3_approved_at": record.step3_approved_at}


@router.post("/delivery/dispute/{job_id}")
def raise_dispute(
    job_id: str,
    body: DisputeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(HaulierDep),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job or job.haulier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    record = comp_svc.raise_dispute(db, job_id, body.dispute_reason)
    return {"job_id": job_id, "disputed": True, "disputed_at": record.disputed_at}


@router.get("/delivery/status/{job_id}")
def get_delivery_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    return {
        "job_id": job_id,
        "delivery_submitted": bool(record and record.step2_completed_at),
        "delivery_submitted_at": record.delivery_submitted_at if record else None,
        "step3_approved": bool(record and record.step3_approved_at),
        "step3_approved_at": record.step3_approved_at if record else None,
        "disputed": bool(record and record.disputed_at),
        "dispute_reason": record.dispute_reason if record else None,
    }


# ── Disputes ──────────────────────────────────────────────────────────────────

class ResolveDisputeRequest(BaseModel):
    resolution: str  # APPROVE | REJECT
    notes: Optional[str] = None


@router.get("/dispute/list")
def list_disputes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    q = db.query(Job).filter(Job.status == JobStatus.DISPUTED, Job.deleted_at.is_(None))
    total = q.count()
    items = q.order_by(Job.updated_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.put("/dispute/resolve/{job_id}")
def resolve_dispute(
    job_id: str,
    body: ResolveDisputeRequest,
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    record = comp_svc.resolve_dispute(db, job_id, body.resolution, body.notes)
    return {
        "job_id": job_id,
        "resolution": body.resolution,
        "step3_approved_at": record.step3_approved_at,
    }


# ── Full Status ───────────────────────────────────────────────────────────────

@router.get("/full-status/{job_id}")
def get_full_compliance_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return comp_svc.get_full_status(db, job_id)
