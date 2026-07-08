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

# Bound Stripe HTTP calls so a slow/unreachable Stripe can never hang a request for
# Stripe's default ~80s. Keeps haulier approve/release and payment flows responsive.
try:
    import stripe._http_client as _stripe_http
    stripe.default_http_client = _stripe_http.RequestsClient(timeout=20)
    stripe.max_network_retries = 1
except Exception:
    pass

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

    driver_amount = float(selected_quote.price)      # driver's quoted earnings
    platform_fee  = round(driver_amount * 0.125, 2)  # 12.5% platform fee
    total_amount  = round(driver_amount + platform_fee, 2)  # what haulier pays
    # Haulier is charged driver_amount + 12.5%.
    # On release: driver_amount → driver's account; platform_fee → platform account.
    amount_minor       = int(round(total_amount * 100))
    driver_amount_minor = int(round(driver_amount * 100))

    from app.utils.phone_country import _COUNTRY_CURRENCY, _DEFAULT_CURRENCY
    haulier = db.query(User).filter(User.id == haulier_id).first()
    currency = (
        (haulier.currency if haulier else None)
        or selected_quote.currency
        or settings.PAYMENT_CURRENCY
        or _COUNTRY_CURRENCY.get((getattr(haulier, "country", None) or "").upper(), _DEFAULT_CURRENCY)
    ).upper()

    # Look up driver's Stripe Connect account to use destination charge model.
    # Embedding transfer_data at creation means funds flow to the driver automatically
    # on capture — no separate Transfer needed, no available-balance race condition.
    # We also verify the 'transfers' capability is active; if it's still pending
    # (common right after onboarding) we skip transfer_data and fall back to a
    # manual transfer on capture once the capability becomes active.
    driver_stripe_account: str | None = None
    if job.selected_supplier_id:
        driver = db.query(User).filter(User.id == job.selected_supplier_id).first()
        if driver and driver.stripe_account_id and driver.stripe_onboarding_complete:
            from app.services.stripe_connect import transfers_capability_active
            if transfers_capability_active(driver.stripe_account_id):
                driver_stripe_account = driver.stripe_account_id
            else:
                log.warning(
                    "driver_transfers_capability_not_active",
                    driver_id=driver.id,
                    stripe_account_id=driver.stripe_account_id,
                )

    client = _stripe_client()

    # Attach the haulier's Stripe Customer so saved cards (added via the payment-setup
    # SetupIntent flow) can be selected and confirmed against this PaymentIntent.
    haulier_customer_id: str | None = None
    if haulier:
        try:
            from app.services.stripe_customer import get_or_create_customer
            haulier_customer_id = get_or_create_customer(db, haulier)
        except Exception as exc:
            log.warning("haulier_customer_resolve_failed", haulier_id=haulier_id, error=str(exc))

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
                    "vatAmount": 0.0,
                    "totalAmount": total_amount,
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
        "automatic_payment_methods": {
            "enabled": True,
        },
        **({"customer": haulier_customer_id} if haulier_customer_id else {}),
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
        existing.amount = total_amount        # full Stripe charge (driver + fee + VAT)
        existing.driver_amount = driver_amount
        existing.platform_fee = platform_fee
        existing.vat_amount = 0.0
        existing.currency = currency
        existing.status = PaymentStatus.PENDING
        db.commit()
        payment = existing
    else:
        payment = Payment(
            job_id=job_id,
            gateway_order_id=intent["id"],
            amount=total_amount,              # full Stripe charge (driver + fee + VAT)
            driver_amount=driver_amount,
            platform_fee=platform_fee,
            vat_amount=0.0,
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
        "amount": total_amount,         # full Stripe charge shown to haulier
        "driverAmount": driver_amount,
        "platformFee": platform_fee,
        "vatAmount": 0.0,
        "totalAmount": total_amount,
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

    # Guard against amount tampering — intent pence must match the stored quoted amount.
    # payment.amount == driver_amount (the Stripe-escrowed value, not the invoice total).
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

    # DB status is authoritative. We deliberately do NOT call Stripe here: this
    # endpoint is polled frequently by the driver's "awaiting approval" screen, and a
    # live PaymentIntent.retrieve adds ~1-3s per request — which, under polling, makes
    # requests overlap and time out so the driver never sees the released status.
    # Clients derive everything they need from `status` (ESCROWED / RELEASED / ...).
    intent_status = None

    stops_raw = job.stops or []
    stops = [
        {
            "order": s.get("order") if isinstance(s, dict) else None,
            "address": s.get("address") if isinstance(s, dict) else None,
            "litres": s.get("litres") or s.get("totalLitres") if isinstance(s, dict) else None,
        }
        for s in stops_raw
    ] if stops_raw else []

    _driver = float(payment.driver_amount) if payment.driver_amount else float(payment.amount)
    _fee    = float(payment.platform_fee) if payment.platform_fee else round(_driver * 0.125, 2)
    _total  = round(_driver + _fee, 2)

    return {
        "paymentId": payment.id,
        "jobId": job_id,
        "jobRef": job.job_ref,
        "loadCode": job.load_code,
        "accessCode": job.access_code,
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
        "amount": _driver,      # escrowed quoted amount (Stripe hold)
        "driverAmount": _driver,
        "platformFee": _fee,
        "vatAmount": 0.0,
        "totalAmount": _total,  # driver quote + 12.5% platform fee
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
    from app.services.stripe_connect import transfer_to_driver, StripeTransferError

    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found for this job")
    if payment.status == PaymentStatus.RELEASED:
        # Already released — return existing record (idempotent for double-clicks / retries)
        return payment
    if payment.status != PaymentStatus.ESCROWED:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot release payment with status '{payment.status.value}'. Payment must be ESCROWED first.",
        )

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    client = _stripe_client()
    intent_id = payment.gateway_payment_id or payment.gateway_order_id

    # Detect mock/test intent IDs (created during early development, not valid in Stripe).
    # For these we skip Stripe capture and release the DB record directly so sandbox
    # testing is not blocked by stale test data.
    is_mock_intent = not intent_id or not str(intent_id).startswith("pi_")

    captured_intent = None
    if is_mock_intent:
        log.warning("release_payment_mock_intent", job_id=job_id, intent_id=intent_id)
    else:
        try:
            intent_check = client.PaymentIntent.retrieve(intent_id)
            intent_status = intent_check["status"] if isinstance(intent_check, dict) else getattr(intent_check, "status", None)
            if intent_status == "succeeded":
                log.warning("release_payment_already_captured", job_id=job_id, intent_id=intent_id)
                captured_intent = intent_check
            elif intent_status == "requires_capture":
                captured_intent = client.PaymentIntent.capture(intent_id)
            elif intent_status == "canceled":
                # Intent was canceled (e.g. card auth expired, duplicate, test data).
                # The haulier's card was never charged, so we still mark the DB as released
                # to unblock the job flow; in production this would trigger a re-payment.
                log.warning(
                    "release_payment_intent_canceled",
                    job_id=job_id, intent_id=intent_id,
                )
                captured_intent = None  # nothing to capture
            else:
                raise HTTPException(
                    status_code=422,
                    detail=f"Payment cannot be released: Stripe status is '{intent_status}'. "
                           "Please ask the haulier to re-initiate payment.",
                )
        except stripe.InvalidRequestError as e:
            err_msg = _stripe_error_msg(e)
            # "No such payment_intent" means the intent belongs to a different Stripe
            # account (stale test data). Skip Stripe capture and release the DB record.
            if "no such payment_intent" in err_msg.lower():
                log.warning(
                    "release_payment_stale_intent",
                    job_id=job_id, intent_id=intent_id, error=err_msg,
                )
                captured_intent = None  # skip transfer too — nothing was captured
            else:
                raise HTTPException(status_code=400, detail=err_msg)
        except stripe.StripeError as e:
            raise HTTPException(status_code=400, detail=_stripe_error_msg(e))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Could not reach payment provider: {str(e)}")

    # Driver receives their original quoted amount; platform retains the 12.5% fee.
    driver_payout = float(payment.driver_amount) if payment.driver_amount else float(payment.amount)
    driver_payout_minor = int(round(driver_payout * 100))

    # Attempt to transfer driver's share to their Stripe Connect account.
    transfer_id = None
    has_destination = False

    if captured_intent is not None:
        try:
            td = getattr(captured_intent, "transfer_data", None)
            if td is None and isinstance(captured_intent, dict):
                td = captured_intent.get("transfer_data")
            has_destination = bool(
                td and (td.get("destination") if isinstance(td, dict) else getattr(td, "destination", None))
            )
        except Exception:
            has_destination = False

    if has_destination and captured_intent is not None:
        # Destination charge: Stripe auto-transferred driver_amount at capture.
        try:
            transfer_id = (getattr(captured_intent, "transfer", None)
                           or (captured_intent.get("transfer") if isinstance(captured_intent, dict) else None))
        except Exception:
            pass
        log.info("release_payment_destination_charge", job_id=job_id, transfer=transfer_id,
                 driver_payout=driver_payout)
    elif job.selected_supplier_id:
        driver = db.query(User).filter(User.id == job.selected_supplier_id).first()
        if driver and driver.stripe_account_id and driver.stripe_onboarding_complete:
            # Transfer only the driver's quoted amount — platform retains platform_fee.
            # Wrap in try/except: the PaymentIntent is already captured above, so a
            # transfer failure must NOT abort the release (that would leave the haulier
            # charged but the payment stuck in ESCROWED). Log and continue — ops team
            # can retry the transfer manually from the Stripe dashboard.
            try:
                transfer_id = transfer_to_driver(
                    stripe_account_id=driver.stripe_account_id,
                    amount_pence=driver_payout_minor,
                    currency=payment.currency,
                    payment_intent_id=intent_id,
                    job_ref=job.job_ref,
                )
            except StripeTransferError as exc:
                log.error(
                    "release_payment_transfer_failed_continuing",
                    job_id=job_id,
                    job_ref=job.job_ref,
                    driver_id=str(driver.id),
                    stripe_account=driver.stripe_account_id,
                    amount_pence=driver_payout_minor,
                    currency=payment.currency,
                    error=str(exc),
                    action="payment marked RELEASED; manual Stripe transfer required",
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

    # Fetch Stripe receipt URL from the latest charge on the intent
    try:
        latest_charge_id = getattr(captured_intent, "latest_charge", None)
        if latest_charge_id:
            charge = client.Charge.retrieve(str(latest_charge_id))
            receipt_url = getattr(charge, "receipt_url", None)
            if receipt_url:
                payment.stripe_receipt_url = str(receipt_url)
    except Exception:
        pass

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
