from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
import redis

from app.models.user import User, UserProfile, EmailVerification, PasswordReset, Role, UserStatus
from app.core.security import (
    hash_password, verify_password, create_access_token,
    generate_token, hash_token,
)
from app.config import settings
from app.services.email import send_verification_email, send_password_reset_email

REFRESH_PREFIX = "refresh:"


def _store_refresh(r: redis.Redis, user_id: str, token: str) -> None:
    key = f"{REFRESH_PREFIX}{token}"
    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    r.setex(key, ttl, user_id)


def _consume_refresh(r: redis.Redis, token: str) -> str | None:
    key = f"{REFRESH_PREFIX}{token}"
    user_id = r.get(key)
    if user_id:
        r.delete(key)
    return user_id


def _revoke_refresh(r: redis.Redis, token: str) -> None:
    r.delete(f"{REFRESH_PREFIX}{token}")


async def register(db: Session, full_name: str, email: str, phone: str, password: str, role: str) -> User:
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        full_name=full_name,
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        role=Role(role),
        status=UserStatus.INACTIVE,
    )
    db.add(user)
    db.flush()

    profile = UserProfile(user_id=user.id)
    db.add(profile)

    raw_token = generate_token()
    ev = EmailVerification(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(ev)
    db.commit()
    db.refresh(user)

    await send_verification_email(email, full_name, raw_token)
    return user


async def verify_email(db: Session, token: str) -> User:
    token_hash = hash_token(token)
    ev = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.token_hash == token_hash,
            EmailVerification.used_at.is_(None),
            EmailVerification.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not ev:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    ev.used_at = datetime.now(timezone.utc)
    user = db.get(User, ev.user_id)
    user.verified = True
    user.status = UserStatus.ACTIVE
    db.commit()
    db.refresh(user)
    return user


def login(db: Session, r: redis.Redis, email: str, password: str) -> dict:
    user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.status == UserStatus.INACTIVE:
        raise HTTPException(status_code=403, detail="Email not verified")
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(status_code=403, detail="Account suspended")

    access_token = create_access_token(user.id, user.role.value)
    raw_refresh = generate_token()
    _store_refresh(r, user.id, raw_refresh)

    return {"access_token": access_token, "refresh_token": raw_refresh, "token_type": "bearer"}


def refresh_tokens(db: Session, r: redis.Redis, refresh_token: str) -> dict:
    user_id = _consume_refresh(r, refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.get(User, user_id)
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=401, detail="Unauthorized")

    access_token = create_access_token(user.id, user.role.value)
    raw_refresh = generate_token()
    _store_refresh(r, user.id, raw_refresh)

    return {"access_token": access_token, "refresh_token": raw_refresh, "token_type": "bearer"}


def logout(r: redis.Redis, refresh_token: str) -> None:
    _revoke_refresh(r, refresh_token)


async def resend_verification(db: Session, email: str) -> None:
    user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
    if not user or user.verified:
        return  # silent — don't reveal state
    raw_token = generate_token()
    ev = EmailVerification(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(ev)
    db.commit()
    await send_verification_email(email, user.full_name, raw_token)


async def forgot_password(db: Session, email: str) -> None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return  # silent — don't reveal existence

    raw_token = generate_token()
    pr = PasswordReset(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(pr)
    db.commit()
    await send_password_reset_email(email, user.full_name, raw_token)


def reset_password(db: Session, token: str, new_password: str) -> None:
    token_hash = hash_token(token)
    pr = (
        db.query(PasswordReset)
        .filter(
            PasswordReset.token_hash == token_hash,
            PasswordReset.used_at.is_(None),
            PasswordReset.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not pr:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    pr.used_at = datetime.now(timezone.utc)
    user = db.get(User, pr.user_id)
    user.password_hash = hash_password(new_password)
    db.commit()
