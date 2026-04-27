from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.services import fcm


async def create_notification(
    db: Session,
    user_id: str,
    type: str,
    title: str,
    body: str,
    data: dict | None = None,
    push: bool = True,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        data=data,
    )
    db.add(notif)
    db.flush()

    if push:
        from app.models.user import User
        user = db.get(User, user_id)
        if user and user.push_token:
            await fcm.send_push(user.push_token, title, body, data)

    # Real-time push via WebSocket if user is connected
    try:
        from app.core.connection_manager import manager
        await manager.push_to_user(user_id, {
            "event": "notification",
            "id": notif.id,
            "type": type,
            "title": title,
            "body": body,
            "data": data,
        })
    except Exception:
        pass

    return notif


def mark_read(db: Session, notification_id: str, user_id: str) -> Notification | None:
    notif = db.get(Notification, notification_id)
    if not notif or notif.user_id != user_id:
        return None
    if not notif.read_at:
        notif.read_at = datetime.now(timezone.utc)
        db.flush()
    return notif


def mark_all_read(db: Session, user_id: str) -> int:
    from sqlalchemy import update
    result = db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(timezone.utc))
    )
    return result.rowcount
