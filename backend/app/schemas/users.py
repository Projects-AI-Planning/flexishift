from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserProfileOut(BaseModel):
    photoUrl: Optional[str] = Field(None, alias="photo_url")
    licenceNumber: Optional[str] = Field(None, alias="licence_number")
    vehicleType: Optional[str] = Field(None, alias="vehicle_type")
    vehicleRegistration: Optional[str] = Field(None, alias="vehicle_registration")
    companyName: Optional[str] = Field(None, alias="company_name")
    companyAddress: Optional[str] = Field(None, alias="company_address")
    coverageArea: Optional[str] = Field(None, alias="coverage_area")
    driverAvailability: Optional[str] = Field(None, alias="driver_availability")
    equipmentDetails: Optional[list[dict]] = Field(None, alias="equipment_details")
    driverAssignments: Optional[list[dict]] = Field(None, alias="driver_assignments")

    model_config = {"from_attributes": True, "populate_by_name": True}


class UserOut(BaseModel):
    userId: str = Field(..., alias="id")
    name: str = Field(..., alias="full_name")
    email: str
    phone: str
    role: str
    status: str
    profileComplete: bool = Field(..., alias="profile_complete")
    isVerified: bool = Field(..., alias="verified")
    avgRating: float = Field(..., alias="avg_rating")
    completedJobs: int = Field(..., alias="completed_jobs")
    locationLat: Optional[float] = Field(None, alias="location_lat")
    locationLng: Optional[float] = Field(None, alias="location_lng")
    createdAt: datetime = Field(..., alias="created_at")
    profile: Optional[UserProfileOut] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, alias="name")
    full_name: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = Field(None, alias="photoUrl")
    licence_number: Optional[str] = Field(None, alias="licenceNumber")
    vehicle_type: Optional[str] = Field(None, alias="vehicleType")
    vehicle_registration: Optional[str] = Field(None, alias="vehicleRegistration")
    company_name: Optional[str] = Field(None, alias="companyName")
    company_address: Optional[str] = Field(None, alias="companyAddress")
    coverage_area: Optional[str] = Field(None, alias="coverageArea")
    driver_availability: Optional[str] = Field(None, alias="driverAvailability")
    equipment_details: Optional[list[dict]] = Field(None, alias="equipmentDetails")
    driver_assignments: Optional[list[dict]] = Field(None, alias="driverAssignments")
    bank_account_id: Optional[str] = Field(None, alias="bankAccountId")
    push_token: Optional[str] = Field(None, alias="pushToken")

    model_config = {"populate_by_name": True}

    def get_full_name(self) -> Optional[str]:
        return self.name or self.full_name


class UpdateLocationRequest(BaseModel):
    lat: float
    lng: float


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., alias="currentPassword")
    new_password: str = Field(..., alias="newPassword")

    model_config = {"populate_by_name": True}
