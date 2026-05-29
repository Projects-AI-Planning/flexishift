"""
Lazy-expiry service.

Called as a FastAPI BackgroundTask whenever a driver fetches available
jobs or available shifts.  It finds OPEN jobs/shifts whose pickup/start
date is in the past, cancels them, and sends a push notification to the
haulier who posted them.
"""

from __future__ import annotations

from datetime import date
from sqlalchemy.orm import Session

from app.models.job   import Job,   JobStatus
from app.models.shift import Shift, ShiftStatus


# ── Jobs ──────────────────────────────────────────────────────────────────────

async def expire_stale_jobs(db: Session) -> None:
    """Cancel every OPEN job whose job_date is before today and notify haulier."""
    today = date.today()
    stale = (
        db.query(Job)
        .filter(Job.status == JobStatus.OPEN, Job.job_date < today, Job.deleted_at.is_(None))
        .all()
    )
    if not stale:
        return

    from app.services.notifications import create_notification

    for job in stale:
        job.status = JobStatus.CANCELLED
        db.flush()

        await create_notification(
            db=db,
            user_id=job.haulier_id,
            type="JOB_EXPIRED",
            title="Job expired — no driver accepted",
            body=(
                f"Your job {job.job_reference} (pickup {job.job_date}) "
                "passed its pickup date with no driver accepting. It has been cancelled."
            ),
            data={"jobId": job.id, "jobRef": job.job_reference},
        )

    db.commit()


# ── Shifts ────────────────────────────────────────────────────────────────────

async def expire_stale_shifts(db: Session) -> None:
    """Cancel every OPEN shift whose start_date is before today and notify haulier."""
    today = date.today()
    stale = (
        db.query(Shift)
        .filter(Shift.status == ShiftStatus.OPEN, Shift.start_date < today)
        .all()
    )
    if not stale:
        return

    from app.services.notifications import create_notification

    for shift in stale:
        shift.status = ShiftStatus.CANCELLED
        db.flush()

        await create_notification(
            db=db,
            user_id=shift.haulier_id,
            type="SHIFT_EXPIRED",
            title="Shift expired — no driver accepted",
            body=(
                f"Your shift {shift.shift_ref} (starting {shift.start_date}) "
                "passed its start date with no driver accepting. It has been cancelled."
            ),
            data={"shiftId": shift.id, "shiftRef": shift.shift_ref},
        )

    db.commit()
