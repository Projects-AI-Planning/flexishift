from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import Role, User
from app.schemas.fleet import (
    FleetEquipmentCreateRequest,
    FleetEquipmentUpdateRequest,
)

router = APIRouter(prefix="/fleet", tags=["Fleet"])


def _require_profile(current_user: User):
    if not current_user.profile:
        raise HTTPException(status_code=404, detail="Fleet profile not found")
    return current_user.profile


def _equipment_items(current_user: User) -> list[dict]:
    profile = _require_profile(current_user)
    return list(profile.equipment_details or [])


def _save_items(db: Session, current_user: User, items: list[dict]) -> None:
    profile = _require_profile(current_user)
    profile.equipment_details = items
    db.commit()


@router.get("/equipment")
def list_equipment(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    items = _equipment_items(current_user)
    return ok(
        data={
            "items": items,
            "total": len(items),
        },
        message="Equipment retrieved",
    )


@router.post("/equipment", status_code=201)
def add_equipment(
    body: FleetEquipmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    items = _equipment_items(current_user)
    now = datetime.now(timezone.utc)
    item = {
        "equipment_id": str(uuid4()),
        "name": body.name,
        "category": body.category,
        "serial_number": body.serial_number,
        "status": body.status,
        "assigned_vehicle": body.assigned_vehicle,
        "last_service_date": body.last_service_date.isoformat() if body.last_service_date else None,
        "notes": body.notes,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    items.append(item)
    _save_items(db, current_user, items)
    return created(data=item, message="Equipment added")


@router.put("/equipment/{equipment_id}")
def update_equipment(
    equipment_id: str,
    body: FleetEquipmentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    items = _equipment_items(current_user)
    updated = None
    for item in items:
        if item.get("equipment_id") == equipment_id:
            payload = body.model_dump(exclude_none=True, by_alias=False)
            if "last_service_date" in payload and payload["last_service_date"] is not None:
                payload["last_service_date"] = payload["last_service_date"].isoformat()
            item.update(payload)
            item["updated_at"] = datetime.now(timezone.utc).isoformat()
            updated = item
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Equipment not found")

    _save_items(db, current_user, items)
    return ok(data=updated, message="Equipment updated")


@router.delete("/equipment/{equipment_id}")
def delete_equipment(
    equipment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.FIRM)),
):
    items = _equipment_items(current_user)
    filtered = [item for item in items if item.get("equipment_id") != equipment_id]
    if len(filtered) == len(items):
        raise HTTPException(status_code=404, detail="Equipment not found")

    _save_items(db, current_user, filtered)
    return ok(data=None, message="Equipment deleted")
