from datetime import date, time
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.availability import AvailabilitySlot, AvailabilityBlock
from app.models.user import User, Role


def _require_supplier(user: User) -> None:
    if user.role not in (Role.DRIVER, Role.FIRM):
        raise HTTPException(status_code=403, detail="Only drivers or firms can manage availability")


def list_slots(db: Session, driver_id: str) -> list:
    return db.query(AvailabilitySlot).filter(AvailabilitySlot.driver_id == driver_id).all()


def add_slot(db: Session, user: User, day_of_week: int, start_time: time, end_time: time) -> AvailabilitySlot:
    _require_supplier(user)
    slot = AvailabilitySlot(
        driver_id=user.id,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


def toggle_slot(db: Session, slot_id: str, user: User) -> AvailabilitySlot:
    slot = db.get(AvailabilitySlot, slot_id)
    if not slot or slot.driver_id != user.id:
        raise HTTPException(status_code=404, detail="Slot not found")
    slot.is_active = not slot.is_active
    db.commit()
    db.refresh(slot)
    return slot


def delete_slot(db: Session, slot_id: str, user: User) -> None:
    slot = db.get(AvailabilitySlot, slot_id)
    if not slot or slot.driver_id != user.id:
        raise HTTPException(status_code=404, detail="Slot not found")
    db.delete(slot)
    db.commit()


def list_blocks(db: Session, driver_id: str) -> list:
    return db.query(AvailabilityBlock).filter(AvailabilityBlock.driver_id == driver_id).all()


def add_block(db: Session, user: User, block_start: date, block_end: date, reason: str | None) -> AvailabilityBlock:
    _require_supplier(user)
    block = AvailabilityBlock(
        driver_id=user.id,
        block_start=block_start,
        block_end=block_end,
        reason=reason,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


def delete_block(db: Session, block_id: str, user: User) -> None:
    block = db.get(AvailabilityBlock, block_id)
    if not block or block.driver_id != user.id:
        raise HTTPException(status_code=404, detail="Block not found")
    db.delete(block)
    db.commit()


def is_available_on(db: Session, driver_id: str, check_date: date) -> bool:
    """Return False if the driver has a block covering check_date."""
    block = db.query(AvailabilityBlock).filter(
        AvailabilityBlock.driver_id == driver_id,
        AvailabilityBlock.block_start <= check_date,
        AvailabilityBlock.block_end >= check_date,
    ).first()
    return block is None
