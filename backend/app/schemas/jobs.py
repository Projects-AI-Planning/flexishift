from __future__ import annotations
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel


class JobCreateRequest(BaseModel):
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    drop_address: str
    drop_lat: float
    drop_lng: float
    goods_type: str
    weight_kg: float
    vehicle_type: str
    job_date: date
    time_slot: str


class JobOut(BaseModel):
    id: str
    haulier_id: str
    job_ref: str
    load_code: str
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    drop_address: str
    drop_lat: float
    drop_lng: float
    goods_type: str
    weight_kg: float
    vehicle_type: str
    job_date: date
    time_slot: str
    distance_km: Optional[float] = None
    duration_min: Optional[int] = None
    status: str
    selected_supplier_id: Optional[str] = None
    original_eta: Optional[datetime] = None
    invoice_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobUpdateRequest(BaseModel):
    pickup_address: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    drop_address: Optional[str] = None
    drop_lat: Optional[float] = None
    drop_lng: Optional[float] = None
    goods_type: Optional[str] = None
    weight_kg: Optional[float] = None
    vehicle_type: Optional[str] = None
    job_date: Optional[date] = None
    time_slot: Optional[str] = None


class JobListOut(BaseModel):
    items: List[JobOut]
    total: int
    page: int
    per_page: int
