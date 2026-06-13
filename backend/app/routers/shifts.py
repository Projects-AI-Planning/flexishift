import re as _re
from uuid import uuid4
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List

from app.core.response import ok, created
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.shift import ShiftPayment, ShiftPaymentStatus, ShiftStatus, RequirementType
from app.models.local_upload import LocalUploadKind, LocalUploadStatus
from app.models.user import User, Role
from app.schemas.shifts import ShiftCreateRequest, ShiftQuoteCreateRequest
from app.services import shifts as shifts_svc
from app.services import local_storage as local_svc


def _fix_url(url: str) -> str:
    """Rewrite any host:port to BACKEND_URL for upload paths. Filter out device-local file:// URIs."""
    if not url or url.startswith('file://'):
        return ''
    if '/uploads/' in url:
        return _re.sub(r'https?://[^/]+', settings.BACKEND_URL.rstrip("/"), url)
    return url


class UpdateShiftLocationRequest(BaseModel):
    latitude:  float
    longitude: float
    model_config = {"populate_by_name": True}

router = APIRouter(prefix="/shifts", tags=["Shifts"])


def _shift_dict(shift, quotes=None, db=None) -> dict:
    d = {
        "shiftId": shift.id,
        "shiftRef": shift.shift_ref,
        "haulierId": shift.haulier_id,
        "requirementType": shift.requirement_type.value if hasattr(shift.requirement_type, "value") else shift.requirement_type,
        "startDate": str(shift.start_date),
        "endDate": str(shift.start_date),
        "totalDays": 1,
        "hoursPerDay": shift.hours_per_day,
        "pickupAddress": shift.pickup_address,
        "pickupLat": float(shift.pickup_lat) if shift.pickup_lat else None,
        "pickupLng": float(shift.pickup_lng) if shift.pickup_lng else None,
        "dropAddress": shift.drop_address,
        "dropLat": float(shift.drop_lat) if shift.drop_lat else None,
        "dropLng": float(shift.drop_lng) if shift.drop_lng else None,
        "location": shift.location,
        "goodsType": shift.goods_type,
        "reportingLocation": shift.reporting_location,
        "totalCapacity": float(shift.total_capacity) if shift.total_capacity else None,
        "compartments": shift.compartments,
        "compartmentDetails": shift.compartment_details or [],
        "stops": shift.stops or [],
        "accessCode": shift.access_code,
        "loadCode": shift.load_code,
        "jobTime": shift.job_time,
        "specialInstructions": shift.special_instructions,
        "distanceKm": float(shift.distance_km) if shift.distance_km else None,
        "durationMin": shift.duration_min,
        "notes": shift.notes,
        "dailyRate": float(shift.daily_rate) if shift.daily_rate else None,
        "status": shift.status.value if hasattr(shift.status, "value") else shift.status,
        "quoteCount": sum(1 for q in shift.quotes if q.status.value == 'PENDING') if shift.quotes is not None else 0,
        "selectedDriverId": shift.selected_driver_id,
        "daysCompleted": shift.days_completed,
        "createdAt": shift.created_at.isoformat() if shift.created_at else None,
        "updatedAt": shift.updated_at.isoformat() if shift.updated_at else None,
        "currentDayEscrowed": False,  # default; overridden below when db is available
        "accessCodeVerified": shift.access_code_verified,
        "handoverSubmitted": shift.handover_submitted,
        "handoverHaulierSigned": shift.handover_haulier_signed,
        "handoverHaulierSignedAt": (
            shift.handover_haulier_signed_at.isoformat()
            if shift.handover_haulier_signed_at else None
        ),
        "handoverHaulierSignatureData": shift.handover_haulier_signature_data,
    }

    # Tell the frontend whether the (single) shift payment is already in escrow,
    # and expose a job-style `paymentStatus` so the shared payment page can treat
    # a shift exactly like a job.
    d["paymentStatus"] = None
    d["driverAmount"] = None
    if db is not None:
        payment = (
            db.query(ShiftPayment)
            .filter(ShiftPayment.shift_id == shift.id, ShiftPayment.day_number == 1)
            .first()
        )
        if payment is not None:
            d["paymentStatus"] = payment.status.value if hasattr(payment.status, "value") else payment.status
            d["currentDayEscrowed"] = payment.status == ShiftPaymentStatus.ESCROWED
            # The exact amount transferred to the driver (their quoted rate) — for the
            # "payment released" screen, like jobs.
            d["driverAmount"] = float(payment.driver_amount) if payment.driver_amount else float(payment.amount)

    if quotes is not None:
        include_vehicle = shift.requirement_type != RequirementType.DRIVER_ONLY
        d["quotes"] = [_quote_dict(q, include_vehicle=include_vehicle) for q in quotes]
    return d


