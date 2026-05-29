from datetime import datetime
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
from app.utils.phone_country import _COUNTRY_CURRENCY

router = APIRouter(prefix="/profile", tags=["Profile"])
LOCAL_UPLOAD_DIR = Path(__file__).resolve().parents[1] / "static" / "uploads"

_USER_FIELDS = {"full_name", "phone", "push_token", "bank_account_id", "country", "currency"}
_PROFILE_FIELDS = {
    "photo_url", "licence_number", "vehicle_type",
    "vehicle_registration", "truck_capacity", "company_name", "company_address", "coverage_area",
    "driver_availability",
    "equipment_details",
    "driver_assignments",
    "esignature_data",
}


def _apply_updates(current_user: User, updates: dict, db: Session) -> None:
    from app.models.user import UserProfile
    profile_updates = {k: v for k, v in updates.items() if k in _PROFILE_FIELDS}
    user_updates = {k: v for k, v in updates.items() if k in _USER_FIELDS}

    # Never overwrite country/currency with empty strings — skip those
    user_updates = {k: v for k, v in user_updates.items() if v != "" or k not in ("country", "currency")}

    for k, v in user_updates.items():
        setattr(current_user, k, v)

    # When country changes, always re-derive currency so they stay in sync.
    # An explicit non-empty currency in the same request overrides this.
    new_country = user_updates.get("country")
    if new_country:
        derived = _COUNTRY_CURRENCY.get(new_country.upper())
        if derived:
            current_user.currency = derived

    if profile_updates:
        if not current_user.profile:
            current_user.profile = UserProfile(user_id=current_user.id)
            db.add(current_user.profile)
            db.flush()
        for k, v in profile_updates.items():
            setattr(current_user.profile, k, v)

    _check_profile_complete(current_user, db)
    db.commit()
    db.refresh(current_user)


_REQUIRED_DOCS_BY_AVAIL: dict[str, list[str]] = {
    'DRIVER_ONLY':       ['DRIVING_LICENCE'],
    'TRUCK_ONLY':        ['VEHICLE_REG', 'VEHICLE_INSURANCE'],
    'DRIVER_WITH_TRUCK': ['DRIVING_LICENCE', 'VEHICLE_REG', 'VEHICLE_INSURANCE'],
}


def _check_profile_complete(user: User, db=None) -> None:
    from app.models.user import Role
    from app.models.document import Document, DocStatus
    p = user.profile
    if not p:
        return
    if user.role == Role.DRIVER:
        driver_avail = p.driver_availability or ''
        required_doc_types = _REQUIRED_DOCS_BY_AVAIL.get(driver_avail, [])
        if not driver_avail or not required_doc_types or not db:
            # No availability set yet — not complete
            user.profile_complete = False
            return
        user.profile_complete = all(
            db.query(Document).filter(
                Document.user_id == user.id,
                Document.doc_type == dt,
                Document.status == DocStatus.APPROVED,
            ).first() is not None
            for dt in required_doc_types
        )
    elif user.role in (Role.HAULIER, Role.FIRM):
        if p.company_name and p.company_address:
            user.profile_complete = True


def _presigned_photo_url(raw_url: str | None) -> str | None:
    if not raw_url:
        return None
    # For local uploads, return as is if already a full URL
    if "/static/uploads/" in raw_url or "/uploads/" in raw_url:
        return raw_url

    try:
        if settings.AZURE_STORAGE_ACCOUNT_NAME and settings.AZURE_STORAGE_ACCOUNT_KEY:
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
    url = str(request.url_for("uploads", path=key))
    # Fix potential http/https mismatch when behind a proxy
    if request.headers.get("x-forwarded-proto") == "https":
        url = url.replace("http://", "https://")
    return url


def _save_local_photo(request: Request, key: str, contents: bytes) -> str:
    local_svc.ensure_local_upload_root()
    file_path = LOCAL_UPLOAD_DIR / key
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(contents)
    return _local_photo_url(request, key)


def _user_data(user: User) -> dict:
    from app.models.user import Role
    profile = user.profile
    stripe_connect = None
    if user.role in (Role.DRIVER, Role.FIRM):
        stripe_connect = {
            "hasAccount": bool(user.stripe_account_id),
            "onboardingComplete": bool(user.stripe_onboarding_complete),
            "chargesEnabled": bool(user.stripe_onboarding_complete),
            "payoutsEnabled": bool(user.stripe_onboarding_complete),
        }
    return {
        "userId": user.id,
        "name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "country": getattr(user, "country", None),
        "currency": getattr(user, "currency", None),
        "role": user.role.value,
        "status": user.status.value,
        "profileComplete": user.profile_complete,
        "isVerified": user.verified,
        "avgRating": user.avg_rating,
        "completedJobs": user.completed_jobs,
        "locationLat": user.location_lat,
        "locationLng": user.location_lng,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "stripeConnect": stripe_connect,
        "profile": {
            "photoUrl": _presigned_photo_url(profile.photo_url if profile else None),
            "licenceNumber": profile.licence_number if profile else None,
            "vehicleType": profile.vehicle_type if profile else None,
            "vehicleRegistration": profile.vehicle_registration if profile else None,
            "truckCapacity": profile.truck_capacity if profile else None,
            "companyName": profile.company_name if profile else None,
            "companyAddress": profile.company_address if profile else None,
            "coverageArea": profile.coverage_area if profile else None,
            "driverAvailability": profile.driver_availability if profile else None,
            "equipmentDetails": profile.equipment_details if profile else [],
            "driverAssignments": profile.driver_assignments if profile else [],
            "esignatureData": profile.esignature_data if profile else None,
        } if profile else None,
    }


@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = _user_data(current_user)
    # If the driver has a Stripe account but onboarding isn't marked complete in
    # the DB yet, hit Stripe live so we return the real status (and update the DB).
    # Once complete the cached DB value is used — no extra Stripe call.
    if (
        current_user.stripe_account_id
        and not current_user.stripe_onboarding_complete
        and data.get("stripeConnect") is not None
    ):
        from app.services.stripe_connect import get_account_status
        try:
            live = get_account_status(db, current_user)
            data["stripeConnect"] = live
        except Exception:
            pass
    return ok(data=data, message="Profile retrieved")


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
            "updatedAt": datetime.utcnow().isoformat(),
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
            "updatedAt": datetime.utcnow().isoformat(),
        },
        message="Profile photo updated successfully",
    )


class DeactivateRequest(BaseModel):
    password: Optional[str] = None


class SaveEsignatureRequest(BaseModel):
    esignatureData: str


@router.put("/esignature")
def save_esignature(
    body: SaveEsignatureRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save (or update) the user's persistent e-signature drawn on device/browser."""
    from app.models.user import UserProfile
    if not current_user.profile:
        current_user.profile = UserProfile(user_id=current_user.id)
        db.add(current_user.profile)
        db.flush()
    current_user.profile.esignature_data = body.esignatureData
    db.commit()
    db.refresh(current_user)
    return ok(
        data={"esignatureData": current_user.profile.esignature_data},
        message="E-signature saved",
    )


@router.delete("/esignature")
def delete_esignature(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove the stored e-signature."""
    if current_user.profile:
        current_user.profile.esignature_data = None
        db.commit()
    return ok(data=None, message="E-signature removed")


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
    current_user.deleted_at = datetime.utcnow()
    current_user.status = UserStatus.SUSPENDED
    db.commit()
    return ok(data=None, message="Account deactivated")
