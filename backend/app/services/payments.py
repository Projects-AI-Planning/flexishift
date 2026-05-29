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
    from app.models.user import User

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

    driver_amount = float(selected_quote.price)
    platform_fee = round(driver_amount * 0.125, 2)
    total_amount = round(driver_amount + platform_fee, 2)
    amount_minor = int(round(total_amount * 100))
    driver_amount_minor = int(round(driver_amount * 100))

    haulier = db.query(User).filter(User.id == haulier_id).first()
    currency = (
        (haulier.currency if haulier else None)
        or selected_quote.currency
        or settings.PAYMENT_CURRENCY
    ).upper()

    # Look up driver's Stripe Connect account to use destination charge model.
    # Embedding transfer_data at creation means funds flow to the driver automatically
    # on capture — no separate Transfer needed, no available-balance race condition.
    driver_stripe_account: str | None = None
    if job.selected_supplier_id:
        driver = db.query(User).filter(User.id == job.selected_supplier_id).first()
        if driver and driver.stripe_account_id and driver.stripe_onboarding_complete:
            driver_stripe_account = driver.stripe_account_id

    client = _stripe_client()

    # If there's an existing PENDING payment with a Stripe intent, check if we can reuse it.
    # If the intent is already confirmed (requires_capture), calling confirmCardPayment again
    # would produce a "processing error" — cancel it and create a fresh intent instead.
    if existing and existing.gateway_order_id:
        try:
            prev_intent = client.PaymentIntent.retrieve(existing.gateway_order_id)
            if prev_intent["status"] == "requires_payment_method":
                # Reuse — intent is still awaiting card details
                return {
                    "payment_id": existing.id,
                    "gateway_order_id": prev_intent["id"],
                    "client_secret": prev_intent["client_secret"],
                    "amount": total_amount,
                    "driverAmount": driver_amount,
                    "platformFee": platform_fee,
                    "currency": existing.currency,
                    "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
                }
            # Intent is in a non-confirmable state; cancel it so we can create a fresh one
            if prev_intent["status"] not in ("succeeded", "canceled"):
                try:
                    client.PaymentIntent.cancel(prev_intent["id"])
                except stripe.StripeError:
                    pass
        except stripe.StripeError:
            pass

    intent_params: dict = {
        "amount": amount_minor,
        "currency": currency.lower(),
        "capture_method": "manual",
        "payment_method_types": ["card"],
        "metadata": {
            "job_id": job_id,
            "job_ref": job.job_ref,
            "haulier_id": haulier_id,
            "driver_id": str(job.selected_supplier_id or ""),
        },
        "description": f"FlexiShift job {job.job_ref}",
    }
    if driver_stripe_account:
        # Destination charge: on capture Stripe moves driver_amount to the driver;
        # the platform retains the platform_fee portion.
        intent_params["transfer_data"] = {
            "destination": driver_stripe_account,
            "amount": driver_amount_minor,
        }

    try:
        intent = client.PaymentIntent.create(**intent_params)
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Payment gateway error: {_stripe_error_msg(e)}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach payment provider: {str(e)}")

    if existing:
        existing.gateway_order_id = intent["id"]
        existing.amount = total_amount
        existing.driver_amount = driver_amount
        existing.platform_fee = platform_fee
        existing.currency = currency
        existing.status = PaymentStatus.PENDING
        db.commit()
        payment = existing
    else:
        payment = Payment(
            job_id=job_id,
            gateway_order_id=intent["id"],
            amount=total_amount,
            driver_amount=driver_amount,
            platform_fee=platform_fee,
            currency=currency,
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
        "amount": total_amount,
        "driverAmount": driver_amount,
        "platformFee": platform_fee,
        "currency": currency,
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
    intent_amount = intent["amount"]
    expected_amount = int(round(float(payment.amount) * 100))
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

    stops_raw = job.stops or []
    stops = [
        {
            "order": s.get("order") if isinstance(s, dict) else None,
            "address": s.get("address") if isinstance(s, dict) else None,
            "litres": s.get("litres") or s.get("totalLitres") if isinstance(s, dict) else None,
        }
        for s in stops_raw
    ] if stops_raw else []

    _total = float(payment.amount)
    _driver = float(payment.driver_amount) if payment.driver_amount else round(_total / 1.125, 2)
    _fee = float(payment.platform_fee) if payment.platform_fee else round(_total - _driver, 2)

    return {
        "paymentId": payment.id,
        "jobId": job_id,
        "jobRef": job.job_ref,
        "loadCode": job.load_code,
        "pickupAddress": job.pickup_address,
        "dropAddress": job.drop_address,
        "stops": stops,
        "goodsType": job.goods_type,
        "jobDate": job.job_date.isoformat() if job.job_date else None,
        "timeSlot": job.time_slot.value if job.time_slot else None,
        "compartmentCount": job.compartments,
        "totalLitres": float(job.total_litres) if getattr(job, "total_litres", None) is not None else None,
        "specialInstructions": job.special_instructions,
        "distanceKm": float(job.distance_km) if getattr(job, "distance_km", None) is not None else None,
        "amount": _total,       # total charged to haulier
        "driverAmount": _driver,  # driver's portion (what they earn)
        "platformFee": _fee,
        "totalAmount": _total,
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
        captured_intent = client.PaymentIntent.capture(intent_id)
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=_stripe_error_msg(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach payment provider: {str(e)}")

    # Resolve the driver's portion — use stored value; fall back to reverse-calc for legacy rows
    stored_driver_amount = float(payment.driver_amount) if payment.driver_amount else None
    driver_payout = stored_driver_amount or round(float(payment.amount) / 1.125, 2)
    driver_payout_minor = int(round(driver_payout * 100))

    # Check if this was a destination charge (transfer_data set at intent creation).
    # Use dict-style .get() which is reliable across Stripe SDK versions.
    transfer_id = None
    try:
        td = captured_intent.get("transfer_data") if callable(getattr(captured_intent, "get", None)) \
            else getattr(captured_intent, "transfer_data", None)
        has_destination = bool(td and td.get("destination") if isinstance(td, dict) else td)
    except Exception:
        has_destination = False

    if has_destination:
        # Destination charge: Stripe auto-transferred driver_amount at capture.
        # transfer_data.amount was set to driver_amount_minor at intent creation,
        # so exactly the right amount already went to the driver.
        transfer_id = (captured_intent.get("transfer") if callable(getattr(captured_intent, "get", None))
                       else getattr(captured_intent, "transfer", None))
        log.info("release_payment_destination_charge", job_id=job_id, transfer=transfer_id,
                 driver_payout=driver_payout)
    elif job.selected_supplier_id:
        driver = db.query(User).filter(User.id == job.selected_supplier_id).first()
        if driver and driver.stripe_account_id and driver.stripe_onboarding_complete:
            # Transfer only the driver's quoted amount — platform retains platform_fee
            transfer_id = transfer_to_driver(
                stripe_account_id=driver.stripe_account_id,
                amount_pence=driver_payout_minor,
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
        payment.gateway_payout_id = str(transfer_id)

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
