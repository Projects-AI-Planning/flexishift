from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.shift import Shift, ShiftQuote, ShiftStatus, ShiftQuoteStatus, RequirementType
from app.models.user import User


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
    drop = data.get("drop_address", "").strip()
    shift = Shift(
        haulier_id=haulier.id,
        requirement_type=req_enum,
        start_date=start,
        end_date=end,
        total_days=total_days,
        hours_per_day=data["hours_per_day"],
        pickup_address=pickup,
        drop_address=drop,
        location=f"{pickup} → {drop}" if pickup and drop else pickup or drop,
        notes=data.get("notes"),
        daily_rate=data.get("daily_rate"),
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


def list_available_shifts(db: Session) -> list[Shift]:
    return (
        db.query(Shift)
        .filter(Shift.status == ShiftStatus.OPEN)
        .order_by(Shift.start_date.asc())
        .all()
    )


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
            Shift.status.in_([ShiftStatus.BOOKED, ShiftStatus.IN_PROGRESS, ShiftStatus.COMPLETED]),
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
            ShiftQuote.status == ShiftQuoteStatus.PENDING,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=422, detail="You already have a pending quote for this shift")

    total = round(amount_per_day * shift.total_days, 2)
    quote = ShiftQuote(
        shift_id=shift_id,
        driver_id=driver.id,
        amount_per_day=amount_per_day,
        total_amount=total,
        notes=notes,
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
