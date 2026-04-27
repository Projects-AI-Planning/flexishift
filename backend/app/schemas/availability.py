from __future__ import annotations
from datetime import datetime, date, time
from typing import List, Optional
from pydantic import BaseModel, field_validator


class AvailabilitySlotIn(BaseModel):
    day_of_week: int  # 0=Mon … 6=Sun
    start_time: time
    end_time: time

    @field_validator("day_of_week")
    @classmethod
    def valid_day(cls, v: int) -> int:
        if not 0 <= v <= 6:
            raise ValueError("day_of_week must be 0 (Mon) to 6 (Sun)")
        return v


class AvailabilitySlotOut(BaseModel):
    id: str
    driver_id: str
    day_of_week: int
    start_time: time
    end_time: time
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AvailabilityBlockIn(BaseModel):
    block_start: date
    block_end: date
    reason: Optional[str] = None

    @field_validator("block_end")
    @classmethod
    def end_after_start(cls, v: date, info) -> date:
        start = info.data.get("block_start")
        if start and v < start:
            raise ValueError("block_end must be on or after block_start")
        return v


class AvailabilityBlockOut(BaseModel):
    id: str
    driver_id: str
    block_start: date
    block_end: date
    reason: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
