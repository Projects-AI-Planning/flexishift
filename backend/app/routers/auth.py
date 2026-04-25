from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.dependencies import get_redis
from app.schemas.auth import (
    RegisterRequest, VerifyEmailRequest, LoginRequest,
    TokenResponse, RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest,
)
from app.services import auth as auth_svc

router = APIRouter(prefix="/auth", tags=["Auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: Session = Depends(get_db)):
    user = await auth_svc.register(db, body.full_name, body.email, body.phone, body.password, body.role)
    return {"success": True, "message": "Registration successful. Check your email to verify your account.", "user_id": user.id}


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = await auth_svc.verify_email(db, body.token)
    return {"success": True, "message": "Email verified. You can now log in.", "user_id": user.id}


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    return auth_svc.login(db, r, body.email, body.password)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db), r=Depends(get_redis)):
    return auth_svc.refresh_tokens(db, r, body.refresh_token)


@router.post("/logout", status_code=204)
def logout(body: RefreshRequest, r=Depends(get_redis)):
    auth_svc.logout(r, body.refresh_token)


@router.post("/forgot-password", status_code=202)
async def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    await auth_svc.forgot_password(db, body.email)
    return {"success": True, "message": "If that email is registered you will receive a reset link."}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    auth_svc.reset_password(db, body.token, body.new_password)
    return {"success": True, "message": "Password reset successfully."}
