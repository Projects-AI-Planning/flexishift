import hmac
import hashlib
import razorpay
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.config import settings


def _client() -> razorpay.Client:
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_payment_order(db: Session, job_id: str, haulier_id: str) -> dict:
    job = db.query(Job).filter(Job.id == job_id, Job.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.haulier_id != haulier_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if job.status != JobStatus.BOOKED:
        raise HTTPException(status_code=422, detail="Job must be in BOOKED state to initiate payment")

    existing = db.query(Payment).filter(Payment.job_id == job_id).first()
    if existing and existing.status == PaymentStatus.ESCROWED:
        raise HTTPException(status_code=409, detail="Payment already escrowed")

    selected_quote = next(
        (q for q in job.quotes if q.supplier_id == job.selected_supplier_id), None
    )
    if not selected_quote:
        raise HTTPException(status_code=422, detail="No selected quote found")

    amount_paise = int(float(selected_quote.price) * 100)

    client = _client()
    order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": job.job_ref,
        "payment_capture": 1,
    })

    if existing:
        existing.gateway_order_id = order["id"]
        existing.amount = selected_quote.price
        existing.status = PaymentStatus.PENDING
        db.commit()
        payment = existing
    else:
        payment = Payment(
            job_id=job_id,
            gateway_order_id=order["id"],
            amount=selected_quote.price,
            currency="INR",
            status=PaymentStatus.PENDING,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

    job.status = JobStatus.PAYMENT_PENDING
    db.commit()

    return {
        "payment_id": payment.id,
        "gateway_order_id": order["id"],
        "amount": float(selected_quote.price),
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID,
    }


def verify_payment(db: Session, job_id: str, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> Payment:
    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    payment.gateway_payment_id = razorpay_payment_id
    payment.status = PaymentStatus.ESCROWED
    payment.escrowed_at = datetime.now(timezone.utc)

    job = db.query(Job).filter(Job.id == job_id).first()
    job.status = JobStatus.PAYMENT_SECURED

    db.commit()
    db.refresh(payment)
    return payment


def release_payment(db: Session, job_id: str) -> Payment:
    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment or payment.status != PaymentStatus.ESCROWED:
        raise HTTPException(status_code=422, detail="Payment not in escrowed state")

    supplier = db.query(Job).filter(Job.id == job_id).first().supplier
    if not supplier or not supplier.bank_account_id:
        raise HTTPException(status_code=422, detail="Supplier has no bank account registered")

    client = _client()
    amount_paise = int(float(payment.amount) * 100)
    payout = client.payout.create({
        "account_number": settings.RAZORPAY_KEY_ID,
        "fund_account_id": supplier.bank_account_id,
        "amount": amount_paise,
        "currency": "INR",
        "mode": "IMPS",
        "purpose": "payout",
        "queue_if_low_balance": True,
        "reference_id": payment.job_id,
        "narration": f"FreightFlex job {payment.job_id}",
    })

    payment.gateway_payout_id = payout["id"]
    payment.status = PaymentStatus.RELEASED
    payment.released_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(payment)
    return payment


def verify_razorpay_webhook_signature(body: bytes, signature: str) -> bool:
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
