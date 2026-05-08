from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.response import ok, created
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


@router.get("/mobile-otp")
def send_mobile_otp(phone: str = Query(..., description="Mobile number to send OTP to"), r=Depends(get_redis)):
    otp = auth_svc.send_mobile_otp(r, phone)
    return ok(
        data={"phone": phone, "otp": otp, "expiresInSeconds": 600},
        message="OTP generated successfully",
    )


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: Session = Depends(get_db)):
    name = body.name or body.full_name or ""
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    user = await auth_svc.register(db, name, body.email, body.phone, body.password, body.role)
    return created(
        data={"userId": user.id, "email": user.email, "role": user.role.value, "isVerified": user.verified},
        message="Registration successful. Check your email to verify your account.",
    )


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    token = body.get_token()
    if not token:
        raise HTTPException(status_code=400, detail="Verification token or OTP is required")
    user = await auth_svc.verify_email(db, token, email=body.email)
    return ok(data=None, message="Email verified. You can now log in.")


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
def logout(body: RefreshRequest, r=Depends(get_redis)):
    auth_svc.logout(r, body.refresh_token)
    return ok(data=None, message="Logged out successfully")


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    await auth_svc.forgot_password(db, body.email)
    return ok(data=None, message="If that email is registered you will receive a reset link.")


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    auth_svc.reset_password(db, body.email, body.otp, body.new_password)
    return ok(data=None, message="Password reset successfully.")


@router.post("/resend-verification")
async def resend_verification(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    await auth_svc.resend_verification(db, body.email)
    return ok(data=None, message="If that email is registered and unverified, a new link has been sent.")


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
