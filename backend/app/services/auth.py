import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User, UserProfile, EmailVerification, PasswordReset, Role, UserStatus
from app.core.security import (
    hash_password, verify_password, create_access_token,
    generate_token, hash_token,
)
from app.config import settings
from app.services.email import send_verification_email, send_password_reset_email


def _generate_otp() -> str:
    return str(random.randint(100000, 999999))

# ---------------------------------------------------------------------------
# Refresh-token store — Redis when available, in-memory dict as fallback.
# The in-memory store is process-local and does not survive restarts; it is
# only intended for development without a Redis instance.
# ---------------------------------------------------------------------------
_memory_store: dict[str, str] = {}  # token → user_id
_otp_store: dict[str, str] = {}    # phone → otp (in-memory fallback)

REFRESH_PREFIX = "refresh:"


def _store_refresh(r, user_id: str, token: str) -> None:
    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    if r is not None:
        r.setex(f"{REFRESH_PREFIX}{token}", ttl, user_id)
    else:
        _memory_store[token] = user_id


def _consume_refresh(r, token: str) -> str | None:
    if r is not None:
        key = f"{REFRESH_PREFIX}{token}"
        user_id = r.get(key)
        if user_id:
            r.delete(key)
        return user_id
    return _memory_store.pop(token, None)


def _revoke_refresh(r, token: str) -> None:
    if r is not None:
        r.delete(f"{REFRESH_PREFIX}{token}")
    else:
        _memory_store.pop(token, None)


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

    otp = _generate_otp()
    ev = EmailVerification(
        user_id=user.id,
        token_hash=hash_token(otp),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(ev)
    db.commit()
    db.refresh(user)

    await send_verification_email(email, full_name, otp)
    return user


async def verify_email(db: Session, token: str, email: str | None = None) -> User:
    token_hash = hash_token(token)
    query = db.query(EmailVerification).filter(
        EmailVerification.token_hash == token_hash,
        EmailVerification.used_at.is_(None),
        EmailVerification.expires_at > datetime.now(timezone.utc),
    )
    if email:
        query = query.join(User, User.id == EmailVerification.user_id).filter(User.email == email)
    ev = query.first()
    if not ev:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    ev.used_at = datetime.now(timezone.utc)
    user = db.get(User, ev.user_id)
    user.verified = True
    user.status = UserStatus.ACTIVE
    db.commit()
    db.refresh(user)
    return user


def login(db: Session, r, email: str, password: str) -> dict:
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

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "role": user.role.value,
    }


def refresh_tokens(db: Session, r, refresh_token: str) -> dict:
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


def logout(r, refresh_token: str) -> None:
    _revoke_refresh(r, refresh_token)


async def resend_verification(db: Session, email: str) -> None:
    user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
    if not user or user.verified:
        return  # silent — don't reveal state
    otp = _generate_otp()
    ev = EmailVerification(
        user_id=user.id,
        token_hash=hash_token(otp),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(ev)
    db.commit()
    await send_verification_email(email, user.full_name, otp)


async def forgot_password(db: Session, email: str) -> None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return  # silent — don't reveal existence

    otp = _generate_otp()
    pr = PasswordReset(
        user_id=user.id,
        token_hash=hash_token(otp),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(pr)
    db.commit()
    await send_password_reset_email(email, user.full_name, otp)


OTP_TTL = 600  # 10 minutes
PHONE_OTP_PREFIX = "phone_otp:"


EMAIL_OTP_PREFIX = "email_otp:"
_email_otp_store: dict[str, str] = {}  # email → otp (in-memory fallback)


def send_email_otp(r, email: str) -> str:
    """Generate a 6-digit OTP for the given email, store it, and return it."""
    otp = _generate_otp()
    if r is not None:
        r.setex(f"{EMAIL_OTP_PREFIX}{email}", OTP_TTL, otp)
    else:
        _email_otp_store[email] = otp
    return otp


def verify_email_otp(r, email: str, otp: str) -> bool:
    """Return True and consume the OTP if it matches, False otherwise."""
    if r is not None:
        key = f"{EMAIL_OTP_PREFIX}{email}"
        stored = r.get(key)
        if stored and stored == otp:
            r.delete(key)
            return True
        return False
    stored = _email_otp_store.get(email)
    if stored and stored == otp:
        del _email_otp_store[email]
        return True
    return False


def send_mobile_otp(r, phone: str) -> str:
    """Generate a 6-digit OTP for the given phone number, store it, and return it."""
    otp = _generate_otp()
    if r is not None:
        r.setex(f"{PHONE_OTP_PREFIX}{phone}", OTP_TTL, otp)
    else:
        _otp_store[phone] = otp
    return otp


def verify_mobile_otp(r, phone: str, otp: str) -> bool:
    """Return True and consume the OTP if it matches, False otherwise."""
    if r is not None:
        key = f"{PHONE_OTP_PREFIX}{phone}"
        stored = r.get(key)
        if stored and stored == otp:
            r.delete(key)
            return True
        return False
    stored = _otp_store.get(phone)
    if stored and stored == otp:
        del _otp_store[phone]
        return True
    return False


def reset_password(db: Session, email: str, otp: str, new_password: str) -> None:
    token_hash = hash_token(otp)
    pr = (
        db.query(PasswordReset)
        .join(User, User.id == PasswordReset.user_id)
        .filter(
            User.email == email,
            PasswordReset.token_hash == token_hash,
            PasswordReset.used_at.is_(None),
            PasswordReset.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not pr:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    pr.used_at = datetime.now(timezone.utc)
    user = db.get(User, pr.user_id)
    user.password_hash = hash_password(new_password)
    # Receiving the OTP proves email ownership — activate account if not already
    if not user.verified or user.status == UserStatus.INACTIVE:
        user.verified = True
        user.status = UserStatus.ACTIVE
    db.commit()
