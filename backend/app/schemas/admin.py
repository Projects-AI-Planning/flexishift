from __future__ import annotations
from typing import Optional, List
import re
from pydantic import BaseModel, Field, field_validator


class AdminCreateUserRequest(BaseModel):
    full_name: str = Field(..., alias="fullName")
    email: str
    phone: str
    password: str
    role: str
    status: Optional[str] = "ACTIVE"
    model_config = {"populate_by_name": True}


class UpdateUserStatusRequest(BaseModel):
    status: str


class AdminUpdateUserRequest(BaseModel):
    full_name: Optional[str] = Field(None, alias="fullName")
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    model_config = {"populate_by_name": True}


class AdminSetUserPasswordRequest(BaseModel):
    new_password: str = Field(..., alias="newPassword")
    model_config = {"populate_by_name": True}

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v.encode()) > 72:
            raise ValueError("Password must be 72 characters or fewer")
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain a digit")
        return v


class ApproveDocumentRequest(BaseModel):
    remarks: Optional[str] = None


class RejectDocumentRequest(BaseModel):
    rejection_reason: str = Field(..., alias="rejectionReason")
    model_config = {"populate_by_name": True}


class AdminStatsOut(BaseModel):
    total_users: int
    active_users: int
    total_jobs: int
    open_jobs: int
    completed_jobs: int
    total_revenue: float
    pending_documents: int


# EPIC 4: Payment & Invoices
class ProcessRefundRequest(BaseModel):
    refund_amount: float = Field(..., alias="refundAmount")
    reason: str
    refund_to: str = Field("original_payment_method", alias="refundTo")
    model_config = {"populate_by_name": True}


# EPIC 5: Compliance & Disputes
class ResolveDisputeRequest(BaseModel):
    resolution: str  # e.g., "partial_refund", "full_refund", "release_full_payment"
    refund_amount: float = Field(0, alias="refundAmount")
    release_amount: float = Field(0, alias="releaseAmount")
    admin_note: str = Field(..., alias="adminNote")
    notify_both_parties: bool = Field(True, alias="notifyBothParties")
    model_config = {"populate_by_name": True}


# EPIC 7: Admin Dashboard
class SuspendUserRequest(BaseModel):
    reason: str
    suspension_duration: str = Field(..., alias="suspensionDuration")
    notify_user: bool = Field(True, alias="notifyUser")
    model_config = {"populate_by_name": True}


class ActivateUserRequest(BaseModel):
    reason: str
    notify_user: bool = Field(True, alias="notifyUser")
    model_config = {"populate_by_name": True}


# EPIC 8: Ratings
class RemoveAbusiveReviewRequest(BaseModel):
    reason: str
    notify_reporter: bool = Field(True, alias="notifyReporter")
    notify_reviewer: bool = Field(True, alias="notifyReviewer")
    model_config = {"populate_by_name": True}


# System & Health
class SystemConfigUpdateRequest(BaseModel):
    commission_rate: Optional[str] = Field(None, alias="commissionRate")
    otp_expiry_minutes: Optional[int] = Field(None, alias="otpExpiryMinutes")
    jwt_expiry_hours: Optional[int] = Field(None, alias="jwtExpiryHours")
    dispute_resolution_hours: Optional[int] = Field(None, alias="disputeResolutionHours")
    max_file_upload_size: Optional[str] = Field(None, alias="maxFileUploadSize")
    tracking_update_interval: Optional[str] = Field(None, alias="trackingUpdateInterval")
    maintenance_mode: Optional[bool] = Field(None, alias="maintenanceMode")
    model_config = {"populate_by_name": True}
