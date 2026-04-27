from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, field_validator


class RatingCreateRequest(BaseModel):
    rated_id: str
    stars: int
    review_text: Optional[str] = None

    @field_validator("stars")
    @classmethod
    def stars_range(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Stars must be between 1 and 5")
        return v


class RatingOut(BaseModel):
    id: str
    job_id: str
    rater_id: str
    rated_id: str
    stars: int
    review_text: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RatingListOut(BaseModel):
    items: List[RatingOut]
    total: int
    avg_rating: float
