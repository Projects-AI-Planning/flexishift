"""
Flat /compliance/* endpoints matching the 125-API production spec.
The original job-scoped /jobs/:id/compliance/* endpoints are kept for backward
compatibility in compliance.py.
"""
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import uuid4

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.compliance import ComplianceRecord
from app.models.job import Job, JobStatus
from app.models.local_upload import LocalUploadKind, LocalUploadStatus
from app.models.user import User, Role
from app.services import compliance as comp_svc
from app.services import local_storage as local_svc
from app.services import s3
from app.config import settings

router = APIRouter(prefix="/compliance", tags=["Compliance"])

DriverDep = require_role(Role.DRIVER, Role.FIRM)
HaulierDep = require_role(Role.HAULIER, Role.FIRM)
AdminDep = require_role(Role.ADMIN)


# ── Load Code ─────────────────────────────────────────────────────────────────

class LoadCodeRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    load_code: str = Field(..., alias="loadCode")
    model_config = {"populate_by_name": True}


class ResendLoadCodeRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    model_config = {"populate_by_name": True}


@router.post("/load-code/verify")
def verify_load_code(
    body: LoadCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(DriverDep),
):
    record = comp_svc.verify_load_code(db, body.job_id, current_user.id, body.load_code)
    job = db.query(Job).filter(Job.id == body.job_id).first()
    return ok(
        data={
            "jobId": body.job_id,
            "jobRef": job.job_ref if job else None,
            "verified": True,
            "loadCodeVerifiedAt": record.load_code_verified_at.isoformat() if record.load_code_verified_at else None,
            "verifiedBy": current_user.id,
        },
        message="Load code verified",
    )


@router.get("/load-code/status/{job_id}")
def get_load_code_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    return ok(
        data={
            "jobId": job_id,
            "verified": bool(record and record.load_code_verified_at),
            "verifiedAt": record.load_code_verified_at.isoformat() if record and record.load_code_verified_at else None,
        },
        message="Load code status retrieved",
    )


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
    supplier = db.query(User).filter(User.id == job.selected_supplier_id).first()
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
    return ok(
        data={
            "jobId": job.id,
            "sentTo": job.selected_supplier_id,
            "sentVia": "PUSH_NOTIFICATION",
        },
        message="Load code resent to supplier",
    )


# ── Handover (Step 1) ─────────────────────────────────────────────────────────

class ChecklistRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    checklist_data: dict = Field(..., alias="checklistData")
    model_config = {"populate_by_name": True}


class PhotosUploadRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    count: int = 1
    model_config = {"populate_by_name": True}


class SignRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    signature_data: str = Field(..., alias="signatureData")
    model_config = {"populate_by_name": True}


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
    return ok(
        data={
            "checklistId": record.id,
            "jobId": body.job_id,
            "checklistSaved": True,
        },
        message="Checklist submitted",
    )


@router.post("/handover/photos/upload")
def get_handover_photo_upload_urls(
    body: PhotosUploadRequest,
    current_user: User = Depends(DriverDep),
):
    urls = []
    for _ in range(min(body.count, 10)):
        key = f"compliance/{body.job_id}/handover/{uuid4()}.jpg"
        result = s3.generate_presigned_upload(settings.AZURE_CONTAINER_DOCS, key, "image/jpeg")
        file_url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{key}"
        urls.append({**result, "fileUrl": file_url})
    return ok(data={"uploads": urls}, message="Upload URLs generated")


@router.post("/handover/photos/upload-direct")
async def upload_handover_photos_direct(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(DriverDep),
    job_id: str = Query(..., alias="jobId"),
    photos: List[UploadFile] = File(...),
):
    uploaded = []
    for photo in photos[:10]:
        suffix = {
            "image/jpeg": "jpg", "image/jpg": "jpg",
            "image/png": "png", "image/webp": "webp",
        }.get(photo.content_type or "", "jpg")
        key = f"compliance/{job_id}/handover/{uuid4()}.{suffix}"
        contents = await photo.read()
        if local_svc.azure_available():
            s3.upload_bytes(settings.AZURE_CONTAINER_DOCS, key, contents, photo.content_type or "image/jpeg")
            file_url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{key}"
        else:
            local_svc.ensure_local_upload_root()
            file_path = local_svc.LOCAL_UPLOAD_ROOT / key
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(contents)
            file_url = str(request.url_for("uploads", path=key))
            record = local_svc.create_pending_upload(
                db,
                user_id=current_user.id,
                kind=LocalUploadKind.IMAGE,
                original_name=photo.filename or f"handover.{suffix}",
                content_type=photo.content_type or "image/jpeg",
                storage_key=key,
            )
            record.public_url = file_url
            record.status = LocalUploadStatus.STORED
            db.commit()
        uploaded.append({"key": key, "fileUrl": file_url})
    return ok(data={"uploads": uploaded, "photos": uploaded}, message="Handover photos uploaded")


