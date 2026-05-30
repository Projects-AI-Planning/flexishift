"""
Audit service — write an audit_event to both:
  • the audit_logs DB table (queryable, filterable)
  • logs/audit.log (via structlog with event='audit_event')

Usage
-----
from app.services.audit import log_audit

log_audit(
    db,
    action="LOGIN",
    user_id=user.id,
    entity_type="user",
    entity_id=user.id,
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent"),
    endpoint=str(request.url.path),
    method=request.method,
)
"""

from __future__ import annotations

from typing import Any

import structlog
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog, UserDevice

log = structlog.get_logger()


def log_audit(
    db: Session,
    *,
    action: str,
    user_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    old_value: dict | None = None,
    new_value: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    endpoint: str | None = None,
    method: str | None = None,
    status_code: int | None = None,
    extra: dict[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
        user_agent=user_agent,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        extra=extra,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Write to audit.log (the _AuditFilter in logging_config lets this through)
    log.info(
        "audit_event",
        audit_id=entry.id,
        action=action,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_address,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        extra=extra,
    )
    return entry


def upsert_device(
    db: Session,
    *,
    user_id: str,
    device_id: str | None = None,
    app_type: str | None = None,
    app_version: str | None = None,
    os_name: str | None = None,
    os_version: str | None = None,
    device_model: str | None = None,
    device_brand: str | None = None,
    ip_address: str | None = None,
    mac_address: str | None = None,
    push_token: str | None = None,
    user_agent: str | None = None,
) -> UserDevice:
    """Insert or update the device record for this user+device_id pair."""
    existing: UserDevice | None = None
    if device_id:
        existing = (
            db.query(UserDevice)
            .filter(UserDevice.user_id == user_id, UserDevice.device_id == device_id)
            .first()
        )

    if existing:
        if app_type:        existing.app_type     = app_type
        if app_version:     existing.app_version  = app_version
        if os_name:         existing.os_name      = os_name
        if os_version:      existing.os_version   = os_version
        if device_model:    existing.device_model = device_model
        if device_brand:    existing.device_brand = device_brand
        if ip_address:      existing.ip_address   = ip_address
        if mac_address:     existing.mac_address  = mac_address
        if push_token:      existing.push_token   = push_token
        if user_agent:      existing.user_agent   = user_agent
        db.commit()
        return existing

    device = UserDevice(
        user_id=user_id,
        device_id=device_id,
        app_type=app_type,
        app_version=app_version,
        os_name=os_name,
        os_version=os_version,
        device_model=device_model,
        device_brand=device_brand,
        ip_address=ip_address,
        mac_address=mac_address,
        push_token=push_token,
        user_agent=user_agent,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device
