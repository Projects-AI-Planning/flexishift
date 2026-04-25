from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class UpdateUserStatusRequest(BaseModel):
    status: str


class AdminStatsOut(BaseModel):
    total_users: int
    active_users: int
    total_jobs: int
    open_jobs: int
    completed_jobs: int
    total_revenue: float
    pending_documents: int
