from __future__ import annotations
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


class ShiftCreateRequest(BaseModel):
    requirement_type:     str                   = Field(...,  alias="requirementType")
    start_date:           date                  = Field(...,  alias="startDate")
    end_date:             date                  = Field(...,  alias="endDate")
    hours_per_day:        int                   = Field(...,  alias="hoursPerDay")
    pickup_address:       Optional[str]         = Field(None, alias="pickupAddress")
    pickup_lat:           Optional[float]       = Field(None, alias="pickupLat")
    pickup_lng:           Optional[float]       = Field(None, alias="pickupLng")
    drop_address:         Optional[str]         = Field(None, alias="dropAddress")
    drop_lat:             Optional[float]       = Field(None, alias="dropLat")
    drop_lng:             Optional[float]       = Field(None, alias="dropLng")
    reporting_location:   Optional[str]         = Field(None, alias="reportingLocation")
    reporting_lat:        Optional[float]       = Field(None, alias="reportingLat")
    reporting_lng:        Optional[float]       = Field(None, alias="reportingLng")
    goods_type:           Optional[str]         = Field(None, alias="goodsType")
    total_capacity:       Optional[float]       = Field(None, alias="totalCapacity")
    compartments:         Optional[int]         = None
    compartment_details:  Optional[List[dict]]  = Field(None, alias="compartmentDetails")
    stops:                Optional[List[dict]]  = None
    access_code:          Optional[str]         = Field(None, alias="accessCode")
    load_code:            Optional[str]         = Field(None, alias="loadCode")
    job_time:             Optional[str]         = Field(None, alias="jobTime")
    special_instructions: Optional[str]         = Field(None, alias="specialInstructions")
    distance_km:          Optional[float]       = Field(None, alias="distanceKm")
    duration_min:         Optional[int]         = Field(None, alias="durationMin")
    notes:                Optional[str]         = None
    daily_rate:           Optional[float]       = Field(None, alias="dailyRate")

    model_config = {"populate_by_name": True}


class ShiftQuoteCreateRequest(BaseModel):
    amount_per_day: float = Field(..., alias="amountPerDay")
    notes: Optional[str] = None

    model_config = {"populate_by_name": True}


class ShiftQuoteOut(BaseModel):
    quoteId: str = Field(..., alias="id")
    shiftId: str = Field(..., alias="shift_id")
    driverId: str = Field(..., alias="driver_id")
    amountPerDay: float = Field(..., alias="amount_per_day")
    totalAmount: float = Field(..., alias="total_amount")
    status: str
    notes: Optional[str] = None
    driverName: Optional[str] = None
    createdAt: datetime = Field(..., alias="created_at")

    model_config = {"from_attributes": True, "populate_by_name": True}


class ShiftOut(BaseModel):
    shiftId: str = Field(..., alias="id")
    haulierId: str = Field(..., alias="haulier_id")
    shiftRef: str = Field(..., alias="shift_ref")
    requirementType: str = Field(..., alias="requirement_type")
    startDate: date = Field(..., alias="start_date")
    endDate: date = Field(..., alias="end_date")
    totalDays: int = Field(..., alias="total_days")
    hoursPerDay: int = Field(..., alias="hours_per_day")
    location: str
    notes: Optional[str] = None
    dailyRate: Optional[float] = Field(None, alias="daily_rate")
    status: str
    selectedDriverId: Optional[str] = Field(None, alias="selected_driver_id")
    daysCompleted: int = Field(..., alias="days_completed")
    createdAt: datetime = Field(..., alias="created_at")
    updatedAt: datetime = Field(..., alias="updated_at")

    model_config = {"from_attributes": True, "populate_by_name": True}
