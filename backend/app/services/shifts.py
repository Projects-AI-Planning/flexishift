from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.shift import Shift, ShiftQuote, ShiftStatus, ShiftQuoteStatus, RequirementType, ShiftPayment, ShiftPaymentStatus
from app.models.user import User, UserProfile
from app.models.shift_proof import ShiftDayProof
from app.models.rating import Rating


def create_shift(db: Session, haulier: User, data: dict) -> Shift:
    start = data["start_date"]
    end = data["end_date"]
    if end < start:
        raise HTTPException(status_code=422, detail="end_date must be on or after start_date")
    total_days = (end - start).days + 1

    req_type = data.get("requirement_type", "").upper()
    try:
        req_enum = RequirementType(req_type)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid requirement_type: {req_type}")

    pickup = data.get("pickup_address", "").strip()
    drop   = data.get("drop_address", "").strip()
    haulier_currency = (getattr(haulier, "currency", None) or "GBP").upper()
    shift = Shift(
        haulier_id=haulier.id,
        requirement_type=req_enum,
        start_date=start,
        end_date=end,
        total_days=total_days,
        hours_per_day=data["hours_per_day"],
        pickup_address=pickup,
        pickup_lat=data.get("pickup_lat"),
        pickup_lng=data.get("pickup_lng"),
        drop_address=drop,
        drop_lat=data.get("drop_lat"),
        drop_lng=data.get("drop_lng"),
        location=f"{pickup} → {drop}" if pickup and drop else pickup or drop,
        goods_type=data.get("goods_type"),
        total_capacity=data.get("total_capacity"),
        compartments=data.get("compartments"),
        compartment_details=data.get("compartment_details") or None,
        stops=data.get("stops") or None,
        access_code=(data.get("access_code") or "").strip().upper() or None,
        load_code=(data.get("load_code") or "").strip().upper() or None,
        job_time=data.get("job_time"),
        special_instructions=data.get("special_instructions"),
        distance_km=data.get("distance_km"),
        duration_min=data.get("duration_min"),
        notes=data.get("notes"),
        daily_rate=data.get("daily_rate"),
        currency=haulier_currency,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


def list_haulier_shifts(db: Session, haulier_id: str) -> list[Shift]:
    return (
        db.query(Shift)
        .filter(Shift.haulier_id == haulier_id, Shift.status != ShiftStatus.CANCELLED)
        .order_by(Shift.created_at.desc())
        .all()
    )


def list_available_shifts(db: Session, current_user: User | None = None) -> list[Shift]:
    from datetime import date as _date
    today = _date.today()
    q = db.query(Shift).filter(
        Shift.status == ShiftStatus.OPEN,
        Shift.start_date >= today,          # hide shifts whose start date has passed
    )

    driver_avail = None
    if current_user:
        profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
        driver_avail = profile.driver_availability if profile else None

    if driver_avail == 'DRIVER_ONLY':
        q = q.filter(Shift.requirement_type == RequirementType.DRIVER_ONLY)
    elif driver_avail == 'TRUCK_ONLY':
        q = q.filter(Shift.requirement_type == RequirementType.TRUCK_ONLY)
    # DRIVER_WITH_TRUCK sees all shift requirement types — no additional filter

    return q.order_by(Shift.created_at.desc()).all()


def get_shift(db: Session, shift_id: str) -> Shift:
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift


def list_driver_shifts(db: Session, driver_id: str) -> list[Shift]:
    return (
        db.query(Shift)
        .filter(
            Shift.selected_driver_id == driver_id,
            Shift.status.in_([ShiftStatus.BOOKED, ShiftStatus.IN_PROGRESS, ShiftStatus.COMPLETED, ShiftStatus.CANCELLED]),
        )
        .order_by(Shift.start_date.desc())
        .all()
    )


def submit_shift_quote(db: Session, shift_id: str, driver: User, amount_per_day: float, notes: str | None) -> ShiftQuote:
    shift = get_shift(db, shift_id)
    if shift.status != ShiftStatus.OPEN:
        raise HTTPException(status_code=422, detail="Shift is not open for quotes")

    existing = (
        db.query(ShiftQuote)
        .filter(
            ShiftQuote.shift_id == shift_id,
            ShiftQuote.driver_id == driver.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=422, detail="You have already submitted a quote for this shift")

    total = round(amount_per_day * shift.total_days, 2)
    quote = ShiftQuote(
        shift_id=shift_id,
        driver_id=driver.id,
        amount_per_day=amount_per_day,
        total_amount=total,
        notes=notes,
        currency=(shift.currency or "GBP").upper(),
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


def accept_shift_quote(db: Session, shift_id: str, quote_id: str, haulier: User) -> Shift:
    shift = get_shift(db, shift_id)
    if shift.haulier_id != haulier.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    if shift.status != ShiftStatus.OPEN:
        raise HTTPException(status_code=422, detail="Shift is not open")

    quote = db.query(ShiftQuote).filter(ShiftQuote.id == quote_id, ShiftQuote.shift_id == shift_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    quote.status = ShiftQuoteStatus.ACCEPTED
    db.query(ShiftQuote).filter(
        ShiftQuote.shift_id == shift_id,
        ShiftQuote.id != quote_id,
        ShiftQuote.status == ShiftQuoteStatus.PENDING,
    ).update({"status": ShiftQuoteStatus.REJECTED})

    shift.selected_driver_id = quote.driver_id
    shift.status = ShiftStatus.BOOKED
    shift.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shift)
    return shift


def complete_shift_day(db: Session, shift_id: str, haulier: User) -> Shift:
    shift = get_shift(db, shift_id)
    if shift.haulier_id != haulier.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    if shift.status not in (ShiftStatus.BOOKED, ShiftStatus.IN_PROGRESS):
        raise HTTPException(status_code=422, detail="Shift is not active")

    current_day = shift.days_completed + 1

    # Require an escrowed payment for the day being completed
    payment = (
        db.query(ShiftPayment)
        .filter(
            ShiftPayment.shift_id == shift_id,
            ShiftPayment.day_number == current_day,
            ShiftPayment.status == ShiftPaymentStatus.ESCROWED,
        )
        .first()
    )
    if not payment:
        raise HTTPException(
            status_code=422,
            detail=f"Payment for Day {current_day} must be made before completing it",
        )

    # Release the escrowed funds
    payment.status = ShiftPaymentStatus.RELEASED
    payment.released_at = datetime.utcnow()

    shift.days_completed = min(shift.days_completed + 1, shift.total_days)
    shift.status = ShiftStatus.IN_PROGRESS if shift.days_completed < shift.total_days else ShiftStatus.COMPLETED
    shift.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shift)
    return shift


def cancel_shift(db: Session, shift_id: str, user: User) -> Shift:
    shift = get_shift(db, shift_id)
    is_haulier = shift.haulier_id == user.id
    is_driver = shift.selected_driver_id == user.id
    if not (is_haulier or is_driver):
        raise HTTPException(status_code=403, detail="Not authorised")
    if shift.status == ShiftStatus.COMPLETED:
        raise HTTPException(status_code=422, detail="Cannot cancel a completed shift")
    if shift.status == ShiftStatus.CANCELLED:
        raise HTTPException(status_code=422, detail="Shift already cancelled")

    shift.status = ShiftStatus.CANCELLED
    shift.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shift)
    return shift


def withdraw_shift_quote(db: Session, shift_id: str, driver: User) -> ShiftQuote:
    quote = (
        db.query(ShiftQuote)
        .filter(
            ShiftQuote.shift_id == shift_id,
            ShiftQuote.driver_id == driver.id,
            ShiftQuote.status == ShiftQuoteStatus.PENDING,
        )
        .first()
    )
    if not quote:
        raise HTTPException(status_code=404, detail="No active quote found to withdraw")
    quote.status = ShiftQuoteStatus.WITHDRAWN
    db.commit()
    db.refresh(quote)
    return quote


def list_shift_quotes(db: Session, shift_id: str, haulier: User) -> list[ShiftQuote]:
    shift = get_shift(db, shift_id)
    if shift.haulier_id != haulier.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    return db.query(ShiftQuote).filter(ShiftQuote.shift_id == shift_id).all()


def list_driver_shift_quotes(db: Session, driver_id: str) -> list[ShiftQuote]:
    return (
        db.query(ShiftQuote)
        .filter(ShiftQuote.driver_id == driver_id)
        .order_by(ShiftQuote.created_at.desc())
        .all()
    )


# ── Shift Day Payment ──────────────────────────────────────────────────────────

PLATFORM_FEE_RATE = 0.125  # 12.5 %


def create_day_payment_order(db: Session, shift_id: str, haulier: User) -> dict:
    """Create a Stripe PaymentIntent for the next shift day (driver daily rate + 12.5% platform fee)."""
    import stripe
    from app.config import settings

    shift = get_shift(db, shift_id)
    if shift.haulier_id != haulier.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    if shift.status not in (ShiftStatus.BOOKED, ShiftStatus.IN_PROGRESS):
        raise HTTPException(status_code=422, detail="Shift is not active")

    next_day = shift.days_completed + 1
    if next_day > shift.total_days:
        raise HTTPException(status_code=422, detail="All days have already been completed")

    # Get the accepted quote for the daily rate
    quote = (
        db.query(ShiftQuote)
        .filter(ShiftQuote.shift_id == shift_id, ShiftQuote.status == ShiftQuoteStatus.ACCEPTED)
        .first()
    )
    if not quote:
        raise HTTPException(status_code=404, detail="No accepted quote found for this shift")

    # Idempotency: check for existing payment for this day
    existing = (
        db.query(ShiftPayment)
        .filter(ShiftPayment.shift_id == shift_id, ShiftPayment.day_number == next_day)
        .first()
    )
    if existing and existing.status == ShiftPaymentStatus.ESCROWED:
        raise HTTPException(status_code=409, detail=f"Payment for Day {next_day} is already escrowed")

    driver_daily  = float(quote.amount_per_day)
    platform_fee  = round(driver_daily * PLATFORM_FEE_RATE, 2)
    grand_total   = round(driver_daily + platform_fee, 2)
    amount_minor  = int(round(grand_total * 100))

    currency = (getattr(haulier, "currency", None) or shift.currency or settings.PAYMENT_CURRENCY or "GBP").upper()
    stripe.api_key = settings.STRIPE_SECRET_KEY

    # Reuse a stale PENDING intent rather than creating a duplicate
    if existing and existing.gateway_order_id:
        try:
            prev = stripe.PaymentIntent.retrieve(existing.gateway_order_id)
            if prev["status"] == "requires_payment_method":
                return {
                    "paymentId":      existing.id,
                    "dayNumber":      next_day,
                    "totalDays":      shift.total_days,
                    "gatewayOrderId": prev["id"],
                    "clientSecret":   prev["client_secret"],
                    "amount":         grand_total,
                    "currency":       currency,
                    "publishableKey": settings.STRIPE_PUBLISHABLE_KEY,
                    "driverAmount":   driver_daily,
                    "platformFee":    platform_fee,
                }
            if prev["status"] not in ("succeeded", "canceled"):
                try:
                    stripe.PaymentIntent.cancel(prev["id"])
                except stripe.StripeError:
                    pass
        except stripe.StripeError:
            pass

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_minor,
            currency=currency.lower(),
            capture_method="manual",
            payment_method_types=["card"],
            metadata={
                "shift_id":   shift_id,
                "shift_ref":  shift.shift_ref,
                "day_number": next_day,
                "haulier_id": haulier.id,
                "driver_id":  quote.driver_id,
            },
            description=f"FlexiShift {shift.shift_ref} – Day {next_day} of {shift.total_days}",
        )
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Payment gateway error: {e.user_message or str(e)}")

    if existing:
        existing.quote_id         = quote.id
        existing.gateway_order_id = intent["id"]
        existing.amount           = grand_total
        existing.driver_amount    = driver_daily
        existing.platform_fee     = platform_fee
        existing.currency         = currency
        existing.status           = ShiftPaymentStatus.PENDING
        db.commit()
        payment = existing
    else:
        payment = ShiftPayment(
            shift_id=shift_id,
            quote_id=quote.id,
            day_number=next_day,
            gateway_order_id=intent["id"],
            amount=grand_total,
            driver_amount=driver_daily,
            platform_fee=platform_fee,
            currency=currency,
            status=ShiftPaymentStatus.PENDING,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

    return {
        "paymentId":      payment.id,
        "dayNumber":      next_day,
        "totalDays":      shift.total_days,
        "gatewayOrderId": intent["id"],
        "clientSecret":   intent["client_secret"],
        "amount":         grand_total,
        "currency":       currency,
        "publishableKey": settings.STRIPE_PUBLISHABLE_KEY,
        "driverAmount":   driver_daily,
        "platformFee":    platform_fee,
    }


def verify_day_payment(
    db: Session, shift_id: str, day_number: int, payment_intent_id: str, haulier: User
) -> Shift:
    """Verify a Stripe PaymentIntent for a shift day, capture funds, and mark ESCROWED."""
    import stripe
    from app.config import settings

    shift = get_shift(db, shift_id)
    if shift.haulier_id != haulier.id:
        raise HTTPException(status_code=403, detail="Not authorised")

    payment = (
        db.query(ShiftPayment)
        .filter(ShiftPayment.shift_id == shift_id, ShiftPayment.day_number == day_number)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    if payment.status == ShiftPaymentStatus.ESCROWED:
        raise HTTPException(status_code=409, detail="Already escrowed")

    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    if intent["status"] not in ("requires_capture", "succeeded"):
        raise HTTPException(
            status_code=422,
            detail=f"Payment not confirmed (status: {intent['status']})",
        )

    if intent["status"] == "requires_capture":
        try:
            stripe.PaymentIntent.capture(payment_intent_id)
        except stripe.StripeError as e:
            raise HTTPException(status_code=400, detail=f"Capture failed: {e.user_message or str(e)}")

    payment.gateway_payment_id = payment_intent_id
    payment.status             = ShiftPaymentStatus.ESCROWED
    payment.escrowed_at        = datetime.utcnow()

    # Note: shift stays BOOKED until the driver explicitly calls start_shift_day.
    # This gives the driver a visible "Start Day 1" button before work begins.

    db.commit()
    db.refresh(shift)
    return shift


def start_shift_day(db: Session, shift_id: str, driver: User) -> Shift:
    """Driver confirms they are starting today's work.
    - Validates that the next day's payment is escrowed (haulier has paid).
    - Transitions BOOKED → IN_PROGRESS on the first day.
    - Subsequent days: shift is already IN_PROGRESS; just returns the shift.
    """
    shift = get_shift(db, shift_id)
    if shift.selected_driver_id != driver.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    if shift.status not in (ShiftStatus.BOOKED, ShiftStatus.IN_PROGRESS):
        raise HTTPException(status_code=422, detail="Shift is not active")

    next_day = shift.days_completed + 1
    if next_day > shift.total_days:
        raise HTTPException(status_code=422, detail="All days have already been completed")

    # Require the haulier to have paid for this day before the driver can start
    payment = (
        db.query(ShiftPayment)
        .filter(
            ShiftPayment.shift_id == shift_id,
            ShiftPayment.day_number == next_day,
            ShiftPayment.status == ShiftPaymentStatus.ESCROWED,
        )
        .first()
    )
    if not payment:
        raise HTTPException(
            status_code=422,
            detail=f"Haulier has not yet paid for Day {next_day}. Cannot start until payment is escrowed.",
        )

    # Transition BOOKED → IN_PROGRESS on the very first day
    if shift.status == ShiftStatus.BOOKED:
        shift.status     = ShiftStatus.IN_PROGRESS
        shift.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(shift)

    return shift


# ── Shift Access-Code Verification ────────────────────────────────────────────

def verify_shift_access_code(db: Session, shift_id: str, code: str, driver: User) -> Shift:
    """Driver verifies the shift access code (Day 1 pickup confirmation)."""
    shift = get_shift(db, shift_id)
    if shift.selected_driver_id != driver.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    if shift.status not in (ShiftStatus.BOOKED, ShiftStatus.IN_PROGRESS):
        raise HTTPException(status_code=422, detail="Shift is not active")

    if not shift.access_code:
        # No access code required — auto-pass
        shift.access_code_verified = True
        db.commit()
        db.refresh(shift)
        return shift

    if code.strip().upper() != shift.access_code.upper():
        raise HTTPException(status_code=422, detail="Incorrect access code")

    shift.access_code_verified = True
    shift.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shift)
    return shift


# ── Shift Handover ────────────────────────────────────────────────────────────

def submit_shift_handover(
    db: Session,
    shift_id: str,
    driver: User,
    checklist_data: dict,
    photo_urls: list,
    signature_data: str | None,
) -> Shift:
    """Driver submits the pre-trip handover checklist + photos + signature."""
    shift = get_shift(db, shift_id)
    if shift.selected_driver_id != driver.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    if shift.status not in (ShiftStatus.BOOKED, ShiftStatus.IN_PROGRESS):
        raise HTTPException(status_code=422, detail="Shift is not active")

    shift.handover_submitted = True
    shift.handover_checklist_data = checklist_data or {}
    shift.handover_photo_urls = photo_urls or []
    shift.handover_driver_signature = signature_data
    shift.handover_submitted_at = datetime.utcnow()
    # Reset haulier sign-off in case this is a re-submit
    shift.handover_haulier_signed = False
    shift.handover_haulier_signed_at = None
    shift.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shift)
    return shift


