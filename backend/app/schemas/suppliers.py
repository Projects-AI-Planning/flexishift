from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel

from app.schemas.users import UserOut


class SupplierSearchParams(BaseModel):
    lat: float
    lng: float
    radius_km: float = 50.0
    vehicle_type: Optional[str] = None
    job_date: Optional[str] = None


class SupplierOut(UserOut):
    distance_km: Optional[float] = None


class SupplierListOut(BaseModel):
    items: List[SupplierOut]
    total: int
