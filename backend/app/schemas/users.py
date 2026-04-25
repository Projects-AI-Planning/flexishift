from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserProfileOut(BaseModel):
    photo_url: Optional[str] = None
    licence_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_registration: Optional[str] = None
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    coverage_area: Optional[str] = None

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone: str
    role: str
    status: str
    profile_complete: bool
    verified: bool
    avg_rating: float
    completed_jobs: int
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    created_at: datetime
    profile: Optional[UserProfileOut] = None

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    licence_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_registration: Optional[str] = None
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    coverage_area: Optional[str] = None
    bank_account_id: Optional[str] = None
    push_token: Optional[str] = None


class UpdateLocationRequest(BaseModel):
    lat: float
    lng: float


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
