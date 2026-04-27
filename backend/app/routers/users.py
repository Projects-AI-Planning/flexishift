from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.response import ok
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserStatus
from app.models.notification import Notification
from app.schemas.users import UpdateProfileRequest, UpdateLocationRequest, ChangePasswordRequest
from app.core.security import verify_password, hash_password

router = APIRouter(prefix="/users", tags=["Users"])


def _user_data(user: User) -> dict:
    profile = user.profile
    return {
        "userId": user.id,
        "name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value,
        "status": user.status.value,
        "profileComplete": user.profile_complete,
        "isVerified": user.verified,
        "avgRating": user.avg_rating,
        "completedJobs": user.completed_jobs,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "profile": {
            "photoUrl": profile.photo_url if profile else None,
            "licenceNumber": profile.licence_number if profile else None,
            "vehicleType": profile.vehicle_type if profile else None,
            "vehicleRegistration": profile.vehicle_registration if profile else None,
            "companyName": profile.company_name if profile else None,
            "companyAddress": profile.company_address if profile else None,
            "coverageArea": profile.coverage_area if profile else None,
        } if profile else None,
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return ok(data=_user_data(current_user), message="Profile retrieved")


@router.get("/{user_id}")
def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ok(data=_user_data(user), message="Profile retrieved")


@router.patch("/me")
def update_me(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updates = body.model_dump(exclude_none=True, by_alias=False)

    profile_fields = {"photo_url", "licence_number", "vehicle_type", "vehicle_registration",
                      "company_name", "company_address", "coverage_area"}

    profile_updates = {k: v for k, v in updates.items() if k in profile_fields}
    user_updates = {k: v for k, v in updates.items() if k not in profile_fields}

    if "name" in user_updates:
        user_updates["full_name"] = user_updates.pop("name")

    for k, v in user_updates.items():
        setattr(current_user, k, v)

    if profile_updates and current_user.profile:
        for k, v in profile_updates.items():
            setattr(current_user.profile, k, v)

    _check_profile_complete(current_user)
    db.commit()
    db.refresh(current_user)
    return ok(data=_user_data(current_user), message="Profile updated")


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


@router.patch("/me/location")
def update_location(
    body: UpdateLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.location_lat = body.lat
    current_user.location_lng = body.lng
    db.commit()
    return ok(data={"lat": body.lat, "lng": body.lng}, message="Location updated")


@router.post("/me/change-password")
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return ok(data=None, message="Password changed successfully")


@router.delete("/me")
def delete_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.deleted_at = datetime.now(timezone.utc)
    current_user.status = UserStatus.SUSPENDED
    db.commit()
    return ok(data=None, message="Account deactivated")


@router.get("/me/notifications")
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
    return ok(
        data={
            "items": [
                {
                    "notificationId": n.id,
                    "type": n.type,
                    "title": n.title,
                    "body": n.body,
                    "isRead": bool(n.read_at),
                    "createdAt": n.created_at.isoformat() if n.created_at else None,
                }
                for n in items
            ],
            "total": total,
            "unreadCount": unread,
        },
        message="Notifications retrieved",
    )


@router.patch("/me/notifications/{notification_id}/read")
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
    return ok(data={"notificationId": notification_id, "isRead": True}, message="Notification marked as read")


@router.post("/me/notifications/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.notifications import mark_all_read as svc_mark_all
    count = svc_mark_all(db, current_user.id)
    db.commit()
    return ok(data={"markedCount": count}, message="All notifications marked as read")