def sign_shift_handover_haulier(
    db: Session,
    shift_id: str,
    haulier: User,
    signature_data: str | None = None,
) -> Shift:
    """Haulier counter-signs the driver's handover (with optional drawn signature)."""
    shift = get_shift(db, shift_id)
    if shift.haulier_id != haulier.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    if not shift.handover_submitted:
        raise HTTPException(status_code=422, detail="Driver must submit handover first")

    shift.handover_haulier_signed = True
    shift.handover_haulier_signed_at = datetime.utcnow()
    if signature_data:
        shift.handover_haulier_signature_data = signature_data
    shift.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shift)
    return shift


def get_shift_handover_status(db: Session, shift_id: str) -> dict:
    """Return handover progress for a shift (polled by the driver app)."""
    shift = get_shift(db, shift_id)
    return {
        "handoverSubmitted": shift.handover_submitted,
        "handoverSubmittedAt": shift.handover_submitted_at.isoformat() if shift.handover_submitted_at else None,
        "checklistData": shift.handover_checklist_data or {},
        "photoUrls": shift.handover_photo_urls or [],
        "driverSignatureData": shift.handover_driver_signature,
        "handoverHaulierSigned": shift.handover_haulier_signed,
        "handoverHaulierSignedAt": (
            shift.handover_haulier_signed_at.isoformat()
            if shift.handover_haulier_signed_at else None
        ),
        "handoverHaulierSignatureData": shift.handover_haulier_signature_data,
    }


