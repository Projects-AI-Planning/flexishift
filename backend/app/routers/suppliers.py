from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, Role, UserStatus
from app.services.suppliers import search_suppliers

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("")
def search(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(50.0),
    vehicle_type: str | None = Query(None),
    job_date: date | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.HAULIER, Role.ADMIN)),
):
    return search_suppliers(db, lat, lng, radius_km, vehicle_type, job_date, page, per_page)


@router.get("/{supplier_id}")
def get_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier = db.query(User).filter(
        User.id == supplier_id,
        User.role.in_([Role.DRIVER, Role.FIRM]),
        User.status == UserStatus.ACTIVE,
        User.deleted_at.is_(None),
    ).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier
