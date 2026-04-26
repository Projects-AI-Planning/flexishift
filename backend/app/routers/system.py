from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import structlog

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, Role
from app.config import settings

router = APIRouter(tags=["System"])

log = structlog.get_logger()
_log_buffer: list[str] = []


@router.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}")


class ConfigUpdateRequest(BaseModel):
    app_env: Optional[str] = None
    allowed_origins: Optional[str] = None


@router.get("/system/config")
def get_system_config(_: User = Depends(require_role(Role.ADMIN))):
    return {
        "app_name": settings.APP_NAME,
        "app_env": settings.APP_ENV,
        "google_maps_configured": bool(settings.GOOGLE_MAPS_API_KEY),
        "aws_configured": bool(settings.AWS_ACCESS_KEY_ID),
        "razorpay_configured": bool(settings.RAZORPAY_KEY_ID),
        "sendgrid_configured": bool(settings.SENDGRID_API_KEY),
        "redis_configured": bool(settings.REDIS_URL),
        "celery_configured": bool(settings.CELERY_BROKER_URL),
        "firebase_configured": bool(settings.FIREBASE_CREDENTIALS_JSON),
    }


@router.put("/system/config/update")
def update_system_config(
    body: ConfigUpdateRequest,
    _: User = Depends(require_role(Role.ADMIN)),
):
    updated = []
    if body.app_env:
        settings.APP_ENV = body.app_env
        updated.append("app_env")
    return {"updated": updated, "message": "Runtime config updated (restart for full effect)"}


@router.get("/system/logs")
def get_system_logs(
    limit: int = 100,
    _: User = Depends(require_role(Role.ADMIN)),
):
    import os
    log_path = os.environ.get("LOG_FILE", "/tmp/freightflex.log")
    lines = []
    if os.path.exists(log_path):
        with open(log_path, "r") as f:
            lines = f.readlines()[-limit:]
    return {
        "log_file": log_path,
        "lines": [l.rstrip() for l in lines],
        "total_shown": len(lines),
    }
