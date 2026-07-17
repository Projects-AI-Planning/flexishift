from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.response import ok, created
from app.config import settings
from app.database import get_db
from app.dependencies import get_redis, get_current_user
from app.models.user import User
from app.core.security import verify_password, hash_password
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
async def register(body: RegisterRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    name = body.name or body.full_name or ""
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    result = await auth_svc.register(db, name, body.email, body.phone, body.password, body.role, r=r)
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
            "isVerified": user.verified,
            "isProfileComplete": getattr(user, "profile_complete", False),
        },
        message="Email verified successfully.",
    )


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    tokens = auth_svc.login(db, r, body.email, body.password)
    user = db.query(User).filter(User.email == body.email).first()
    profile = user.profile if user else None
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
            "isVerified": user.verified if user else None,
            "isProfileComplete": user.profile_complete if user else None,
            "profilePhoto": profile.photo_url if profile else None,
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
    email_sent = await auth_svc.forgot_password(db, body.email)
    return ok(
        data={"emailSent": email_sent},
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
