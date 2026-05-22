import stripe
import structlog
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.config import settings

log = structlog.get_logger()

stripe.api_key = settings.STRIPE_SECRET_KEY

_STRIPE_CANCEL_REASONS = {"duplicate", "fraudulent", "requested_by_customer", "abandoned"}
_STRIPE_REFUND_REASONS = {"duplicate", "fraudulent", "requested_by_customer"}


def _stripe_client():
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def _stripe_error_msg(e: stripe.StripeError) -> str:
    return getattr(e, "user_message", None) or str(e)


def create_payment_order(db: Session, job_id: str, haulier_id: str) -> dict:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.haulier_id != haulier_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if job.status not in (JobStatus.BOOKED, JobStatus.PAYMENT_PENDING):
        raise HTTPException(status_code=422, detail="Job must be in BOOKED state to initiate payment")

    existing = db.query(Payment).filter(Payment.job_id == job_id).first()
    if existing and existing.status == PaymentStatus.ESCROWED:
        raise HTTPException(status_code=409, detail="Payment already escrowed")

    selected_quote = next(
        (q for q in job.quotes if q.supplier_id == job.selected_supplier_id), None
    )
    if not selected_quote:
        raise HTTPException(status_code=422, detail="No selected quote found")

    amount = float(selected_quote.price)
    amount_minor = int(amount * 100)

    client = _stripe_client()
    try:
        intent = client.PaymentIntent.create(
            amount=amount_minor,
            currency="gbp",
            capture_method="manual",
            metadata={
                "job_id": job_id,
                "job_ref": job.job_ref,
                "haulier_id": haulier_id,
                "driver_id": str(job.selected_supplier_id or ""),
            },
            description=f"FreightFlex job {job.job_ref}",
            idempotency_key=f"pay-{job_id}",
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Payment gateway error: {_stripe_error_msg(e)}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach payment provider: {str(e)}")

    if existing:
        existing.gateway_order_id = intent["id"]
        existing.amount = selected_quote.price
        existing.currency = "GBP"
        existing.status = PaymentStatus.PENDING
        db.commit()
        payment = existing
    else:
        payment = Payment(
            job_id=job_id,
            gateway_order_id=intent["id"],
            amount=selected_quote.price,
            currency="GBP",
            status=PaymentStatus.PENDING,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

    job.status = JobStatus.PAYMENT_PENDING
    db.commit()

    return {
        "payment_id": payment.id,
        "gateway_order_id": intent["id"],
        "client_secret": intent["client_secret"],
        "amount": amount,
        "currency": "GBP",
        "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
    }


def verify_payment(db: Session, job_id: str, payment_intent_id: str, **_kwargs) -> Payment:
    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    client = _stripe_client()
    try:
        intent = client.PaymentIntent.retrieve(payment_intent_id)
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=_stripe_error_msg(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach payment provider: {str(e)}")

    allowed = {"requires_capture", "succeeded"}
    if intent["status"] not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Payment not authorised yet (status: {intent['status']}). "
                   "Complete card confirmation before verifying.",
        )

    # Guard against amount tampering — intent pence must match the stored quote price
    intent_amount = intent.get("amount", 0)
    expected_amount = int(float(payment.amount) * 100)
    if intent_amount != expected_amount:
        log.error("payment_amount_mismatch",
                  job_id=job_id, expected=expected_amount, got=intent_amount)
        raise HTTPException(status_code=422,
                            detail="Payment amount mismatch — contact support")

    payment.gateway_payment_id = payment_intent_id
    payment.status = PaymentStatus.ESCROWED
    payment.escrowed_at = datetime.utcnow()

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = JobStatus.PAYMENT_SECURED

    db.commit()
    db.refresh(payment)
    return payment


def get_payment_details(db: Session, job_id: str, user_id: str) -> dict:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.haulier_id != user_id and job.selected_supplier_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found for this job")

    # Live intent status is best-effort; DB status is authoritative
    intent_status = None
    if payment.gateway_payment_id or payment.gateway_order_id:
        client = _stripe_client()
        try:
            intent_id = payment.gateway_payment_id or payment.gateway_order_id
            intent = client.PaymentIntent.retrieve(intent_id)
            intent_status = intent["status"]
        except Exception:
            pass

    return {
        "paymentId": payment.id,
        "jobId": job_id,
        "jobRef": job.job_ref,
        "pickupAddress": job.pickup_address,
        "dropAddress": job.drop_address,
        "amount": float(payment.amount),
        "currency": payment.currency,
        "status": payment.status.value,
        "stripeIntentId": payment.gateway_payment_id or payment.gateway_order_id,
        "stripeStatus": intent_status,
        "escrowedAt": payment.escrowed_at.isoformat() if payment.escrowed_at else None,
        "releasedAt": payment.released_at.isoformat() if payment.released_at else None,
        "failedAt": payment.failed_at.isoformat() if payment.failed_at else None,
        "refundedAt": payment.refunded_at.isoformat() if payment.refunded_at else None,
        "publishableKey": settings.STRIPE_PUBLISHABLE_KEY,
    }


def release_payment(db: Session, job_id: str) -> Payment:
    from app.models.user import User
    from app.services.stripe_connect import transfer_to_driver

    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment or payment.status != PaymentStatus.ESCROWED:
        raise HTTPException(status_code=422, detail="Payment not in escrowed state")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    client = _stripe_client()
    intent_id = payment.gateway_payment_id or payment.gateway_order_id
    try:
        client.PaymentIntent.capture(intent_id)
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=_stripe_error_msg(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach payment provider: {str(e)}")

    # Transfer captured funds to the driver's Stripe Connect account
    transfer_id = None
    if job.selected_supplier_id:
        driver = db.query(User).filter(User.id == job.selected_supplier_id).first()
        if driver and driver.stripe_account_id and driver.stripe_onboarding_complete:
            amount_pence = int(float(payment.amount) * 100)
            transfer_id = transfer_to_driver(
                stripe_account_id=driver.stripe_account_id,
                amount_pence=amount_pence,
                currency=payment.currency,
                payment_intent_id=intent_id,
                job_ref=job.job_ref,
            )
        else:
            log.warning(
                "release_payment_no_stripe_account",
                job_id=job_id,
                driver_id=str(job.selected_supplier_id),
                has_account=bool(driver and driver.stripe_account_id),
            )

    payment.status = PaymentStatus.RELEASED
    payment.released_at = datetime.utcnow()
    if transfer_id:
        payment.gateway_payout_id = transfer_id

    job.status = JobStatus.COMPLETED

    db.commit()
    db.refresh(payment)
    return payment


def refund_payment(
    db: Session,
    job_id: str,
    requester_id: str,
    amount: float | None = None,
    reason: str | None = None,
    is_admin: bool = False,
) -> Payment:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not is_admin and job.haulier_id != requester_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status not in (PaymentStatus.ESCROWED, PaymentStatus.PENDING, PaymentStatus.RELEASED):
        raise HTTPException(status_code=422, detail="Payment cannot be refunded in current state")

    client = _stripe_client()
    intent_id = payment.gateway_payment_id or payment.gateway_order_id

    if intent_id:
        cancel_reason = reason if reason in _STRIPE_CANCEL_REASONS else "requested_by_customer"
        refund_reason = reason if reason in _STRIPE_REFUND_REASONS else "requested_by_customer"
        try:
            if payment.status == PaymentStatus.RELEASED:
                # Already captured — issue a Stripe Refund (supports partial amounts)
                refund_params: dict = {
                    "payment_intent": intent_id,
                    "reason": refund_reason,
                }
                if amount is not None:
                    refund_params["amount"] = int(amount * 100)
                client.Refund.create(**refund_params)
            else:
                # ESCROWED or PENDING — cancel the uncaptured authorisation
                client.PaymentIntent.cancel(intent_id, cancellation_reason=cancel_reason)
        except stripe.StripeError as e:
            raise HTTPException(status_code=400,
                                detail=f"Stripe refund error: {_stripe_error_msg(e)}")
        except Exception as e:
            log.error("refund_payment_error", job_id=job_id, error=str(e))
            raise HTTPException(status_code=502,
                                detail=f"Could not process refund: {str(e)}")

    payment.status = PaymentStatus.REFUNDED
    payment.refunded_at = datetime.utcnow()
    job.status = JobStatus.CANCELLED
    job.deleted_at = datetime.utcnow()
    db.commit()
    db.refresh(payment)
    return payment
