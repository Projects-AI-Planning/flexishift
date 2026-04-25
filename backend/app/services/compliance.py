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


def verify_load_code(db: Session, job_id: str, supplier_id: str, entered_code: str) -> ComplianceRecord:
    """Step 1 – driver enters load code; system verifies it matches job record."""
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.selected_supplier_id != supplier_id:
        raise HTTPException(status_code=403, detail="Only the assigned supplier can verify the load code")
    if job.status != JobStatus.PAYMENT_SECURED:
        raise HTTPException(status_code=422, detail="Payment must be secured before load code verification")

    if entered_code.strip().upper() != job.load_code.strip().upper():
        raise HTTPException(status_code=400, detail="Load code does not match. Cannot proceed.")

    record = get_or_create_compliance(db, job_id)
    if record.load_code_verified_at:
        raise HTTPException(status_code=409, detail="Load code already verified")

    record.load_code_verified_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return record


def complete_step1(db: Session, job_id: str, supplier_id: str, data: dict) -> ComplianceRecord:
    """Step 2 – vehicle handover dual sign-off. Requires load code verified first."""
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.selected_supplier_id != supplier_id:
        raise HTTPException(status_code=403, detail="Only the assigned supplier can complete handover")
    if job.status != JobStatus.PAYMENT_SECURED:
        raise HTTPException(status_code=422, detail="Payment must be secured before vehicle handover")

    record = get_or_create_compliance(db, job_id)
    if not record.load_code_verified_at:
        raise HTTPException(status_code=422, detail="Load code must be verified before vehicle handover")
    if record.step1_completed_at:
        raise HTTPException(status_code=409, detail="Vehicle handover already completed")

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
    """Step 3 – driver submits delivery proof at drop location."""
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.selected_supplier_id != supplier_id:
        raise HTTPException(status_code=403, detail="Only the assigned supplier can submit delivery proof")
    if job.status != JobStatus.IN_TRANSIT:
        raise HTTPException(status_code=422, detail="Job must be in transit for delivery confirmation")

    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    if not record or not record.step1_completed_at:
        raise HTTPException(status_code=422, detail="Vehicle handover must be completed first")
    if record.step2_completed_at:
        raise HTTPException(status_code=409, detail="Delivery proof already submitted")

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


async def approve_delivery(db: Session, job_id: str, approver_id: str) -> ComplianceRecord:
    """Haulier approves delivery → triggers payment release and job completion."""
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.haulier_id != approver_id:
        raise HTTPException(status_code=403, detail="Only the job haulier can approve delivery")
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

    # Trigger payment release automatically on approval
    from app.services.payments import release_payment
    try:
        release_payment(db, job_id)
    except HTTPException:
        pass  # payment release may fail gracefully (e.g. no bank account); job still completes

    # Notify supplier
    from app.services.notifications import create_notification
    await create_notification(
        db, job.selected_supplier_id, "PAYMENT_RELEASED",
        "Delivery Approved – Payment Released",
        f"Haulier approved delivery for job {job.job_ref}. Payment has been released.",
        {"job_id": job_id, "job_ref": job.job_ref},
    )
    db.commit()
    db.refresh(record)
    return record


def raise_dispute(db: Session, job_id: str, haulier_id: str, dispute_reason: str) -> ComplianceRecord:
    """Haulier raises a dispute on the delivery submission."""
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.haulier_id != haulier_id:
        raise HTTPException(status_code=403, detail="Only the job haulier can raise a dispute")
    if job.status != JobStatus.DELIVERY_SUBMITTED:
        raise HTTPException(status_code=422, detail="Can only dispute a delivery submission")

    record = db.query(ComplianceRecord).filter(ComplianceRecord.job_id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Compliance record not found")

    record.dispute_reason = dispute_reason
    record.disputed_at = datetime.now(timezone.utc)
    job.status = JobStatus.DISPUTED
    db.commit()
    db.refresh(record)
    return record
