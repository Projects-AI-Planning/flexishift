from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserStatus
from app.schemas.users import UserOut, UpdateProfileRequest
from app.services import s3
from app.config import settings

router = APIRouter(prefix="/profile", tags=["Profile"])

_USER_FIELDS = {"full_name", "phone"}
_PROFILE_FIELDS = {
    "photo_url", "licence_number", "vehicle_type",
    "vehicle_registration", "company_name", "company_address", "coverage_area",
}


def _apply_updates(current_user: User, updates: dict, db: Session) -> None:
    profile_updates = {k: v for k, v in updates.items() if k in _PROFILE_FIELDS}
    user_updates = {k: v for k, v in updates.items() if k in _USER_FIELDS}
    for k, v in user_updates.items():
        setattr(current_user, k, v)
    if profile_updates and current_user.profile:
        for k, v in profile_updates.items():
            setattr(current_user.profile, k, v)
    _check_profile_complete(current_user)
    db.commit()
    db.refresh(current_user)


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


@router.get("/me", response_model=UserOut)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/{user_id}", response_model=UserOut)
def get_public_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/setup", response_model=UserOut)
def setup_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _apply_updates(current_user, body.model_dump(exclude_none=True), db)
    return current_user


@router.put("/update", response_model=UserOut)
def update_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _apply_updates(current_user, body.model_dump(exclude_none=True), db)
    return current_user


@router.post("/photo/upload")
def get_photo_upload_url(current_user: User = Depends(get_current_user)):
    key = f"photos/{current_user.id}/profile.jpg"
    result = s3.generate_presigned_upload(settings.AWS_S3_BUCKET_DOCS, key, "image/jpeg")
    return {**result, "field": "photo_url", "note": "After upload, call PUT /profile/update with photo_url"}


@router.put("/deactivate", status_code=204)
def deactivate_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.deleted_at = datetime.now(timezone.utc)
    current_user.status = UserStatus.SUSPENDED
    db.commit()
