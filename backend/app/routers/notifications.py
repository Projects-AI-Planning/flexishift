from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.notification import Notification
from app.models.user import User, Role
from app.schemas.notifications import NotificationListOut, NotificationOut
from app.services.notifications import create_notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class SendNotificationRequest(BaseModel):
    user_id: str
    type: str
    title: str
    body: str
    data: Optional[dict] = None
    push: bool = True


class UpdateFCMTokenRequest(BaseModel):
    fcm_token: str


class NotificationPrefsRequest(BaseModel):
    push_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None


# ── User endpoints ─────────────────────────────────────────────────────────────

@router.get("/list", response_model=NotificationListOut)
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
    return {"items": items, "total": total, "unread_count": unread}


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
    return {"unread_count": count}


@router.put("/mark-read/{notification_id}", response_model=NotificationOut)
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
    return notif


@router.put("/mark-all-read", status_code=204)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.notifications import mark_all_read as svc_mark_all
    svc_mark_all(db, current_user.id)
    db.commit()


@router.delete("/delete/{notification_id}", status_code=204)
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


@router.get("/preferences")
def get_preferences(current_user: User = Depends(get_current_user)):
    return {
        "push_enabled": bool(current_user.push_token),
        "push_token_registered": bool(current_user.push_token),
        "email_enabled": True,
        "email": current_user.email,
    }


@router.put("/preferences/update")
def update_preferences(
    body: NotificationPrefsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.push_enabled is False:
        current_user.push_token = None
    db.commit()
    return {"updated": True, "push_enabled": bool(current_user.push_token)}


@router.post("/fcm-token/register", status_code=204)
def register_fcm_token(
    body: UpdateFCMTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.push_token = body.fcm_token
    db.commit()


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
    return {"notification_id": notif.id, "detail": "Notification sent"}
