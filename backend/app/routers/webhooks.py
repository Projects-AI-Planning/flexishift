import structlog
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.payment import Payment, PaymentStatus, PaymentEvent
from app.services.payments import verify_razorpay_webhook_signature

log = structlog.get_logger()

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/razorpay", status_code=200)
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not verify_razorpay_webhook_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = await request.json()
    event_id = payload.get("id") or payload.get("event", "unknown")
    event_type = payload.get("event", "")

    if db.query(PaymentEvent).filter(PaymentEvent.gateway_event_id == event_id).first():
        return {"received": True}

    event = PaymentEvent(gateway_event_id=event_id, event_type=event_type)
    db.add(event)

    try:
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = entity.get("order_id")

        if event_type == "payment.captured" and order_id:
            payment = db.query(Payment).filter(Payment.gateway_order_id == order_id).first()
            if payment and payment.status == PaymentStatus.PENDING:
                payment.status = PaymentStatus.ESCROWED
                payment.gateway_payment_id = entity.get("id")
                from datetime import datetime, timezone
                payment.escrowed_at = datetime.now(timezone.utc)

                from app.models.job import Job, JobStatus
                job = db.query(Job).filter(Job.id == payment.job_id).first()
                if job:
                    job.status = JobStatus.PAYMENT_SECURED

        elif event_type == "payment.failed" and order_id:
            payment = db.query(Payment).filter(Payment.gateway_order_id == order_id).first()
            if payment:
                payment.status = PaymentStatus.FAILED

    except Exception as exc:
        log.error("webhook_processing_error", event=event_type, error=str(exc))

    db.commit()
    return {"received": True}
