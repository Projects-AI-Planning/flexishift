from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.schemas.users import UserOut


class QuoteCreateRequest(BaseModel):
    price: float


class QuoteOut(BaseModel):
    id: str
    job_id: str
    supplier_id: str
    price: float
    currency: str
    status: str
    created_at: datetime
    supplier: Optional[UserOut] = None

    model_config = {"from_attributes": True}


class QuoteListOut(BaseModel):
    items: List[QuoteOut]
    total: int