def _quote_dict(quote, include_vehicle: bool = True) -> dict:
    driver = quote.driver if hasattr(quote, "driver") and quote.driver else None
    driver_profile = driver.profile if driver and hasattr(driver, "profile") else None
    d = {
        "quoteId": quote.id,
        "shiftId": quote.shift_id,
        "driverId": quote.driver_id,
        "driverName": driver.full_name if driver else None,
        "driverPhone": driver.phone if driver else None,
        "amountPerDay": float(quote.amount_per_day),
        "totalAmount": float(quote.total_amount),
        "status": quote.status.value if hasattr(quote.status, "value") else quote.status,
        "notes": quote.notes,
        "createdAt": quote.created_at.isoformat() if quote.created_at else None,
    }
    if include_vehicle and driver_profile:
        d["vehicleType"] = driver_profile.vehicle_type
        d["vehicleRegistration"] = driver_profile.vehicle_registration
    return d


def _driver_quote_dict(quote) -> dict:
    d = {
        "quoteId": quote.id,
        "shiftId": quote.shift_id,
        "amountPerDay": float(quote.amount_per_day),
        "totalAmount": float(quote.total_amount),
        "status": quote.status.value if hasattr(quote.status, "value") else quote.status,
        "notes": quote.notes,
        "createdAt": quote.created_at.isoformat() if quote.created_at else None,
    }
    shift = quote.shift if hasattr(quote, "shift") else None
    if shift:
        d.update({
            "shiftRef": shift.shift_ref,
            "startDate": str(shift.start_date),
            "hoursPerDay": shift.hours_per_day,
            "location": shift.location or "",
            "pickupAddress": shift.pickup_address or "",
            "dropAddress": shift.drop_address or "",
            "reportingLocation": shift.reporting_location or "",
            "shiftStatus": shift.status.value if hasattr(shift.status, "value") else shift.status,
        })
    return d


# ── Haulier endpoints ──────────────────────────────────────────────────────────

