import json
import stripe
import structlog
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.payment import Payment, PaymentStatus, PaymentEvent

log = structlog.get_logger()

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/stripe", status_code=200)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if settings.STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                body, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except stripe.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    else:
        event = json.loads(body)

    event_id = event.get("id", "unknown")
    event_type = event.get("type", "")

    # Idempotency — skip already-processed events
    if db.query(PaymentEvent).filter(PaymentEvent.gateway_event_id == event_id).first():
        return {"received": True}

    db.add(PaymentEvent(
        gateway_event_id=event_id,
        event_type=event_type,
        raw_payload=json.dumps(event),
    ))

    try:
        intent = event.get("data", {}).get("object", {})
        intent_id = intent.get("id")

        if event_type == "payment_intent.amount_capturable_updated" and intent_id:
            # Card authorised — funds held, awaiting capture
            payment = db.query(Payment).filter(
                Payment.gateway_order_id == intent_id
            ).first()
            if payment and payment.status == PaymentStatus.PENDING:
                payment.status = PaymentStatus.ESCROWED
                payment.gateway_payment_id = intent_id
                payment.escrowed_at = datetime.utcnow()

                from app.models.job import Job, JobStatus
                job = db.query(Job).filter(Job.id == payment.job_id).first()
                if job:
                    job.status = JobStatus.PAYMENT_SECURED

        elif event_type == "payment_intent.succeeded" and intent_id:
            # Funds captured and transferred
            from sqlalchemy import or_
            payment = db.query(Payment).filter(
                or_(Payment.gateway_payment_id == intent_id,
                    Payment.gateway_order_id == intent_id)
            ).first()
            if payment and payment.status == PaymentStatus.ESCROWED:
                payment.status = PaymentStatus.RELEASED
                payment.released_at = datetime.utcnow()

                from app.models.job import Job, JobStatus
                job = db.query(Job).filter(Job.id == payment.job_id).first()
                if job:
                    job.status = JobStatus.COMPLETED

        elif event_type == "payment_intent.payment_failed" and intent_id:
            payment = db.query(Payment).filter(
                Payment.gateway_order_id == intent_id
            ).first()
            if payment:
                payment.status = PaymentStatus.FAILED
                payment.failed_at = datetime.utcnow()

        elif event_type == "payment_intent.canceled" and intent_id:
            from sqlalchemy import or_
            payment = db.query(Payment).filter(
                or_(Payment.gateway_payment_id == intent_id,
                    Payment.gateway_order_id == intent_id)
            ).first()
            if payment and payment.status not in (PaymentStatus.RELEASED, PaymentStatus.REFUNDED):
                payment.status = PaymentStatus.REFUNDED
                payment.refunded_at = datetime.utcnow()

                from app.models.job import Job, JobStatus
                job = db.query(Job).filter(Job.id == payment.job_id).first()
                if job and job.status not in (JobStatus.COMPLETED, JobStatus.CANCELLED):
                    job.status = JobStatus.CANCELLED

    except Exception as exc:
        log.error("stripe_webhook_error", event_id=event_id, event_type=event_type, error=str(exc))

    db.commit()
    return {"received": True}
