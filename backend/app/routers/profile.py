from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserStatus
from app.schemas.users import UserOut, UpdateProfileRequest
from app.services import s3
from app.config import settings

router = APIRouter(prefix="/profile", tags=["Profile"])

_USER_FIELDS = {"full_name", "phone", "push_token", "bank_account_id"}
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
        "locationLat": user.location_lat,
        "locationLng": user.location_lng,
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
def get_my_profile(current_user: User = Depends(get_current_user)):
    return ok(data=_user_data(current_user), message="Profile retrieved")


@router.get("/{user_id}")
def get_public_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ok(data=_user_data(user), message="Profile retrieved")


@router.post("/setup")
def setup_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw = body.model_dump(exclude_none=True, by_alias=False)
    # handle name → full_name
    if "name" in raw:
        raw["full_name"] = raw.pop("name")
    # remove alias fields already mapped
    _apply_updates(current_user, raw, db)
    return ok(data=_user_data(current_user), message="Profile setup complete")


@router.put("/update")
def update_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw = body.model_dump(exclude_none=True, by_alias=False)
    if "name" in raw:
        raw["full_name"] = raw.pop("name")
    _apply_updates(current_user, raw, db)
    return ok(data=_user_data(current_user), message="Profile updated")


@router.post("/photo/upload")
def get_photo_upload_url(current_user: User = Depends(get_current_user)):
    key = f"photos/{current_user.id}/profile.jpg"
    result = s3.generate_presigned_upload(settings.AWS_S3_BUCKET_DOCS, key, "image/jpeg")
    return ok(
        data={**result, "field": "photoUrl", "note": "After upload, call PUT /profile/update with photoUrl"},
        message="Presigned upload URL generated",
    )


class DeactivateRequest(BaseModel):
    password: Optional[str] = None


@router.put("/deactivate")
def deactivate_account(
    body: DeactivateRequest = DeactivateRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.password:
        from app.core.security import verify_password
        if not verify_password(body.password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Incorrect password")
    current_user.deleted_at = datetime.now(timezone.utc)
    current_user.status = UserStatus.SUSPENDED
    db.commit()
    return ok(data=None, message="Account deactivated")