# ── Driver End-of-Day Proof ────────────────────────────────────────────────────

def submit_end_of_day(
    db: Session,
    shift_id: str,
    day_number: int,
    driver: User,
    notes: str | None,
    recipient_name: str | None,
    proof_photo_url: str | None,
    signature_data: str | None,
) -> ShiftDayProof:
    """Driver submits end-of-day proof. Creates or updates the proof record."""
    shift = get_shift(db, shift_id)
    if shift.selected_driver_id != driver.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    if shift.status != ShiftStatus.IN_PROGRESS:
        raise HTTPException(status_code=422, detail="Shift is not in progress")

    existing = (
        db.query(ShiftDayProof)
        .filter(ShiftDayProof.shift_id == shift_id, ShiftDayProof.day_number == day_number)
        .first()
    )
    if existing:
        existing.notes           = notes
        existing.recipient_name  = recipient_name
        existing.proof_photo_url = proof_photo_url
        existing.signature_data  = signature_data
        existing.submitted_at    = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    proof = ShiftDayProof(
        shift_id=shift_id,
        day_number=day_number,
        driver_id=driver.id,
        notes=notes,
        recipient_name=recipient_name,
        proof_photo_url=proof_photo_url,
        signature_data=signature_data,
        submitted_at=datetime.utcnow(),
    )
    db.add(proof)
    db.commit()
    db.refresh(proof)
    return proof


# ── Shift Rating ───────────────────────────────────────────────────────────────

def submit_shift_rating(
    db: Session,
    shift_id: str,
    rater: User,
    rated_id: str,
    stars: int,
    review: str | None,
) -> Rating:
    """Driver (or haulier) submits a rating once the shift is active or completed."""
    shift = get_shift(db, shift_id)
    if shift.status not in (ShiftStatus.IN_PROGRESS, ShiftStatus.COMPLETED):
        raise HTTPException(status_code=422, detail="Shift must be in progress or completed before rating")

    is_participant = (rater.id == shift.selected_driver_id or rater.id == shift.haulier_id)
    if not is_participant:
        raise HTTPException(status_code=403, detail="Not authorised")

    existing = (
        db.query(Rating)
        .filter(Rating.shift_id == shift_id, Rating.rater_id == rater.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already rated this shift")

    if not (1 <= stars <= 5):
        raise HTTPException(status_code=422, detail="Stars must be between 1 and 5")

    rating = Rating(
        shift_id=shift_id,
        rater_id=rater.id,
        rated_id=rated_id,
        stars=stars,
        review_text=review,
    )
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating
