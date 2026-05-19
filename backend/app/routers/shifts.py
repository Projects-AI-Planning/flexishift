from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, Role
from app.schemas.shifts import ShiftCreateRequest, ShiftQuoteCreateRequest
from app.services import shifts as shifts_svc

router = APIRouter(prefix="/shifts", tags=["Shifts"])


def _shift_dict(shift, quotes=None) -> dict:
    d = {
        "shiftId": shift.id,
        "shiftRef": shift.shift_ref,
        "haulierId": shift.haulier_id,
        "requirementType": shift.requirement_type.value if hasattr(shift.requirement_type, "value") else shift.requirement_type,
        "startDate": str(shift.start_date),
        "endDate": str(shift.end_date),
        "totalDays": shift.total_days,
        "hoursPerDay": shift.hours_per_day,
        "pickupAddress": shift.pickup_address,
        "dropAddress": shift.drop_address,
        "location": shift.location,
        "notes": shift.notes,
        "dailyRate": float(shift.daily_rate) if shift.daily_rate else None,
        "status": shift.status.value if hasattr(shift.status, "value") else shift.status,
        "selectedDriverId": shift.selected_driver_id,
        "daysCompleted": shift.days_completed,
        "createdAt": shift.created_at.isoformat() if shift.created_at else None,
        "updatedAt": shift.updated_at.isoformat() if shift.updated_at else None,
    }
    if quotes is not None:
        d["quotes"] = [_quote_dict(q) for q in quotes]
    return d


def _quote_dict(quote) -> dict:
    driver_name = None
    if hasattr(quote, "driver") and quote.driver:
        driver_name = quote.driver.name
    return {
        "quoteId": quote.id,
        "shiftId": quote.shift_id,
        "driverId": quote.driver_id,
        "driverName": driver_name,
        "amountPerDay": float(quote.amount_per_day),
        "totalAmount": float(quote.total_amount),
        "status": quote.status.value if hasattr(quote.status, "value") else quote.status,
        "notes": quote.notes,
        "createdAt": quote.created_at.isoformat() if quote.created_at else None,
    }


# ── Haulier endpoints ──────────────────────────────────────────────────────────

@router.post("/create")
async def create_shift(
    body: ShiftCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
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
    else:
        items = shifts_svc.list_driver_shifts(db, current_user.id)
    return ok({"items": [_shift_dict(s) for s in items], "total": len(items)})


@router.get("/available")
def list_available_shifts(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items = shifts_svc.list_available_shifts(db)
    return ok({"items": [_shift_dict(s) for s in items], "total": len(items)})


@router.get("/my-shifts")
def list_driver_shifts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = shifts_svc.list_driver_shifts(db, current_user.id)
    return ok({"items": [_shift_dict(s) for s in items], "total": len(items)})


@router.get("/{shift_id}")
def get_shift(
    shift_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    shift = shifts_svc.get_shift(db, shift_id)
    return ok(_shift_dict(shift))


@router.get("/{shift_id}/quotes")
def get_shift_quotes(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    quotes = shifts_svc.list_shift_quotes(db, shift_id, current_user)
    return ok({"items": [_quote_dict(q) for q in quotes], "total": len(quotes)})


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
    return ok(_shift_dict(shift), f"Day {shift.days_completed} of {shift.total_days} completed")


@router.put("/cancel/{shift_id}")
def cancel_shift(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = shifts_svc.cancel_shift(db, shift_id, current_user)
    return ok(_shift_dict(shift), "Shift cancelled")


# ── Driver endpoints ────────────────────────────────────────────────────────────

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


@router.delete("/{shift_id}/quote")
def withdraw_quote(
    shift_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = shifts_svc.withdraw_shift_quote(db, shift_id, current_user)
    return ok(_quote_dict(quote), "Quote withdrawn")
