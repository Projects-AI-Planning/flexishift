from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, Role
from app.schemas.availability import (
    AvailabilitySlotIn, AvailabilitySlotOut,
    AvailabilityBlockIn, AvailabilityBlockOut,
)
from app.services import availability as avail_svc

router = APIRouter(prefix="/users/me/availability", tags=["Availability"])

SupplierDep = require_role(Role.DRIVER, Role.FIRM)


@router.get("/slots/{slot_id}", response_model=AvailabilitySlotOut)
def get_slot(
    slot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    from fastapi import HTTPException
    from app.models.availability import AvailabilitySlot
    slot = db.get(AvailabilitySlot, slot_id)
    if not slot or slot.driver_id != current_user.id:
        raise HTTPException(status_code=404, detail="Slot not found")
    return slot


@router.get("/slots", response_model=List[AvailabilitySlotOut])
def list_slots(
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    return avail_svc.list_slots(db, current_user.id)


@router.post("/slots", response_model=AvailabilitySlotOut, status_code=201)
def add_slot(
    body: AvailabilitySlotIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    return avail_svc.add_slot(db, current_user, body.day_of_week, body.start_time, body.end_time)


@router.patch("/slots/{slot_id}/toggle", response_model=AvailabilitySlotOut)
def toggle_slot(
    slot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    return avail_svc.toggle_slot(db, slot_id, current_user)


@router.delete("/slots/{slot_id}", status_code=204)
def delete_slot(
    slot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    avail_svc.delete_slot(db, slot_id, current_user)


@router.get("/blocks", response_model=List[AvailabilityBlockOut])
def list_blocks(
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    return avail_svc.list_blocks(db, current_user.id)


@router.post("/blocks", response_model=AvailabilityBlockOut, status_code=201)
def add_block(
    body: AvailabilityBlockIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    return avail_svc.add_block(db, current_user, body.block_start, body.block_end, body.reason)


@router.delete("/blocks/{block_id}", status_code=204)
def delete_block(
    block_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(SupplierDep),
):
    avail_svc.delete_block(db, block_id, current_user)
