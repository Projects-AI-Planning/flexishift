from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PaymentOrderOut(BaseModel):
    payment_id: str
    gateway_order_id: str
    amount: float
    currency: str
    key_id: str


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentOut(BaseModel):
    id: str
    job_id: str
    gateway_order_id: str
    gateway_payment_id: Optional[str] = None
    gateway_payout_id: Optional[str] = None
    amount: float
    currency: str
    status: str
    escrowed_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
