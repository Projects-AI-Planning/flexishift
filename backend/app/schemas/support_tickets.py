from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class SupportTicketUpdateRequest(BaseModel):
    status: str
    resolution_notes: Optional[str] = Field(None, alias="resolutionNotes")
    model_config = {"populate_by_name": True}


class SupportTicketCreateRequest(BaseModel):
    requester_name: str = Field(..., alias="requesterName")
    requester_email: str = Field(..., alias="requesterEmail")
    category: str
    priority: str = "MEDIUM"
    subject: str
    description: str
    user_id: Optional[str] = Field(None, alias="userId")
    model_config = {"populate_by_name": True}


class SupportTicketOut(BaseModel):
    ticket_id: str = Field(..., alias="ticketId")
    user_id: Optional[str] = Field(None, alias="userId")
    requester_name: str = Field(..., alias="requesterName")
    requester_email: str = Field(..., alias="requesterEmail")
    category: str
    priority: str
    subject: str
    description: str
    status: str
    resolution_notes: Optional[str] = Field(None, alias="resolutionNotes")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
    resolved_at: Optional[datetime] = Field(None, alias="resolvedAt")
    model_config = {"populate_by_name": True}


class SupportTicketListOut(BaseModel):
    items: List[SupportTicketOut]
    total: int
    page: int
    limit: int
