from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.models.quote import Quote, QuoteStatus
from app.models.user import User


ACTIVE_STATUSES = [JobStatus.PAYMENT_SECURED, JobStatus.IN_TRANSIT]
COMPLETED_STATUS = JobStatus.COMPLETED


def driver_dashboard(db: Session, driver: User) -> dict:
    """Active job, upcoming & past jobs, total earnings summary."""
    active_job = (
        db.query(Job)
        .filter(
            Job.selected_supplier_id == driver.id,
            Job.status.in_(ACTIVE_STATUSES),
            Job.deleted_at.is_(None),
        )
        .first()
    )

    upcoming_jobs = (
        db.query(Job)
        .filter(
            Job.selected_supplier_id == driver.id,
            Job.status == JobStatus.BOOKED,
            Job.deleted_at.is_(None),
        )
        .order_by(Job.job_date.asc())
        .limit(10)
        .all()
    )

    past_jobs = (
        db.query(Job)
        .filter(
            Job.selected_supplier_id == driver.id,
            Job.status == COMPLETED_STATUS,
            Job.deleted_at.is_(None),
        )
        .order_by(Job.updated_at.desc())
        .limit(20)
        .all()
    )

    total_earnings = (
        db.query(func.sum(Payment.amount))
        .join(Job, Job.id == Payment.job_id)
        .filter(
            Job.selected_supplier_id == driver.id,
            Payment.status == PaymentStatus.RELEASED,
        )
        .scalar() or 0.0
    )

    return {
        "active_job": active_job,
        "upcoming_jobs": upcoming_jobs,
        "past_jobs": past_jobs,
        "completed_jobs_count": driver.completed_jobs,
        "avg_rating": float(driver.avg_rating or 0),
        "total_earnings": float(total_earnings),
    }


def haulier_dashboard(db: Session, haulier: User) -> dict:
    """Active jobs with live status, jobs awaiting approval, total spend."""
    active_jobs = (
        db.query(Job)
        .filter(
            Job.haulier_id == haulier.id,
            Job.status.in_([
                JobStatus.OPEN, JobStatus.BOOKED,
                JobStatus.PAYMENT_PENDING, JobStatus.PAYMENT_SECURED,
                JobStatus.IN_TRANSIT,
            ]),
            Job.deleted_at.is_(None),
        )
        .order_by(Job.job_date.asc())
        .all()
    )

    awaiting_approval = (
        db.query(Job)
        .filter(
            Job.haulier_id == haulier.id,
            Job.status == JobStatus.DELIVERY_SUBMITTED,
            Job.deleted_at.is_(None),
        )
        .all()
    )

    disputed_jobs = (
        db.query(Job)
        .filter(
            Job.haulier_id == haulier.id,
            Job.status == JobStatus.DISPUTED,
            Job.deleted_at.is_(None),
        )
        .all()
    )

    total_spend = (
        db.query(func.sum(Payment.amount))
        .join(Job, Job.id == Payment.job_id)
        .filter(
            Job.haulier_id == haulier.id,
            Payment.status.in_([PaymentStatus.ESCROWED, PaymentStatus.RELEASED]),
        )
        .scalar() or 0.0
    )

    open_quotes_count = (
        db.query(func.count(Quote.id))
        .join(Job, Job.id == Quote.job_id)
        .filter(
            Job.haulier_id == haulier.id,
            Quote.status == QuoteStatus.ACTIVE,
        )
        .scalar() or 0
    )

    return {
        "active_jobs": active_jobs,
        "awaiting_approval": awaiting_approval,
        "disputed_jobs": disputed_jobs,
        "active_jobs_count": len(active_jobs),
        "awaiting_approval_count": len(awaiting_approval),
        "open_quotes_count": open_quotes_count,
        "total_spend": float(total_spend),
    }
