from __future__ import annotations
from datetime import datetime
from typing import List
from pydantic import BaseModel


class TrackingPointIn(BaseModel):
    lat: float
    lng: float
    recorded_at: datetime


class TrackingPointOut(BaseModel):
    id: str
    job_id: str
    lat: float
    lng: float
    recorded_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class TrackingListOut(BaseModel):
    items: List[TrackingPointOut]
    total: int
