"""Permanent account deletion.

Apple App Store guideline 5.1.1(v) requires an in-app way to permanently delete an
account — a temporary deactivation is explicitly not enough. This module does the
real thing: every piece of personal data we hold is erased, and the account can
never be signed into again.

The `users` row itself is kept as an anonymised tombstone rather than being
DELETEd, because jobs, quotes, ratings and payments all carry a non-cascading FK
to it, and invoices/payment records must be retained to satisfy tax law (7 years,
as stated on the public /legal/delete-account page). After this runs the row holds
no personal data — no name, email, phone, location, documents, photos or tokens —
so nothing identifiable survives.
"""

from datetime import datetime
from pathlib import Path
from uuid import uuid4

import structlog
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.audit_log import UserDevice
from app.models.availability import AvailabilityBlock, AvailabilitySlot
from app.models.document import Document
from app.models.job import Job, JobStatus
from app.models.local_upload import LocalUpload
from app.models.notification import Notification
from app.models.quote import Quote, QuoteStatus
from app.models.shift import Shift, ShiftQuote, ShiftQuoteStatus, ShiftStatus
from app.models.support_ticket import SupportTicket
from app.models.user import (
    EmailVerification,
    PasswordReset,
    RefreshToken,
    User,
    UserProfile,
    UserStatus,
)
from app.models.vehicle import Vehicle
from app.services import s3
from app.services.audit import log_audit

log = structlog.get_logger()

# Work that is already under way and has money in escrow. Deleting mid-job would
# strand the counterparty's funds, so these block deletion until the job finishes
# or is cancelled. Everything else (open listings, pending quotes) is withdrawn
# automatically below.
_LIVE_JOB_STATUSES = (
    JobStatus.PAYMENT_SECURED,
    JobStatus.IN_TRANSIT,
    JobStatus.DELIVERY_SUBMITTED,
    JobStatus.DISPUTED,
)

UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "static" / "uploads"


def check_deletable(db: Session, user: User) -> None:
    """Raise 409 if the account has live work that must finish first."""
    live_jobs = (
        db.query(Job)
        .filter(
            Job.status.in_(_LIVE_JOB_STATUSES),
            (Job.haulier_id == user.id) | (Job.selected_supplier_id == user.id),
        )
        .count()
    )
    live_shifts = (
        db.query(Shift)
        .filter(
            Shift.status == ShiftStatus.IN_PROGRESS,
            (Shift.haulier_id == user.id) | (Shift.selected_driver_id == user.id),
        )
        .count()
    )
    if live_jobs or live_shifts:
        raise HTTPException(
            status_code=409,
            detail=(
                "You still have a job or shift in progress. Please complete or "
                "cancel it before deleting your account."
            ),
        )


def _remove_file(url: str | None) -> None:
    """Best-effort removal of a stored file, whether it lives locally or in Azure."""
    if not url:
        return
    try:
        if url.startswith("http") and "/uploads/" not in url:
            # Azure blob: <account>/<container>/<blob path>
            parts = url.split("/", 4)
            if len(parts) >= 5:
                s3.delete_object(parts[3], parts[4].split("?")[0])
            return
        key = url.split("/uploads/", 1)[-1].split("?")[0] if "/uploads/" in url else url
        path = (UPLOAD_ROOT / key).resolve()
        if path.is_file() and UPLOAD_ROOT.resolve() in path.parents:
            path.unlink()
    except Exception as exc:  # never let a missing file block deletion
        log.warning("account_deletion_file_remove_failed", url=url, error=str(exc))


def _detach_stripe(user: User) -> None:
    """Best-effort teardown of the user's Stripe objects."""
    from app.services.stripe_connect import _stripe

    try:
        stripe = _stripe()
    except Exception as exc:
        log.warning("account_deletion_stripe_unavailable", error=str(exc))
        return

    if user.stripe_account_id:
        try:
            stripe.Account.delete(user.stripe_account_id)
        except Exception as exc:
            # Common and expected when a payout is still settling — the account is
            # left in place and our reference to it is dropped either way.
            log.warning(
                "account_deletion_stripe_account_delete_failed",
                stripe_account_id=user.stripe_account_id,
                error=str(exc),
            )
    if user.stripe_customer_id:
        try:
            stripe.Customer.delete(user.stripe_customer_id)
        except Exception as exc:
            log.warning(
                "account_deletion_stripe_customer_delete_failed",
                stripe_customer_id=user.stripe_customer_id,
                error=str(exc),
            )


