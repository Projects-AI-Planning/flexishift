from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

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
    model_config = {"populate_by_name": True}


class NotificationPrefsRequest(BaseModel):
    push_enabled: Optional[bool] = Field(None, alias="pushEnabled")
    email_enabled: Optional[bool] = Field(None, alias="emailEnabled")
    model_config = {"populate_by_name": True}


def _notif_dict(n: Notification) -> dict:
    return {
        "notificationId": n.id,
        "userId": n.user_id,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "data": n.data,
        "isRead": bool(n.read_at),
        "readAt": n.read_at.isoformat() if n.read_at else None,
        "createdAt": n.created_at.isoformat() if n.created_at else None,
    }


# ── User endpoints ─────────────────────────────────────────────────────────────

@router.get("/list")
def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    total = q.count()
    unread = q.filter(Notification.read_at.is_(None)).count()
    items = q.order_by(Notification.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return ok(
        data={"items": [_notif_dict(n) for n in items], "total": total, "unreadCount": unread},
        message="Notifications retrieved",
    )


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read_at.is_(None))
        .count()
    )
    return ok(data={"unreadCount": count}, message="Unread count retrieved")


@router.put("/mark-read/{notification_id}")
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.get(Notification, notification_id)
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    if not notif.read_at:
        notif.read_at = datetime.now(timezone.utc)
        db.commit()
    return ok(data=_notif_dict(notif), message="Notification marked as read")


@router.put("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.notifications import mark_all_read as svc_mark_all
    count = svc_mark_all(db, current_user.id)
    db.commit()
    return ok(data={"markedCount": count}, message="All notifications marked as read")


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
    return ok(data=None, message="Notification deleted")


@router.get("/preferences")
def get_preferences(current_user: User = Depends(get_current_user)):
    return ok(
        data={
            "pushEnabled": bool(current_user.push_token),
            "pushTokenRegistered": bool(current_user.push_token),
            "emailEnabled": True,
            "email": current_user.email,
        },
        message="Preferences retrieved",
    )


@router.put("/preferences/update")
def update_preferences(
    body: NotificationPrefsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.push_enabled is False:
        current_user.push_token = None
    db.commit()
    return ok(
        data={"pushEnabled": bool(current_user.push_token)},
        message="Preferences updated",
    )


@router.post("/fcm-token/register")
def register_fcm_token(
    body: UpdateFCMTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.push_token = body.fcm_token
    db.commit()
    return ok(data=None, message="FCM token registered")


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
