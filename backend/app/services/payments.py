import stripe
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def _stripe_client():
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


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
    # Stripe uses smallest currency unit (pence/cents)
    amount_minor = int(amount * 100)

    client = _stripe_client()
    intent = client.PaymentIntent.create(
        amount=amount_minor,
        currency="gbp",
        capture_method="manual",          # escrow: authorise now, capture later
        metadata={
            "job_id": job_id,
            "job_ref": job.job_ref,
            "haulier_id": haulier_id,
            "driver_id": str(job.selected_supplier_id or ""),
        },
        description=f"FreightFlex job {job.job_ref}",
    )

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
    """
    Called after the haulier's frontend confirms the PaymentIntent.
    Retrieves the intent from Stripe and marks it as ESCROWED (requires_capture = authorised).
    """
    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    client = _stripe_client()
    try:
        intent = client.PaymentIntent.retrieve(payment_intent_id)
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    allowed = {"requires_capture", "succeeded"}
    if intent["status"] not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Payment not authorised yet (status: {intent['status']}). "
                   "Complete card confirmation before verifying.",
        )

    payment.gateway_payment_id = payment_intent_id
    payment.status = PaymentStatus.ESCROWED
    payment.escrowed_at = datetime.utcnow()

    job = db.query(Job).filter(Job.id == job_id).first()
    job.status = JobStatus.PAYMENT_SECURED

    db.commit()
    db.refresh(payment)
    return payment


def get_payment_details(db: Session, job_id: str, user_id: str) -> dict:
    """Returns Stripe payment details for both haulier and driver."""
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Allow job owner or selected driver
    if job.haulier_id != user_id and job.selected_supplier_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found for this job")

    # Fetch live intent from Stripe for real-time status
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
        "publishableKey": settings.STRIPE_PUBLISHABLE_KEY,
    }


def release_payment(db: Session, job_id: str) -> Payment:
    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment or payment.status != PaymentStatus.ESCROWED:
        raise HTTPException(status_code=422, detail="Payment not in escrowed state")

    client = _stripe_client()
    intent_id = payment.gateway_payment_id or payment.gateway_order_id
    try:
        client.PaymentIntent.capture(intent_id)
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    payment.status = PaymentStatus.RELEASED
    payment.released_at = datetime.utcnow()
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
    if payment.status not in (PaymentStatus.ESCROWED, PaymentStatus.PENDING):
        raise HTTPException(status_code=422, detail="Payment cannot be refunded in current state")

    client = _stripe_client()
    intent_id = payment.gateway_payment_id or payment.gateway_order_id
    if intent_id:
        try:
            if payment.status == PaymentStatus.ESCROWED:
                # Cancel the uncaptured PaymentIntent (reverses authorisation)
                client.PaymentIntent.cancel(intent_id)
            # If PENDING (not yet captured), just cancel
        except Exception:
            pass

    payment.status = PaymentStatus.REFUNDED
    job.status = JobStatus.CANCELLED
    job.deleted_at = datetime.utcnow()
    db.commit()
    db.refresh(payment)
    return payment
