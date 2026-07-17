from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class QuoteCreateRequest(BaseModel):
    price: float = Field(..., alias="quoteAmount")
    job_id: Optional[str] = Field(None, alias="jobId")

    model_config = {"populate_by_name": True}


class QuoteOut(BaseModel):
    quoteId: str = Field(..., alias="id")
    jobId: str = Field(..., alias="job_id")
    supplierId: str = Field(..., alias="supplier_id")
    quoteAmount: float = Field(..., alias="price")
    currency: str
    status: str
    createdAt: datetime = Field(..., alias="created_at")

    model_config = {"from_attributes": True, "populate_by_name": True}


class QuoteListOut(BaseModel):
    items: List[QuoteOut]
    total: int
