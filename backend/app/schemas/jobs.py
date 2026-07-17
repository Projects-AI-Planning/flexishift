from __future__ import annotations
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


class JobCreateRequest(BaseModel):
    pickup_address: str = Field(..., alias="pickupAddress")
    pickup_lat: Optional[float] = Field(None, alias="pickupLat")
    pickup_lng: Optional[float] = Field(None, alias="pickupLng")
    drop_address: str = Field(..., alias="dropAddress")
    drop_lat: Optional[float] = Field(None, alias="dropLat")
    drop_lng: Optional[float] = Field(None, alias="dropLng")
    goods_type: str = Field(..., alias="goodsType")
    weight_kg: float = Field(..., alias="weightKg")
    vehicle_type: str = Field(..., alias="vehicleType")
    job_date: date = Field(..., alias="jobDate")
    time_slot: str = Field(..., alias="timeSlot")
    driver_requirement: Optional[str] = Field("DRIVER_WITH_TRUCK", alias="driverRequirement")

    model_config = {"populate_by_name": True}


class JobOut(BaseModel):
    jobId: str = Field(..., alias="id")
    haulierId: str = Field(..., alias="haulier_id")
    jobRef: str = Field(..., alias="job_ref")
    loadCode: str = Field(..., alias="load_code")
    pickupAddress: str = Field(..., alias="pickup_address")
    pickupLat: float = Field(..., alias="pickup_lat")
    pickupLng: float = Field(..., alias="pickup_lng")
    dropAddress: str = Field(..., alias="drop_address")
    dropLat: float = Field(..., alias="drop_lat")
    dropLng: float = Field(..., alias="drop_lng")
    goodsType: str = Field(..., alias="goods_type")
    weightKg: float = Field(..., alias="weight_kg")
    vehicleType: str = Field(..., alias="vehicle_type")
    jobDate: date = Field(..., alias="job_date")
    timeSlot: str = Field(..., alias="time_slot")
    driverRequirement: Optional[str] = Field(None, alias="driver_requirement")
    distanceKm: Optional[float] = Field(None, alias="distance_km")
    durationMin: Optional[int] = Field(None, alias="duration_min")
    status: str
    selectedSupplierId: Optional[str] = Field(None, alias="selected_supplier_id")
    originalEta: Optional[datetime] = Field(None, alias="original_eta")
    invoiceUrl: Optional[str] = Field(None, alias="invoice_url")
    createdAt: datetime = Field(..., alias="created_at")
    updatedAt: datetime = Field(..., alias="updated_at")

    model_config = {"from_attributes": True, "populate_by_name": True}


class JobUpdateRequest(BaseModel):
    pickup_address: Optional[str] = Field(None, alias="pickupAddress")
    pickup_lat: Optional[float] = Field(None, alias="pickupLat")
    pickup_lng: Optional[float] = Field(None, alias="pickupLng")
    drop_address: Optional[str] = Field(None, alias="dropAddress")
    drop_lat: Optional[float] = Field(None, alias="dropLat")
    drop_lng: Optional[float] = Field(None, alias="dropLng")
    goods_type: Optional[str] = Field(None, alias="goodsType")
    weight_kg: Optional[float] = Field(None, alias="weightKg")
    vehicle_type: Optional[str] = Field(None, alias="vehicleType")
    job_date: Optional[date] = Field(None, alias="jobDate")
    time_slot: Optional[str] = Field(None, alias="timeSlot")
    driver_requirement: Optional[str] = Field(None, alias="driverRequirement")

    model_config = {"populate_by_name": True}


class JobListOut(BaseModel):
    items: List[JobOut]
    total: int
    page: int
    per_page: int
