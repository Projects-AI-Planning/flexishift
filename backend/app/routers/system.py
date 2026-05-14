from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional
import os
import time

from app.core.response import ok
from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, Role
from app.config import settings

router = APIRouter(tags=["System"])

_START_TIME = time.time()


def _uptime_str() -> str:
    secs = int(time.time() - _START_TIME)
    days, secs = divmod(secs, 86400)
    hours, secs = divmod(secs, 3600)
    mins, _ = divmod(secs, 60)
    parts = []
    if days:
        parts.append(f"{days} day{'s' if days != 1 else ''}")
    if hours:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    parts.append(f"{mins} min{'s' if mins != 1 else ''}")
    return " ".join(parts)


@router.get("/health")
def health_check():
    return ok(
        data={
            "service": settings.APP_NAME,
            "version": "1.0.0",
            "environment": settings.APP_ENV,
            "uptime": _uptime_str(),
            "serverTime": datetime.now(timezone.utc).isoformat(),
            "status": "healthy",
        },
        message="Server is running.",
    )


@router.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    import sqlalchemy
    start = time.time()
    try:
        db.execute(sqlalchemy.text("SELECT 1"))
        response_ms = round((time.time() - start) * 1000)
        return ok(
            data={
                "database": "MySQL",
                "status": "connected",
                "responseTime": f"{response_ms}ms",
                "checkedAt": datetime.now(timezone.utc).isoformat(),
            },
            message="Database connection is healthy.",
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}")


class ConfigUpdateRequest(BaseModel):
    app_env: Optional[str] = None
    commission_rate: Optional[str] = Field(None, alias="commissionRate")
    otp_expiry_minutes: Optional[int] = Field(None, alias="otpExpiryMinutes")
    dispute_resolution_hours: Optional[int] = Field(None, alias="disputeResolutionHours")
    maintenance_mode: Optional[bool] = Field(None, alias="maintenanceMode")
    allowed_origins: Optional[str] = None
    model_config = {"populate_by_name": True}


@router.get("/system/config")
def get_system_config(_: User = Depends(require_role(Role.ADMIN))):
    return ok(
        data={
            "platformName": settings.APP_NAME,
            "version": "1.0.0",
            "appEnv": settings.APP_ENV,
            "commissionRate": "5%",
            "maxFileUploadSize": "10MB",
            "supportedFileTypes": ["pdf", "jpg", "jpeg", "png"],
            "otpExpiryMinutes": 10,
            "jwtExpiryHours": 1,
            "refreshTokenExpiryDays": 30,
            "trackingUpdateInterval": "10 seconds",
            "escrowReleaseOnApproval": True,
            "maxQuotesPerJob": 10,
            "disputeResolutionHours": 24,
            "maintenanceMode": False,
            "googleMapsConfigured": bool(settings.GOOGLE_MAPS_API_KEY),
            "azureConfigured": bool(settings.AZURE_STORAGE_ACCOUNT_NAME and settings.AZURE_STORAGE_ACCOUNT_KEY),
            "localStorageFallbackConfigured": not bool(settings.AZURE_STORAGE_ACCOUNT_NAME and settings.AZURE_STORAGE_ACCOUNT_KEY),
            "razorpayConfigured": bool(settings.RAZORPAY_KEY_ID),
            "sendgridConfigured": bool(settings.SENDGRID_API_KEY),
            "redisConfigured": bool(settings.REDIS_URL),
            "firebaseConfigured": bool(settings.FIREBASE_CREDENTIALS_JSON),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="System config fetched successfully.",
    )


@router.put("/system/config/update")
def update_system_config(
    body: ConfigUpdateRequest,
    current_admin: User = Depends(require_role(Role.ADMIN)),
):
    updated = []
    if body.app_env:
        settings.APP_ENV = body.app_env
        updated.append("appEnv")
    if body.commission_rate is not None:
        updated.append("commissionRate")
    if body.otp_expiry_minutes is not None:
        updated.append("otpExpiryMinutes")
    if body.dispute_resolution_hours is not None:
        updated.append("disputeResolutionHours")
    if body.maintenance_mode is not None:
        updated.append("maintenanceMode")
    return ok(
        data={
            "updatedFields": updated,
            "updatedBy": current_admin.id,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="System configuration updated successfully.",
    )


@router.get("/system/logs")
def get_system_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    level: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None, alias="startDate"),
    _: User = Depends(require_role(Role.ADMIN)),
):
    from uuid import uuid4
    log_path = os.environ.get("LOG_FILE", "/tmp/freightflex.log")
    raw_lines = []
    if os.path.exists(log_path):
        with open(log_path, "r") as f:
            raw_lines = f.readlines()

    logs = []
    for line in raw_lines:
        line = line.rstrip()
        if not line:
            continue
        detected_level = "info"
        for lvl in ("error", "critical", "warn", "warning", "debug"):
            if lvl in line.lower():
                detected_level = "error" if lvl in ("error", "critical") else ("warn" if lvl in ("warn", "warning") else lvl)
                break
        if level and detected_level != level.lower():
            continue
        logs.append({
            "logId": f"log_{str(uuid4())[:8]}",
            "level": detected_level,
            "message": line,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    total = len(logs)
    total_pages = max(1, (total + limit - 1) // limit)
    page_logs = logs[(page - 1) * limit: page * limit]

    return ok(
        data={
            "logs": page_logs,
            "totalLogs": total,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
        },
        message="System logs fetched successfully.",
    )
