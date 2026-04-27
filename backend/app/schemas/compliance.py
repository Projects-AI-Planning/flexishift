from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class LoadCodeRequest(BaseModel):
    load_code: str


class Step1Request(BaseModel):
    checklist_data: Dict[str, Any]
    condition_photo_urls: List[str]
    driver_signature_url: str
    haulier_signature_url: str


class Step2Request(BaseModel):
    delivery_photo_url: str
    recipient_signature_url: str
    delivery_notes: Optional[str] = None


class DisputeRequest(BaseModel):
    dispute_reason: str


class ComplianceOut(BaseModel):
    id: str
    job_id: str
    load_code_verified_at: Optional[datetime] = None
    step1_completed_at: Optional[datetime] = None
    checklist_data: Optional[Dict[str, Any]] = None
    condition_photo_urls: Optional[List[str]] = None
    driver_signature_url: Optional[str] = None
    driver_signed_at: Optional[datetime] = None
    haulier_signature_url: Optional[str] = None
    haulier_signed_at: Optional[datetime] = None
    step2_completed_at: Optional[datetime] = None
    delivery_photo_url: Optional[str] = None
    recipient_signature_url: Optional[str] = None
    delivery_notes: Optional[str] = None
    delivery_submitted_at: Optional[datetime] = None
    step3_approved_at: Optional[datetime] = None
    dispute_reason: Optional[str] = None
    disputed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
