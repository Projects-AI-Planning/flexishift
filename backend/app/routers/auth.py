from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.response import ok, created
from app.config import settings
from app.database import get_db
from app.dependencies import get_redis, get_current_user
from app.models.user import User
from app.core.security import verify_password, hash_password
from app.services import s3

_PHONE_PREFIX_CURRENCY: dict = {
    '+44': 'GBP', '+1': 'USD', '+91': 'INR', '+92': 'PKR', '+880': 'BDT',
    '+234': 'NGN', '+233': 'GHS', '+27': 'ZAR', '+48': 'PLN', '+40': 'RON',
    '+359': 'BGN', '+370': 'EUR', '+371': 'EUR', '+372': 'EUR', '+49': 'EUR',
    '+33': 'EUR', '+353': 'EUR', '+31': 'EUR', '+32': 'EUR', '+34': 'EUR',
    '+39': 'EUR', '+351': 'EUR', '+420': 'CZK', '+421': 'EUR', '+36': 'HUF',
    '+380': 'UAH', '+63': 'PHP', '+61': 'AUD', '+64': 'NZD', '+65': 'SGD',
    '+971': 'AED', '+966': 'SAR',
}

def _user_currency(user: User) -> str | None:
    if user.currency:
        return user.currency
    phone = user.phone or ''
    for prefix in sorted(_PHONE_PREFIX_CURRENCY, key=len, reverse=True):
        if phone.startswith(prefix):
            return _PHONE_PREFIX_CURRENCY[prefix]
    return None
from app.schemas.auth import (
    RegisterRequest, VerifyEmailRequest, LoginRequest,
    TokenResponse, RefreshRequest, ForgotPasswordRequest,
    ResetPasswordRequest, ChangePasswordRequest,
)
from app.services import auth as auth_svc

