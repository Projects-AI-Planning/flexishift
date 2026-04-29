from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field


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
