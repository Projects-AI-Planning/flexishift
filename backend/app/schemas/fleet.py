from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class FleetEquipmentCreateRequest(BaseModel):
    name: str = Field(..., alias="name")
    category: str = Field(..., alias="category")
    serial_number: Optional[str] = Field(None, alias="serialNumber")
    status: str = Field("AVAILABLE", alias="status")
    assigned_vehicle: Optional[str] = Field(None, alias="assignedVehicle")
    last_service_date: Optional[date] = Field(None, alias="lastServiceDate")
    notes: Optional[str] = Field(None, alias="notes")

    model_config = {"populate_by_name": True}


class FleetEquipmentUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, alias="name")
    category: Optional[str] = Field(None, alias="category")
    serial_number: Optional[str] = Field(None, alias="serialNumber")
    status: Optional[str] = Field(None, alias="status")
    assigned_vehicle: Optional[str] = Field(None, alias="assignedVehicle")
    last_service_date: Optional[date] = Field(None, alias="lastServiceDate")
    notes: Optional[str] = Field(None, alias="notes")

    model_config = {"populate_by_name": True}


class FleetEquipmentOut(BaseModel):
    equipmentId: str = Field(..., alias="equipment_id")
    name: str
    category: str
    serialNumber: Optional[str] = Field(None, alias="serial_number")
    status: str
    assignedVehicle: Optional[str] = Field(None, alias="assigned_vehicle")
    lastServiceDate: Optional[date] = Field(None, alias="last_service_date")
    notes: Optional[str] = None
    createdAt: datetime = Field(..., alias="created_at")
    updatedAt: datetime = Field(..., alias="updated_at")

    model_config = {"from_attributes": True, "populate_by_name": True}
