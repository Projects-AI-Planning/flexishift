from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional, Any, Dict

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.notification import Notification
from app.models.user import User, Role
from app.services.notifications import create_notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class SendNotificationRequest(BaseModel):
    user_id: str = Field(..., alias="userId")
    type: str
    title: str
    body: str
    data: Optional[dict] = None
    push: bool = True
    model_config = {"populate_by_name": True}


class UpdateFCMTokenRequest(BaseModel):
    fcm_token: str = Field(..., alias="fcmToken")
    device_type: Optional[str] = Field(None, alias="deviceType")
    device_id: Optional[str] = Field(None, alias="deviceId")
    model_config = {"populate_by_name": True}


class NotificationPrefsRequest(BaseModel):
    push_notifications: Optional[Dict[str, Any]] = Field(None, alias="pushNotifications")
    email_notifications: Optional[Dict[str, Any]] = Field(None, alias="emailNotifications")
    sms_notifications: Optional[Dict[str, Any]] = Field(None, alias="smsNotifications")
    model_config = {"populate_by_name": True}


def _notif_dict(n: Notification) -> dict:
    return {
        "notificationId": n.id,
        "type": n.type,
        "title": n.title,
        "message": n.body,
        "isRead": bool(n.read_at),
        "data": n.data,
        "createdAt": n.created_at.isoformat() if n.created_at else None,
    }


# ── User endpoints ─────────────────────────────────────────────────────────────

@router.get("/list")
def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if type:
        q = q.filter(Notification.type == type)
    total = q.count()
    unread = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.read_at.is_(None),
    ).scalar() or 0
    items = q.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return ok(
        data={
            "notifications": [_notif_dict(n) for n in items],
            "totalNotifications": total,
            "unreadCount": unread,
            "page": page,
            "limit": limit,
        },
        message="Notifications fetched successfully.",
    )


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read_at.is_(None),
    )
    total = base.count()

    breakdown = {}
    for notif_type in ["job_update", "payment", "compliance", "system"]:
        breakdown[notif_type] = base.filter(Notification.type == notif_type).count()

    return ok(
        data={"unreadCount": total, "breakdown": breakdown},
        message="Unread count fetched successfully.",
    )


@router.put("/mark-read/{notification_id}")
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.get(Notification, notification_id)
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    now = datetime.now(timezone.utc)
    if not notif.read_at:
        notif.read_at = now
        db.commit()
    return ok(
        data={
            "notificationId": notif.id,
            "isRead": True,
            "readAt": notif.read_at.isoformat() if notif.read_at else None,
        },
        message="Notification marked as read.",
    )


@router.put("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read_at.is_(None))
        .update({"read_at": now})
    )
    db.commit()
    return ok(
        data={"totalMarked": count, "markedAt": now.isoformat()},
        message="All notifications marked as read.",
    )


@router.delete("/delete/{notification_id}")
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.get(Notification, notification_id)
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notif)
    db.commit()
    return ok(
        data={
            "notificationId": notification_id,
            "deletedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="Notification deleted successfully.",
    )


@router.get("/preferences")
def get_preferences(current_user: User = Depends(get_current_user)):
    return ok(
        data={
            "userId": current_user.id,
            "preferences": {
                "pushNotifications": {
                    "enabled": bool(current_user.push_token),
                    "job_updates": True,
                    "payment_updates": True,
                    "compliance_alerts": True,
                    "new_job_matches": True,
                    "system_alerts": False,
                },
                "emailNotifications": {
                    "enabled": True,
                    "job_updates": True,
                    "payment_updates": True,
                    "invoices": True,
                    "marketing": False,
                },
                "smsNotifications": {
                    "enabled": True,
                    "job_updates": True,
                    "payment_updates": False,
                },
            },
        },
        message="Notification preferences fetched successfully.",
    )


@router.put("/preferences/update")
def update_preferences(
    body: NotificationPrefsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    push = body.push_notifications or {}
    if push.get("enabled") is False:
        current_user.push_token = None
        db.commit()
    return ok(
        data={
            "userId": current_user.id,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="Notification preferences updated successfully.",
    )


@router.post("/fcm-token/register")
def register_fcm_token(
    body: UpdateFCMTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.push_token = body.fcm_token
    db.commit()
    return ok(
        data={
            "userId": current_user.id,
            "deviceId": body.device_id,
            "deviceType": body.device_type,
            "registeredAt": datetime.now(timezone.utc).isoformat(),
        },
        message="FCM token registered successfully.",
    )


# ── Admin send ─────────────────────────────────────────────────────────────────

@router.post("/send", status_code=201)
async def admin_send_notification(
    body: SendNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    target = db.get(User, body.user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")
    notif = await create_notification(
        db, body.user_id, body.type, body.title, body.body,
        data=body.data, push=body.push,
    )
    db.commit()
    return created(data={"notificationId": notif.id}, message="Notification sent")