def delete_account(
    db: Session,
    user: User,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    """Permanently delete `user`. Irreversible — there is no restore path."""
    check_deletable(db, user)

    user_id = user.id
    now = datetime.utcnow()

    # ── 1. Withdraw the user from anything still open ─────────────────────────
    db.query(Quote).filter(
        Quote.supplier_id == user_id, Quote.status == QuoteStatus.ACTIVE
    ).update({Quote.status: QuoteStatus.WITHDRAWN}, synchronize_session=False)

    db.query(ShiftQuote).filter(
        ShiftQuote.driver_id == user_id,
        ShiftQuote.status == ShiftQuoteStatus.PENDING,
    ).update({ShiftQuote.status: ShiftQuoteStatus.WITHDRAWN}, synchronize_session=False)

    db.query(Job).filter(
        Job.haulier_id == user_id, Job.status == JobStatus.OPEN
    ).update({Job.status: JobStatus.CANCELLED}, synchronize_session=False)

    db.query(Shift).filter(
        Shift.haulier_id == user_id, Shift.status == ShiftStatus.OPEN
    ).update({Shift.status: ShiftStatus.CANCELLED}, synchronize_session=False)

    # ── 2. Erase uploaded files, then the rows that point at them ─────────────
    for doc in db.query(Document).filter(Document.user_id == user_id).all():
        _remove_file(doc.file_url)
    for upload in db.query(LocalUpload).filter(LocalUpload.user_id == user_id).all():
        try:
            local_path = Path(upload.local_path)
            if local_path.is_file():
                local_path.unlink()
        except Exception as exc:
            log.warning(
                "account_deletion_upload_remove_failed",
                storage_key=upload.storage_key,
                error=str(exc),
            )
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile:
        _remove_file(profile.photo_url)

    db.query(Document).filter(Document.user_id == user_id).delete(synchronize_session=False)
    db.query(Document).filter(Document.reviewed_by == user_id).update(
        {Document.reviewed_by: None}, synchronize_session=False
    )
    db.query(LocalUpload).filter(LocalUpload.user_id == user_id).delete(synchronize_session=False)

    # ── 3. Erase the rest of the personal data ────────────────────────────────
    for model, column in (
        (Vehicle, Vehicle.user_id),
        (Notification, Notification.user_id),
        (AvailabilitySlot, AvailabilitySlot.driver_id),
        (AvailabilityBlock, AvailabilityBlock.driver_id),
        (UserDevice, UserDevice.user_id),
        (RefreshToken, RefreshToken.user_id),
        (EmailVerification, EmailVerification.user_id),
        (PasswordReset, PasswordReset.user_id),
        (UserProfile, UserProfile.user_id),
    ):
        db.query(model).filter(column == user_id).delete(synchronize_session=False)

    # Support tickets are kept for our own audit trail but stripped of identity.
    db.query(SupportTicket).filter(SupportTicket.user_id == user_id).update(
        {
            SupportTicket.user_id: None,
            SupportTicket.requester_name: "Deleted user",
            SupportTicket.requester_email: "deleted@flexishift.invalid",
        },
        synchronize_session=False,
    )

    _detach_stripe(user)

    # ── 4. Anonymise the tombstone row ────────────────────────────────────────
    user.full_name = "Deleted user"
    user.email = f"deleted-{user_id}@deleted.invalid"
    user.phone = ""
    # Not a valid bcrypt hash, so no password can ever verify against it.
    user.password_hash = f"!deleted-{uuid4().hex}"
    user.status = UserStatus.SUSPENDED  # get_current_user rejects anything but ACTIVE
    user.deleted_at = now
    user.verified = False
    user.admin_approved = False
    user.profile_complete = False
    user.push_token = None
    user.location_lat = None
    user.location_lng = None
    user.bank_account_id = None
    user.stripe_account_id = None
    user.stripe_customer_id = None
    user.stripe_onboarding_complete = False

    db.commit()

    log_audit(
        db,
        action="ACCOUNT_DELETED",
        user_id=user_id,
        entity_type="user",
        entity_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        endpoint="/profile",
        method="DELETE",
        extra={"deleted_at": now.isoformat()},
    )
