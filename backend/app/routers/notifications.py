from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, Role
from app.services.notifications import create_notification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class SendNotificationRequest(BaseModel):
    user_id: str
    type: str
    title: str
    body: str
    data: Optional[dict] = None
    push: bool = True


@router.post("/send", status_code=201)
async def admin_send_notification(
    body: SendNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(Role.ADMIN)),
):
    """Admin: send a push/in-app notification to any user."""
    from app.models.user import User as UserModel
    target = db.get(UserModel, body.user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    notif = await create_notification(
        db,
        body.user_id,
        body.type,
        body.title,
        body.body,
        data=body.data,
        push=body.push,
    )
    db.commit()
    return {"notification_id": notif.id, "detail": "Notification sent"}