@router.get("/handover/photos/list/{job_id}")
def list_handover_photos(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    photos = record.condition_photo_urls or [] if record else []
    return ok(data={"jobId": job_id, "photos": photos, "total": len(photos)}, message="Photos listed")


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
    record.driver_signature_url = body.signature_data
    record.driver_signed_at = datetime.now(timezone.utc)
    _try_complete_step1(record, job, db)
    db.commit()
    return ok(
        data={
            "jobId": body.job_id,
            "driverSigned": True,
            "driverSignedAt": record.driver_signed_at.isoformat() if record.driver_signed_at else None,
            "step1Completed": bool(record.step1_completed_at),
            "step1CompletedAt": record.step1_completed_at.isoformat() if record.step1_completed_at else None,
        },
        message="Driver signature recorded",
    )


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
    record.haulier_signature_url = body.signature_data
    record.haulier_signed_at = datetime.now(timezone.utc)
    _try_complete_step1(record, job, db)
    db.commit()
    return ok(
        data={
            "jobId": body.job_id,
            "haulierSigned": True,
            "haulierSignedAt": record.haulier_signed_at.isoformat() if record.haulier_signed_at else None,
            "step1Completed": bool(record.step1_completed_at),
            "step1CompletedAt": record.step1_completed_at.isoformat() if record.step1_completed_at else None,
        },
        message="Haulier signature recorded",
    )


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
    return ok(
        data={
            "jobId": job_id,
            "checklistSubmitted": bool(record and record.checklist_data),
            "driverSigned": bool(record and record.driver_signature_url),
            "driverSignedAt": record.driver_signed_at.isoformat() if record and record.driver_signed_at else None,
            "haulierSigned": bool(record and record.haulier_signature_url),
            "haulierSignedAt": record.haulier_signed_at.isoformat() if record and record.haulier_signed_at else None,
            "step1Completed": bool(record and record.step1_completed_at),
            "step1CompletedAt": record.step1_completed_at.isoformat() if record and record.step1_completed_at else None,
        },
        message="Handover status retrieved",
    )


# ── Delivery (Step 2 & 3) ─────────────────────────────────────────────────────

class DeliverySubmitRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    delivery_photo_url: str = Field(..., alias="deliveryPhotoUrl")
    recipient_signature_url: str = Field(..., alias="recipientSignatureUrl")
    recipient_name: Optional[str] = Field(None, alias="recipientName")
    delivery_notes: Optional[str] = Field(None, alias="deliveryNotes")
    model_config = {"populate_by_name": True}


class DeliveryPhotoUploadRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    count: int = 1
    model_config = {"populate_by_name": True}


class DisputeRequest(BaseModel):
    dispute_reason: str = Field(..., alias="disputeReason")
    model_config = {"populate_by_name": True}


@router.post("/delivery/submit")
def submit_delivery(
    body: DeliverySubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(DriverDep),
):
    record = comp_svc.complete_step2(db, body.job_id, current_user.id, body.model_dump(by_alias=False))
    return ok(
        data={
            "deliveryId": record.id,
            "jobId": body.job_id,
            "deliverySubmitted": True,
            "step2CompletedAt": record.step2_completed_at.isoformat() if record.step2_completed_at else None,
            "paymentOnHold": True,
        },
        message="Delivery submitted",
    )


@router.post("/delivery/photos/upload")
def get_delivery_photo_upload_urls(
    body: DeliveryPhotoUploadRequest,
    current_user: User = Depends(DriverDep),
):
    from uuid import uuid4
    urls = []
    for _ in range(min(body.count, 10)):
        key = f"compliance/{body.job_id}/delivery/{uuid4()}.jpg"
        result = s3.generate_presigned_upload(settings.AZURE_CONTAINER_DOCS, key, "image/jpeg")
        file_url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{key}"
        urls.append({**result, "fileUrl": file_url})
    return ok(data={"uploads": urls}, message="Upload URLs generated")


@router.post("/delivery/photos/upload-direct")
async def upload_delivery_photos_direct(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(DriverDep),
    job_id: str = Query(..., alias="jobId"),
    photos: List[UploadFile] = File(...),
):
    uploaded = []
    for photo in photos[:10]:
        suffix = {
            "image/jpeg": "jpg", "image/jpg": "jpg",
            "image/png": "png", "image/webp": "webp",
        }.get(photo.content_type or "", "jpg")
        key = f"compliance/{job_id}/delivery/{uuid4()}.{suffix}"
        contents = await photo.read()
        if local_svc.azure_available():
            s3.upload_bytes(settings.AZURE_CONTAINER_DOCS, key, contents, photo.content_type or "image/jpeg")
            file_url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{key}"
        else:
            local_svc.ensure_local_upload_root()
            file_path = local_svc.LOCAL_UPLOAD_ROOT / key
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(contents)
            file_url = str(request.url_for("uploads", path=key))
            record = local_svc.create_pending_upload(
                db,
                user_id=current_user.id,
                kind=LocalUploadKind.IMAGE,
                original_name=photo.filename or f"delivery.{suffix}",
                content_type=photo.content_type or "image/jpeg",
                storage_key=key,
            )
            record.public_url = file_url
            record.status = LocalUploadStatus.STORED
            db.commit()
        uploaded.append({"key": key, "fileUrl": file_url})
    return ok(data={"uploads": uploaded, "photos": uploaded}, message="Delivery photos uploaded")


@router.post("/delivery/approve/{job_id}")
async def approve_delivery(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(HaulierDep),
):
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job or job.haulier_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    record = await comp_svc.approve_delivery(db, job_id, current_user.id)
    return ok(
        data={
            "jobId": job_id,
            "approved": True,
            "step3ApprovedAt": record.step3_approved_at.isoformat() if record.step3_approved_at else None,
            "paymentReleaseInitiated": True,
        },
        message="Delivery approved",
    )


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
    record = comp_svc.raise_dispute(db, job_id, current_user.id, body.dispute_reason)
    return ok(
        data={
            "disputeId": record.id,
            "jobId": job_id,
            "disputed": True,
            "disputeReason": body.dispute_reason,
            "disputedAt": record.disputed_at.isoformat() if record.disputed_at else None,
            "paymentOnHold": True,
        },
        message="Dispute raised",
    )


@router.get("/delivery/status/{job_id}")
def get_delivery_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    return ok(
        data={
            "jobId": job_id,
            "deliverySubmitted": bool(record and record.step2_completed_at),
            "deliverySubmittedAt": record.delivery_submitted_at.isoformat() if record and record.delivery_submitted_at else None,
            "step3Approved": bool(record and record.step3_approved_at),
            "step3ApprovedAt": record.step3_approved_at.isoformat() if record and record.step3_approved_at else None,
            "disputed": bool(record and record.disputed_at),
            "disputeReason": record.dispute_reason if record else None,
            "paymentOnHold": bool(record and record.disputed_at and not record.step3_approved_at),
        },
        message="Delivery status retrieved",
    )


# ── Disputes ──────────────────────────────────────────────────────────────────

from app.schemas.admin import ResolveDisputeRequest

@router.put("/dispute/resolve/{job_id}")
def resolve_dispute(
    job_id: str,
    body: ResolveDisputeRequest,
    db: Session = Depends(get_db),
    _: User = Depends(AdminDep),
):
    record = comp_svc.resolve_dispute(
        db, job_id,
        resolution=body.resolution,
        notes=body.admin_note,
        refund_amount=body.refund_amount,
        release_amount=body.release_amount
    )
    return ok(
        data={
            "disputeId": record.id,
            "jobId": job_id,
            "resolution": body.resolution,
            "refundAmount": body.refund_amount,
            "releaseAmount": body.release_amount,
            "adminNote": body.admin_note,
            "status": "resolved",
            "resolvedAt": record.step3_approved_at.isoformat() if record.step3_approved_at else None,
        },
        message="Dispute resolved successfully",
    )


# ── Full Status ───────────────────────────────────────────────────────────────

@router.get("/full-status/{job_id}")
def get_full_compliance_status(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = comp_svc.get_full_status(db, job_id)
    return ok(data=data, message="Compliance status retrieved")