@router.post("/create")
async def create_shift(
    body: ShiftCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    if not current_user.admin_approved:
        raise HTTPException(status_code=403, detail="Your account is pending admin approval. You cannot post shifts until approved.")
    data = body.model_dump(by_alias=False)
    shift = shifts_svc.create_shift(db, current_user, data)
    return created(_shift_dict(shift), "Shift created successfully")


@router.get("/list")
def list_my_shifts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in (Role.HAULIER, Role.FIRM):
        items = shifts_svc.list_haulier_shifts(db, current_user.id)
        return ok({"items": [_shift_dict(s, db=db) for s in items], "total": len(items)})
    else:
        items = shifts_svc.list_driver_shifts(db, current_user.id)
        return ok({"items": [_shift_dict(s, db=db) for s in items], "total": len(items)})


@router.get("/available")
async def list_available_shifts(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.expiry import expire_stale_shifts
    background_tasks.add_task(expire_stale_shifts, db)
    items = shifts_svc.list_available_shifts(db, current_user)
    return ok({"items": [_shift_dict(s) for s in items], "total": len(items)})


@router.get("/my-shifts")
def list_driver_shifts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = shifts_svc.list_driver_shifts(db, current_user.id)
    return ok({"items": [_shift_dict(s, db=db) for s in items], "total": len(items)})


@router.get("/my-quotes")
def list_my_shift_quotes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quotes = shifts_svc.list_driver_shift_quotes(db, current_user.id)
    return ok({"items": [_driver_quote_dict(q) for q in quotes], "total": len(quotes)})


@router.get("/{shift_id}")
def get_shift(
    shift_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    shift = shifts_svc.get_shift(db, shift_id)
    return ok(_shift_dict(shift, db=db))


@router.get("/{shift_id}/quotes")
def get_shift_quotes(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    from app.models.shift import Shift
    quotes = shifts_svc.list_shift_quotes(db, shift_id, current_user)
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    include_vehicle = shift is None or shift.requirement_type != RequirementType.DRIVER_ONLY
    return ok({"items": [_quote_dict(q, include_vehicle=include_vehicle) for q in quotes], "total": len(quotes)})


@router.post("/{shift_id}/quotes/{quote_id}/accept")
def accept_quote(
    shift_id: str,
    quote_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    shift = shifts_svc.accept_shift_quote(db, shift_id, quote_id, current_user)
    return ok(_shift_dict(shift), "Quote accepted and shift booked")


@router.post("/{shift_id}/days/complete")
def complete_day(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    shift = shifts_svc.complete_shift_day(db, shift_id, current_user)
    return ok(_shift_dict(shift, db=db), "Shift completed")


@router.put("/cancel/{shift_id}")
def cancel_shift(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = shifts_svc.cancel_shift(db, shift_id, current_user)
    return ok(_shift_dict(shift, db=db), "Shift cancelled")


# ── Driver endpoints ────────────────────────────────────────────────────────────

@router.post("/{shift_id}/days/start")
def start_shift_day(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Driver confirms they are starting today's work day.
    Requires the haulier to have escrowed payment for the current day.
    Transitions BOOKED → IN_PROGRESS on Day 1.
    """
    shift = shifts_svc.start_shift_day(db, shift_id, current_user)
    return ok(_shift_dict(shift, db=db), "Shift started — drive safe!")


@router.post("/{shift_id}/location")
def update_shift_driver_location(
    shift_id: str,
    body: UpdateShiftLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Driver pushes their current GPS position while a shift day is active."""
    from datetime import datetime as _dt
    shift = shifts_svc.get_shift(db, shift_id)
    if shift.selected_driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    if shift.status not in (ShiftStatus.BOOKED, ShiftStatus.IN_PROGRESS):
        raise HTTPException(status_code=422, detail="Shift is not active")

    # Persist on the user row — already has location_lat / location_lng columns
    current_user.location_lat = body.latitude
    current_user.location_lng = body.longitude
    db.commit()

    # Broadcast to haulier WebSocket subscribers
    from datetime import datetime as _dt
    from app.core.connection_manager import manager as _mgr
    import asyncio as _asyncio
    channel = f"shift:{shift_id}"
    try:
        _asyncio.get_event_loop().create_task(
            _mgr.broadcast(channel, {
                "type": "tracking_update",
                "lat": body.latitude,
                "lng": body.longitude,
                "recorded_at": _dt.utcnow().isoformat(),
            })
        )
    except Exception:
        pass

    return ok({"latitude": body.latitude, "longitude": body.longitude}, "Location updated")


@router.get("/{shift_id}/driver-location")
def get_shift_driver_location(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Haulier polls driver's current GPS position for a shift in progress."""
    shift = shifts_svc.get_shift(db, shift_id)
    # Allow both haulier and the driver themselves to read location
    is_haulier = shift.haulier_id == current_user.id
    is_driver  = shift.selected_driver_id == current_user.id
    if not (is_haulier or is_driver):
        raise HTTPException(status_code=403, detail="Not authorised")

    driver = db.query(User).filter(User.id == shift.selected_driver_id).first()
    if not driver:
        return ok(None, "No driver assigned")

    return ok({
        "driverId":   driver.id,
        "driverName": driver.full_name,
        "latitude":   float(driver.location_lat) if driver.location_lat else None,
        "longitude":  float(driver.location_lng) if driver.location_lng else None,
    })


# ── Shift Compliance / End-of-Day / Rating ─────────────────────────────────────

class VerifyShiftAccessCodeRequest(BaseModel):
    code: str


class SubmitShiftHandoverRequest(BaseModel):
    checklist:      dict        = {}
    photo_urls:     list        = Field(default_factory=list, alias="photoUrls")
    signature_data: str | None  = Field(None, alias="signatureData")
    model_config = {"populate_by_name": True}


class EndShiftDayRequest(BaseModel):
    notes:           str | None = None
    recipient_name:  str | None = Field(None, alias="recipientName")
    proof_photo_url: str | None = Field(None, alias="proofPhotoUrl")
    signature_data:  str | None = Field(None, alias="signatureData")
    model_config = {"populate_by_name": True}


class ShiftRatingRequest(BaseModel):
    rated_user_id: str  = Field(..., alias="ratedUserId")
    stars:         int
    review:        str | None = None
    model_config = {"populate_by_name": True}


@router.post("/{shift_id}/compliance/access-code")
def verify_shift_access_code_endpoint(
    shift_id: str,
    body: VerifyShiftAccessCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Driver submits the shift access code (Day 1 pickup confirmation)."""
    shift = shifts_svc.verify_shift_access_code(db, shift_id, body.code, current_user)
    return ok(_shift_dict(shift, db=db), "Access code verified — proceed to handover")


@router.post("/{shift_id}/handover/photos")
async def upload_shift_handover_photos(
    shift_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    photos: List[UploadFile] = File(...),
):
    """Upload handover condition photos for a shift; returns server-accessible URLs."""
    uploaded = []
    for photo in photos[:10]:
        suffix = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp"}.get(
            photo.content_type or "", "jpg"
        )
        key = f"shifts/{shift_id}/handover/{uuid4()}.{suffix}"
        contents = await photo.read()
        if local_svc.azure_available():
            from app.services import s3
            s3.upload_bytes(settings.AZURE_CONTAINER_DOCS, key, contents, photo.content_type or "image/jpeg")
            file_url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{key}"
        else:
            local_svc.ensure_local_upload_root()
            file_path = local_svc.LOCAL_UPLOAD_ROOT / key
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(contents)
            file_url = f"{settings.BACKEND_URL.rstrip('/')}/uploads/{key}"
            rec = local_svc.create_pending_upload(
                db, user_id=current_user.id, kind=LocalUploadKind.IMAGE,
                original_name=photo.filename or f"handover.{suffix}",
                content_type=photo.content_type or "image/jpeg", storage_key=key,
            )
            rec.public_url = file_url
            rec.status = LocalUploadStatus.STORED
            db.commit()
        uploaded.append({"key": key, "fileUrl": file_url})
    return ok(data={"uploads": uploaded, "photos": uploaded}, message="Shift handover photos uploaded")


@router.post("/{shift_id}/proof/photos")
async def upload_shift_proof_photos(
    shift_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    photos: List[UploadFile] = File(...),
):
    """Upload end-of-shift delivery proof photos; returns server-accessible URLs (like jobs)."""
    uploaded = []
    for photo in photos[:10]:
        suffix = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp"}.get(
            photo.content_type or "", "jpg"
        )
        key = f"shifts/{shift_id}/proof/{uuid4()}.{suffix}"
        contents = await photo.read()
        if local_svc.azure_available():
            from app.services import s3
            s3.upload_bytes(settings.AZURE_CONTAINER_DOCS, key, contents, photo.content_type or "image/jpeg")
            file_url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{key}"
        else:
            local_svc.ensure_local_upload_root()
            file_path = local_svc.LOCAL_UPLOAD_ROOT / key
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(contents)
            file_url = f"{settings.BACKEND_URL.rstrip('/')}/uploads/{key}"
            rec = local_svc.create_pending_upload(
                db, user_id=current_user.id, kind=LocalUploadKind.IMAGE,
                original_name=photo.filename or f"proof.{suffix}",
                content_type=photo.content_type or "image/jpeg", storage_key=key,
            )
            rec.public_url = file_url
            rec.status = LocalUploadStatus.STORED
            db.commit()
        uploaded.append({"key": key, "fileUrl": file_url})
    return ok(data={"uploads": uploaded, "photos": uploaded}, message="Shift proof photos uploaded")


@router.post("/{shift_id}/handover")
def submit_shift_handover(
    shift_id: str,
    body: SubmitShiftHandoverRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Driver submits the pre-trip handover (checklist + photos + signature).
    Sets handover_submitted = True; waits for haulier to counter-sign."""
    shift = shifts_svc.submit_shift_handover(
        db, shift_id, current_user,
        checklist_data=body.checklist,
        photo_urls=body.photo_urls,
        signature_data=body.signature_data,
    )
    return ok(_shift_dict(shift, db=db), "Handover submitted — waiting for haulier signature")


class SignShiftHandoverRequest(BaseModel):
    signature_data: str | None = Field(None, alias="signatureData")
    model_config = {"populate_by_name": True}


@router.post("/{shift_id}/handover/sign")
def sign_shift_handover(
    shift_id: str,
    body: SignShiftHandoverRequest = SignShiftHandoverRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    """Haulier counter-signs the driver's handover from their dashboard.
    Accepts an optional drawn signature (base64 data URL) from the canvas."""
    shift = shifts_svc.sign_shift_handover_haulier(
        db, shift_id, current_user,
        signature_data=body.signature_data,
    )
    return ok(_shift_dict(shift, db=db), "Handover signed — driver may now start the trip")


@router.get("/{shift_id}/handover/status")
def get_shift_handover_status(
    shift_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Poll handover progress — called by driver app every few seconds."""
    status = shifts_svc.get_shift_handover_status(db, shift_id)
    status["photoUrls"] = [u for u in (_fix_url(u) for u in (status.get("photoUrls") or [])) if u]
    return ok(status)


@router.post("/{shift_id}/days/{day_num}/end")
async def end_shift_day(
    shift_id: str,
    day_num: int,
    body: EndShiftDayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Driver submits end-of-day proof (photos, signature, notes)."""
    proof = shifts_svc.submit_end_of_day(
        db, shift_id, day_num, current_user,
        notes=body.notes,
        recipient_name=body.recipient_name,
        proof_photo_url=body.proof_photo_url,
        signature_data=body.signature_data,
    )

    # Notify haulier to review end-of-day proof and release payment
    shift = shifts_svc.get_shift(db, shift_id)
    if shift and shift.haulier_id:
        driver_name = current_user.full_name or "The driver"
        from app.services.notifications import create_notification
        await create_notification(
            db, shift.haulier_id, "SHIFT_DAY_COMPLETED",
            "Shift Completed — Release Payment",
            f"{driver_name} has completed shift {shift.shift_ref}. Please review and release payment.",
            {"shift_id": shift_id, "shift_ref": shift.shift_ref, "day_number": day_num},
        )
        db.commit()

    return ok({"proofId": proof.id, "dayNumber": proof.day_number}, "End-of-shift proof submitted")


@router.post("/{shift_id}/rating")
def rate_shift(
    shift_id: str,
    body: ShiftRatingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Driver or haulier submits a rating after the shift."""
    rating = shifts_svc.submit_shift_rating(
        db, shift_id, current_user,
        rated_id=body.rated_user_id,
        stars=body.stars,
        review=body.review,
    )
    return ok({"ratingId": rating.id}, "Rating submitted — thank you!")


@router.post("/{shift_id}/quote")
def submit_quote(
    shift_id: str,
    body: ShiftQuoteCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = body.model_dump(by_alias=False)
    quote = shifts_svc.submit_shift_quote(
        db, shift_id, current_user,
        amount_per_day=data["amount_per_day"],
        notes=data.get("notes"),
    )
    return created(_quote_dict(quote), "Quote submitted")


class EditShiftQuoteRequest(BaseModel):
    amount_per_day: float = Field(..., alias="amountPerDay")
    notes: str | None = None
    model_config = {"populate_by_name": True}


@router.patch("/{shift_id}/quote")
def edit_quote(
    shift_id: str,
    body: EditShiftQuoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = body.model_dump(by_alias=False)
    quote = shifts_svc.edit_shift_quote(
        db, shift_id, current_user,
        amount_per_day=data["amount_per_day"],
        notes=data.get("notes"),
    )
    return ok(_quote_dict(quote), "Quote updated")


@router.delete("/{shift_id}/quote")
def withdraw_quote(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = shifts_svc.withdraw_shift_quote(db, shift_id, current_user)
    return ok(_quote_dict(quote), "Quote withdrawn")


# ── Day Payment endpoints ───────────────────────────────────────────────────────

class VerifyDayPaymentRequest(BaseModel):
    day_number:        int = Field(..., alias="dayNumber")
    payment_intent_id: str = Field(..., alias="paymentIntentId")
    model_config = {"populate_by_name": True}


@router.post("/{shift_id}/days/payment", status_code=201)
def create_day_payment(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    """Create a Stripe PaymentIntent for the next shift day (driver daily rate + 12.5% platform fee)."""
    order = shifts_svc.create_day_payment_order(db, shift_id, current_user)
    return created(data=order, message="Day payment order created")


@router.post("/{shift_id}/days/payment/verify")
def verify_day_payment(
    shift_id: str,
    body: VerifyDayPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    """Verify Stripe payment for a shift day, capture funds, and escrow them for the driver."""
    shift = shifts_svc.verify_day_payment(
        db, shift_id, body.day_number, body.payment_intent_id, current_user
    )
    return ok(_shift_dict(shift, db=db), "Payment confirmed — funds held in escrow")


# ── Job-style single payment aliases (single-day shifts) ─────────────────────────
# Shifts are single-day, so payment works like a job: one order, one verify, no day
# numbers. These wrap the existing day-1 logic so the shared web payment page can
# treat a shift exactly like a job booking.

class VerifyShiftPaymentRequest(BaseModel):
    payment_intent_id: str = Field(..., alias="paymentIntentId")
    model_config = {"populate_by_name": True}


@router.post("/{shift_id}/payment", status_code=201)
def create_shift_payment(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    """Create the Stripe PaymentIntent for a (single-day) shift — job-style."""
    order = shifts_svc.create_day_payment_order(db, shift_id, current_user)
    return created(data=order, message="Shift payment order created")


@router.post("/{shift_id}/payment/verify")
def verify_shift_payment(
    shift_id: str,
    body: VerifyShiftPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    """Verify & escrow the single shift payment — job-style (day 1)."""
    shift = shifts_svc.verify_day_payment(
        db, shift_id, 1, body.payment_intent_id, current_user
    )
    return ok(_shift_dict(shift, db=db), "Payment confirmed — funds held in escrow")
