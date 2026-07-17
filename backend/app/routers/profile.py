from datetime import datetime, timezone
from uuid import uuid4
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.response import ok, created
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserStatus
from app.schemas.users import UserOut, UpdateProfileRequest
from app.models.local_upload import LocalUploadKind, LocalUploadStatus
from app.services import local_storage as local_svc
from app.services import s3
from app.config import settings

router = APIRouter(prefix="/profile", tags=["Profile"])
LOCAL_UPLOAD_DIR = Path(__file__).resolve().parents[1] / "static" / "uploads"

_USER_FIELDS = {"full_name", "phone", "push_token", "bank_account_id"}
_PROFILE_FIELDS = {
    "photo_url", "licence_number", "vehicle_type",
    "vehicle_registration", "company_name", "company_address", "coverage_area",
    "driver_availability",
    "equipment_details",
    "driver_assignments",
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
        # Match the mobile onboarding flow: the driver finishes setup after
        # providing licence number and vehicle type. Vehicle registration can
        # still be completed later from the profile editor.
        if p.licence_number and p.vehicle_type:
            user.profile_complete = True
    elif user.role in (Role.HAULIER, Role.FIRM):
        if p.company_name and p.company_address:
            user.profile_complete = True


def _presigned_photo_url(raw_url: str | None) -> str | None:
    if not raw_url:
        return None
    if raw_url.startswith("http://10.0.2.2:8000/uploads/") or raw_url.startswith("http://localhost:8000/uploads/"):
        return raw_url
    try:
        prefix = (
            f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}"
            f".blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/"
        )
        if raw_url.startswith(prefix):
            key = raw_url[len(prefix):]
            return s3.generate_presigned_download(
                settings.AZURE_CONTAINER_DOCS, key, expires=86400
            )
        return raw_url
    except Exception:
        return raw_url


def _local_photo_url(request: Request, key: str) -> str:
    return str(request.url_for("uploads", path=key))


def _save_local_photo(request: Request, key: str, contents: bytes) -> str:
    file_path = LOCAL_UPLOAD_DIR / key
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(contents)
    return _local_photo_url(request, key)


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
            "photoUrl": _presigned_photo_url(profile.photo_url if profile else None),
            "licenceNumber": profile.licence_number if profile else None,
            "vehicleType": profile.vehicle_type if profile else None,
            "vehicleRegistration": profile.vehicle_registration if profile else None,
            "companyName": profile.company_name if profile else None,
            "companyAddress": profile.company_address if profile else None,
            "coverageArea": profile.coverage_area if profile else None,
            "driverAvailability": profile.driver_availability if profile else None,
            "equipmentDetails": profile.equipment_details if profile else [],
            "driverAssignments": profile.driver_assignments if profile else [],
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
def get_photo_upload_url(
    request: Request,
    content_type: str = Query("image/jpeg", alias="contentType"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if settings.AZURE_STORAGE_ACCOUNT_NAME and settings.AZURE_STORAGE_ACCOUNT_KEY:
        key = f"photos/{current_user.id}/profile.jpg"
        result = s3.generate_presigned_upload(settings.AZURE_CONTAINER_DOCS, key, content_type)
        return ok(
            data={**result, "field": "photoUrl", "note": "After upload, call PUT /profile/update with photoUrl"},
            message="Presigned upload URL generated",
        )

    key = f"images/{current_user.id}/profile.jpg"
    record = local_svc.create_pending_upload(
        db,
        user_id=current_user.id,
        kind=LocalUploadKind.IMAGE,
        original_name="profile.jpg",
        content_type=content_type,
    )
    key = record.storage_key
    record.public_url = _local_photo_url(request, key)
    db.commit()
    return ok(
        data={
            "url": local_svc.local_upload_endpoint_url(request, record.upload_token),
            "upload_url": local_svc.local_upload_endpoint_url(request, record.upload_token),
            "key": key,
            "fileUrl": record.public_url,
            "field": "photoUrl",
            "note": "After upload, call PUT /profile/update with photoUrl",
        },
        message="Local upload URL generated",
    )


@router.post("/photo/upload-direct")
async def upload_photo_direct(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    suffix = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }.get(file.content_type or "", (file.filename or "").split(".")[-1] or "jpg")
    contents = await file.read()
    if settings.AZURE_STORAGE_ACCOUNT_NAME and settings.AZURE_STORAGE_ACCOUNT_KEY:
        key = f"photos/{current_user.id}/profile-{str(uuid4())[:8]}.{suffix}"
        s3.upload_bytes(settings.AZURE_CONTAINER_DOCS, key, contents, file.content_type or "image/jpeg")
        raw_url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{key}"
        photo_url = s3.generate_presigned_download(settings.AZURE_CONTAINER_DOCS, key, expires=86400)
    else:
        key = f"images/{current_user.id}/profile-{str(uuid4())[:8]}.{suffix}"
        photo_url = _save_local_photo(request, key, contents)
        raw_url = photo_url
        local_record = local_svc.create_pending_upload(
            db,
            user_id=current_user.id,
            kind=LocalUploadKind.IMAGE,
            original_name=file.filename or f"profile-{str(uuid4())[:8]}.{suffix}",
            content_type=file.content_type or "image/jpeg",
            storage_key=key,
        )
        local_record.public_url = photo_url
        local_record.status = LocalUploadStatus.STORED
        db.commit()
    _apply_updates(current_user, {"photo_url": raw_url}, db)
    return ok(
        data={
            "photoUrl": photo_url,
            "key": key,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="Profile photo uploaded successfully",
    )


class PhotoSubmitRequest(BaseModel):
    key: str


@router.post("/photo/submit-upload")
def submit_photo_upload(
    request: Request,
    body: PhotoSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if settings.AZURE_STORAGE_ACCOUNT_NAME and settings.AZURE_STORAGE_ACCOUNT_KEY:
        photo_url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{body.key}"
    else:
        record = local_svc.get_upload_by_key(db, body.key, current_user.id)
        if not record:
            raise HTTPException(status_code=404, detail="Local upload not found")
        if record.status != LocalUploadStatus.STORED:
            raise HTTPException(status_code=400, detail="Local upload has not been stored yet")
        photo_url = record.public_url or _local_photo_url(request, body.key)
    _apply_updates(current_user, {"photo_url": photo_url}, db)
    return ok(
        data={
            "photoUrl": photo_url,
            "key": body.key,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        },
        message="Profile photo updated successfully",
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