router = APIRouter(prefix="/auth", tags=["Auth"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/email-config")
def check_email_config():
    """Check which email provider is configured (dev/debug only)."""
    if settings.APP_ENV == "production":
        raise HTTPException(status_code=404, detail="Not found")
    return ok(
        data={
            "sendgrid": bool(settings.SENDGRID_API_KEY),
            "smtp": bool(settings.GMAIL_USER and settings.GMAIL_APP_PASSWORD),
            "gmailUser": settings.GMAIL_USER or None,
            "provider": "sendgrid" if settings.SENDGRID_API_KEY else ("smtp" if settings.GMAIL_USER else "none"),
        },
        message="Email configuration status",
    )


@router.get("/email-otp")
def get_email_otp(email: str = Query(..., description="Email address to look up active OTP for"), r=Depends(get_redis)):
    otp = auth_svc.get_email_otp(r, email)
    return ok(
        data={"email": email, "otp": otp},
        message="OTP retrieved successfully",
    )


@router.get("/mobile-otp")
def get_mobile_otp(phone: str = Query(..., description="Mobile number to look up active OTP for"), r=Depends(get_redis)):
    otp = auth_svc.get_mobile_otp(r, phone)
    return ok(
        data={"phone": phone, "otp": otp},
        message="OTP retrieved successfully",
    )


@router.post("/register", status_code=201)
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    name = body.name or body.full_name or ""
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    result = await auth_svc.register(
        db, name, body.email, body.phone, body.password, body.role, r=r,
        currency=body.currency, country=body.country,
        organisation_number=body.organisation_number,
        vat_number=body.vat_number,
        company_name=body.company_name,
        address=body.address,
        esignature_data=body.esignature_data,
        organisation_doc_url=body.organisation_doc_url,
    )

    from app.services.audit import log_audit, upsert_device
    user_obj = db.query(User).filter(User.email == body.email).first()
    ip = getattr(request.state, "client_ip", None) or (request.client.host if request.client else None)
    device = getattr(request.state, "device_meta", {})
    if user_obj:
        log_audit(db, action="REGISTER", user_id=user_obj.id, entity_type="user", entity_id=user_obj.id,
                  new_value={"email": body.email, "role": body.role},
                  ip_address=ip, user_agent=request.headers.get("user-agent"),
                  endpoint=str(request.url.path), method=request.method, status_code=201)
        if device:
            upsert_device(db, user_id=user_obj.id, ip_address=ip,
                          user_agent=request.headers.get("user-agent"), **device)

    return created(
        data={
            "email": result["email"],
            "role": result["role"],
            "emailSent": result["email_sent"],
        },
        message=(
            "Registration successful. A verification code has been sent to your email."
            if result["email_sent"]
            else "Registration successful. Email delivery failed — use Resend OTP on the verification screen."
        ),
    )


@router.post("/register/organisation-document", status_code=201)
async def upload_registration_org_document(request: Request, file: UploadFile = File(...)):
    """Public (pre-auth) upload for the OPTIONAL organisation registration document a
    haulier can attach while registering. Stores the file and returns its URL, which the
    client then includes as `organisationDocUrl` in the register payload. On email
    verification this becomes a PENDING document for admin review."""
    from uuid import uuid4
    from app.services import local_storage as local_svc

    suffix = {
        "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
        "image/webp": "webp", "application/pdf": "pdf",
    }.get(file.content_type or "", "bin")
    key = f"registration/organisation/{uuid4()}.{suffix}"
    contents = await file.read()
    if local_svc.azure_available():
        from app.services import s3
        s3.upload_bytes(settings.AZURE_CONTAINER_DOCS, key, contents, file.content_type or "application/octet-stream")
        file_url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_DOCS}/{key}"
    else:
        local_svc.ensure_local_upload_root()
        path = local_svc.LOCAL_UPLOAD_ROOT / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(contents)
        file_url = f"{settings.BACKEND_URL.rstrip('/')}/uploads/{key}"
    return created(data={"fileUrl": file_url}, message="Organisation document uploaded")


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    token = body.get_token()
    if not token:
        raise HTTPException(status_code=400, detail="Verification token or OTP is required")
    result = await auth_svc.verify_email(db, token, email=body.email, r=r)
    user = result["user"]
    return ok(
        data={
            "accessToken": result["access_token"],
            "refreshToken": result["refresh_token"],
            "tokenType": "bearer",
            "userId": user.id,
            "role": user.role.value,
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "currency": _user_currency(user),
            "isVerified": user.verified,
            "isProfileComplete": getattr(user, "profile_complete", False),
            "isAdminApproved": user.admin_approved,
        },
        message="Email verified successfully.",
    )


@router.post("/login")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    tokens = auth_svc.login(db, r, body.email, body.password, expected_role=body.expected_role)
    user = db.query(User).filter(User.email == body.email).first()
    profile = user.profile if user else None

    if user:
        from app.services.audit import log_audit, upsert_device
        ip = getattr(request.state, "client_ip", None) or (request.client.host if request.client else None)
        device = getattr(request.state, "device_meta", {})
        log_audit(db, action="LOGIN", user_id=user.id, entity_type="user", entity_id=user.id,
                  ip_address=ip, user_agent=request.headers.get("user-agent"),
                  endpoint=str(request.url.path), method=request.method, status_code=200)
        if device:
            upsert_device(db, user_id=user.id, ip_address=ip,
                          user_agent=request.headers.get("user-agent"), **device)

    return ok(
        data={
            "accessToken": tokens["access_token"],
            "refreshToken": tokens["refresh_token"],
            "tokenType": tokens["token_type"],
            "userId": user.id if user else None,
            "role": user.role.value if user else None,
            "name": user.full_name if user else None,
            "email": user.email if user else None,
            "phone": user.phone if user else None,
            "currency": _user_currency(user) if user else settings.PAYMENT_CURRENCY,
            "isVerified": user.verified if user else None,
            "isProfileComplete": user.profile_complete if user else None,
            "profilePhoto": s3.presign_url(profile.photo_url) if profile else None,
            "isAdminApproved": user.admin_approved if user else None,
        },
        message="Login successful",
    )


@router.post("/refresh-token")
@router.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    tokens = auth_svc.refresh_tokens(db, r, body.refresh_token)
    return ok(
        data={
            "accessToken": tokens["access_token"],
            "refreshToken": tokens["refresh_token"],
            "tokenType": tokens["token_type"],
        },
        message="Token refreshed",
    )


@router.post("/logout", status_code=200)
def logout(body: RefreshRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    auth_svc.logout(r, body.refresh_token, db=db)
    return ok(data=None, message="Logged out successfully")


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email_sent, dev_otp = await auth_svc.forgot_password(db, body.email)
    data: dict = {"emailSent": email_sent}
    # In development, surface the OTP in the response when email is not configured
    if dev_otp and settings.APP_ENV == "development":
        data["devOtp"] = dev_otp
    return ok(
        data=data,
        message=(
            "A password reset code has been sent to your email. Check your inbox and spam folder."
            if email_sent
            else "If that email is registered you will receive a one-time code."
        ),
    )


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    auth_svc.reset_password(db, body.email, body.otp, body.new_password)
    return ok(data=None, message="Password reset successfully.")


@router.post("/resend-verification")
async def resend_verification(body: ForgotPasswordRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    email_sent = await auth_svc.resend_verification(db, body.email, r=r)
    return ok(
        data={"emailSent": email_sent},
        message=(
            "A new verification code has been sent. Check your inbox and spam folder."
            if email_sent
            else "If that email is registered and unverified, a new OTP has been sent."
        ),
    )


@router.put("/change-password")
def change_password_auth(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_pw = body.current_password or body.old_password or ""
    if not verify_password(current_pw, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    return ok(data=None, message="Password changed successfully")
