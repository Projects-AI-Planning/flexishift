from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: str
    user_id: str
    doc_type: str
    file_url: str
    status: str
    reviewed_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentReviewRequest(BaseModel):
    status: str
    rejection_reason: Optional[str] = None


class DocumentListOut(BaseModel):
    items: List[DocumentOut]
    total: int
