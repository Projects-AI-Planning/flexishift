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
    """Cancel OPEN jobs whose job_date is before today only if they received at least
    one quote.  Zero-quote jobs are left OPEN so the haulier can still see and repost
    them — drivers already can't find them due to the job_date >= today filter."""
    from app.models.quote import Quote

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
        quote_count = db.query(Quote).filter(Quote.job_id == job.id).count()
        if quote_count == 0:
            # No driver quoted — keep OPEN so haulier can see and repost
            continue

        job.status = JobStatus.CANCELLED
        db.flush()

        await create_notification(
            db=db,
            user_id=job.haulier_id,
            type="JOB_EXPIRED",
            title="Job expired — no driver accepted",
            body=(
                f"Your job {job.job_ref} (pickup {job.job_date}) "
                "passed its pickup date with no driver accepting. It has been cancelled."
            ),
            data={"jobId": job.id, "jobRef": job.job_ref},
        )

    db.commit()


# ── Shifts ────────────────────────────────────────────────────────────────────

async def expire_stale_shifts(db: Session) -> None:
    """Cancel OPEN shifts whose start_date is before today only if they received at
    least one quote.  Zero-quote shifts are left OPEN so the haulier can still see
    and repost them — drivers already can't find them due to the start_date >= today
    filter on list_available_shifts."""
    from app.models.shift import ShiftQuote

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
        quote_count = db.query(ShiftQuote).filter(ShiftQuote.shift_id == shift.id).count()
        if quote_count == 0:
            # No driver quoted — keep OPEN so haulier can see and repost
            continue

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
