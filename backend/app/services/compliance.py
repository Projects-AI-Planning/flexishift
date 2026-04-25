from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.job import Job, JobStatus
from app.models.compliance import ComplianceRecord


def get_or_create_compliance(db: Session, job_id: str) -> ComplianceRecord:
    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    if not record:
        record = ComplianceRecord(job_id=job_id)
        db.add(record)
        db.flush()
    return record


def complete_step1(db: Session, job_id: str, supplier_id: str, data: dict) -> ComplianceRecord:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.selected_supplier_id != supplier_id:
        raise HTTPException(status_code=403, detail="Only the assigned supplier can complete step 1")
    if job.status != JobStatus.PAYMENT_SECURED:
        raise HTTPException(status_code=422, detail="Payment must be secured before pre-trip inspection")

    record = get_or_create_compliance(db, job_id)
    if record.step1_completed_at:
        raise HTTPException(status_code=409, detail="Step 1 already completed")

    now = datetime.now(timezone.utc)
    record.checklist_data = data["checklist_data"]
    record.condition_photo_urls = data["condition_photo_urls"]
    record.driver_signature_url = data["driver_signature_url"]
    record.driver_signed_at = now
    record.haulier_signature_url = data["haulier_signature_url"]
    record.haulier_signed_at = now
    record.step1_completed_at = now

    job.status = JobStatus.IN_TRANSIT
    db.commit()
    db.refresh(record)
    return record


def complete_step2(db: Session, job_id: str, supplier_id: str, data: dict) -> ComplianceRecord:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.selected_supplier_id != supplier_id:
        raise HTTPException(status_code=403, detail="Only the assigned supplier can complete step 2")
    if job.status != JobStatus.IN_TRANSIT:
        raise HTTPException(status_code=422, detail="Job must be in transit for delivery confirmation")

    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    if not record or not record.step1_completed_at:
        raise HTTPException(status_code=422, detail="Step 1 must be completed first")
    if record.step2_completed_at:
        raise HTTPException(status_code=409, detail="Step 2 already completed")

    now = datetime.now(timezone.utc)
    record.delivery_photo_url = data["delivery_photo_url"]
    record.recipient_signature_url = data["recipient_signature_url"]
    record.delivery_notes = data.get("delivery_notes")
    record.delivery_submitted_at = now
    record.step2_completed_at = now

    job.status = JobStatus.DELIVERY_SUBMITTED
    db.commit()
    db.refresh(record)
    return record


def approve_delivery(db: Session, job_id: str) -> ComplianceRecord:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.DELIVERY_SUBMITTED:
        raise HTTPException(status_code=422, detail="Job must be in DELIVERY_SUBMITTED state")

    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Compliance record not found")

    now = datetime.now(timezone.utc)
    record.step3_approved_at = now

    job.status = JobStatus.COMPLETED

    supplier = job.supplier
    if supplier:
        supplier.completed_jobs += 1

    db.commit()
    db.refresh(record)
    return record


def raise_dispute(db: Session, job_id: str, dispute_reason: str) -> ComplianceRecord:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.DELIVERY_SUBMITTED:
        raise HTTPException(status_code=422, detail="Can only dispute a delivery submission")

    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Compliance record not found")

    now = datetime.now(timezone.utc)
    record.dispute_reason = dispute_reason
    record.disputed_at = now

    job.status = JobStatus.DISPUTED
    db.commit()
    db.refresh(record)
    return record
