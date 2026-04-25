from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserStatus
from app.models.notification import Notification
from app.schemas.users import UserOut, UpdateProfileRequest, UpdateLocationRequest, ChangePasswordRequest
from app.schemas.notifications import NotificationListOut, NotificationOut
from app.core.security import verify_password, hash_password

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updates = body.model_dump(exclude_none=True)

    profile_fields = {"photo_url", "licence_number", "vehicle_type", "vehicle_registration",
                      "company_name", "company_address", "coverage_area"}

    profile_updates = {k: v for k, v in updates.items() if k in profile_fields}
    user_updates = {k: v for k, v in updates.items() if k not in profile_fields}

    for k, v in user_updates.items():
        setattr(current_user, k, v)

    if profile_updates and current_user.profile:
        for k, v in profile_updates.items():
            setattr(current_user.profile, k, v)

    _check_profile_complete(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


def _check_profile_complete(user: User) -> None:
    from app.models.user import Role
    p = user.profile
    if not p:
        return
    if user.role == Role.DRIVER:
        if p.licence_number and p.vehicle_type and p.vehicle_registration:
            user.profile_complete = True
    elif user.role in (Role.HAULIER, Role.FIRM):
        if p.company_name and p.company_address:
            user.profile_complete = True


@router.patch("/me/location", status_code=204)
def update_location(
    body: UpdateLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.location_lat = body.lat
    current_user.location_lng = body.lng
    db.commit()


@router.post("/me/change-password", status_code=204)
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()


@router.delete("/me", status_code=204)
def delete_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.deleted_at = datetime.now(timezone.utc)
    current_user.status = UserStatus.SUSPENDED
    db.commit()


@router.get("/me/notifications", response_model=NotificationListOut)
def get_notifications(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    total = q.count()
    unread = q.filter(Notification.read_at.is_(None)).count()
    items = q.order_by(Notification.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "unread_count": unread}


@router.patch("/me/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
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


@router.post("/me/notifications/read-all", status_code=204)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.notifications import mark_all_read as svc_mark_all
    svc_mark_all(db, current_user.id)
    db.commit()
