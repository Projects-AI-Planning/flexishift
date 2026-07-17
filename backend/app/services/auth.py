import json
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User, UserProfile, EmailVerification, PasswordReset, RefreshToken, Role, UserStatus
from app.core.security import (
    hash_password, verify_password, create_access_token,
    generate_token, hash_token,
)
from app.config import settings
from app.services.email import send_verification_email, send_password_reset_email


def _generate_otp() -> str:
    return str(random.randint(100000, 999999))

# ---------------------------------------------------------------------------
# OTP & token constants — defined at module level before any function uses them
# ---------------------------------------------------------------------------
OTP_TTL = 600  # 10 minutes

REFRESH_PREFIX = "refresh:"
PHONE_OTP_PREFIX = "phone_otp:"
EMAIL_OTP_PREFIX = "email_otp:"
PENDING_REG_PREFIX = "pending_reg:"

# In-memory fallback stores (used when Redis is unavailable)
_otp_store: dict[str, str] = {}           # phone → otp
_email_otp_store: dict[str, str] = {}     # email → otp
_pending_store: dict[str, dict] = {}      # email → pending registration data


def _store_refresh(r, user_id: str, token: str, db=None) -> None:
    ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    if r is not None:
        r.setex(f"{REFRESH_PREFIX}{token}", ttl, user_id)
    elif db is not None:
        token_hash = hash_token(token)
        expires_at = datetime.utcnow() + timedelta(seconds=ttl)
        db.add(RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at))
        db.commit()


def _consume_refresh(r, token: str, db=None) -> str | None:
    if r is not None:
        key = f"{REFRESH_PREFIX}{token}"
        user_id = r.get(key)
        if user_id:
            r.delete(key)
        return user_id
    if db is not None:
        token_hash = hash_token(token)
        row = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
            RefreshToken.expires_at > datetime.utcnow(),
        ).first()
        if row:
            row.revoked = True
            db.commit()
            return row.user_id
    return None


def _revoke_refresh(r, token: str, db=None) -> None:
    if r is not None:
        r.delete(f"{REFRESH_PREFIX}{token}")
    elif db is not None:
        token_hash = hash_token(token)
        row = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if row:
            row.revoked = True
            db.commit()


def _store_pending(r, email: str, data: dict) -> None:
    if r is not None:
        r.setex(f"{PENDING_REG_PREFIX}{email}", OTP_TTL, json.dumps(data))
    else:
        _pending_store[email] = data


def _get_pending(r, email: str) -> dict | None:
    if r is not None:
        raw = r.get(f"{PENDING_REG_PREFIX}{email}")
        return json.loads(raw) if raw else None
    return _pending_store.get(email)


def _delete_pending(r, email: str) -> None:
    if r is not None:
        r.delete(f"{PENDING_REG_PREFIX}{email}")
    else:
        _pending_store.pop(email, None)


async def register(db: Session, full_name: str, email: str, phone: str | None, password: str, role: str, r=None) -> dict:
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    otp = _generate_otp()
    pending = {
        "full_name": full_name,
        "email": email,
        "phone": phone or "",
        "password_hash": hash_password(password),
        "role": role,
        "otp": otp,
    }
    _store_pending(r, email, pending)

    _email_otp_store[email] = otp
    if r is not None:
        r.setex(f"{EMAIL_OTP_PREFIX}{email}", OTP_TTL, otp)

    email_sent = await send_verification_email(email, full_name, otp)
    return {"email": email, "role": role, "email_sent": email_sent}


async def verify_email(db: Session, token: str, email: str | None = None, r=None) -> dict:
    user = None

    if email:
        # New flow: create user in DB only after OTP is verified
        pending = _get_pending(r, email)
        if pending and pending.get("otp") == token:
            user = User(
                full_name=pending["full_name"],
                email=pending["email"],
                phone=pending["phone"],
                password_hash=pending["password_hash"],
                role=Role(pending["role"]),
                status=UserStatus.ACTIVE,
                verified=True,
            )
            db.add(user)
            db.flush()
            db.add(UserProfile(user_id=user.id))
            db.commit()
            db.refresh(user)
            _delete_pending(r, email)
        else:
            # Legacy flow: check EmailVerification table (for users registered before this change)
            token_hash = hash_token(token)
            ev = (
                db.query(EmailVerification)
                .join(User, User.id == EmailVerification.user_id)
                .filter(
                    User.email == email,
                    EmailVerification.token_hash == token_hash,
                    EmailVerification.used_at.is_(None),
                    EmailVerification.expires_at > datetime.now(timezone.utc),
                )
                .first()
            )
            if not ev:
                raise HTTPException(status_code=400, detail="Invalid or expired OTP")
            ev.used_at = datetime.now(timezone.utc)
            user = db.get(User, ev.user_id)
            user.verified = True
            user.status = UserStatus.ACTIVE
            db.commit()
            db.refresh(user)
    else:
        token_hash = hash_token(token)
        ev = db.query(EmailVerification).filter(
            EmailVerification.token_hash == token_hash,
            EmailVerification.used_at.is_(None),
            EmailVerification.expires_at > datetime.now(timezone.utc),
        ).first()
        if not ev:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        ev.used_at = datetime.now(timezone.utc)
        user = db.get(User, ev.user_id)
        user.verified = True
        user.status = UserStatus.ACTIVE
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user.id, user.role.value)
    raw_refresh = generate_token()
    _store_refresh(r, user.id, raw_refresh, db=db)

    return {"user": user, "access_token": access_token, "refresh_token": raw_refresh}


def login(db: Session, r, email: str, password: str) -> dict:
    user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.status == UserStatus.INACTIVE:
        raise HTTPException(status_code=403, detail="Email not verified. Please check your inbox (and spam folder) for the verification code.")
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(status_code=403, detail="Account suspended")

    access_token = create_access_token(user.id, user.role.value)
    raw_refresh = generate_token()
    _store_refresh(r, user.id, raw_refresh, db=db)

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "role": user.role.value,
    }


def refresh_tokens(db: Session, r, refresh_token: str) -> dict:
    user_id = _consume_refresh(r, refresh_token, db=db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.get(User, user_id)
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=401, detail="Unauthorized")

    access_token = create_access_token(user.id, user.role.value)
    raw_refresh = generate_token()
    _store_refresh(r, user.id, raw_refresh, db=db)

    return {"access_token": access_token, "refresh_token": raw_refresh, "token_type": "bearer"}


def logout(r, refresh_token: str, db=None) -> None:
    _revoke_refresh(r, refresh_token, db=db)


async def resend_verification(db: Session, email: str, r=None) -> bool:
    # New flow: pending registration not yet in DB
    pending = _get_pending(r, email)
    if pending:
        otp = _generate_otp()
        pending["otp"] = otp
        _store_pending(r, email, pending)
        _email_otp_store[email] = otp
        if r is not None:
            r.setex(f"{EMAIL_OTP_PREFIX}{email}", OTP_TTL, otp)
        return await send_verification_email(email, pending["full_name"], otp)

    # Legacy flow: user already in DB but unverified
    user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
    if not user or user.verified:
        return False
    otp = _generate_otp()
    ev = EmailVerification(
        user_id=user.id,
        token_hash=hash_token(otp),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(ev)
    db.commit()
    _email_otp_store[email] = otp
    if r is not None:
        r.setex(f"{EMAIL_OTP_PREFIX}{email}", OTP_TTL, otp)
    return await send_verification_email(email, user.full_name, otp)


async def forgot_password(db: Session, email: str) -> bool:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False  # silent — don't reveal existence

    otp = _generate_otp()
    pr = PasswordReset(
        user_id=user.id,
        token_hash=hash_token(otp),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(pr)
    db.commit()
    return await send_password_reset_email(email, user.full_name, otp)


def get_email_otp(r, email: str) -> str:
    """Return the active registration OTP for the given email. Raises 404 if none found."""
    if r is not None:
        otp = r.get(f"{EMAIL_OTP_PREFIX}{email}")
        if otp:
            return otp
    otp = _email_otp_store.get(email)
    if not otp:
        raise HTTPException(status_code=404, detail="No active OTP found for this email")
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


def get_mobile_otp(r, phone: str) -> str:
    """Return the active OTP for the given phone number. Raises 404 if none found."""
    if r is not None:
        otp = r.get(f"{PHONE_OTP_PREFIX}{phone}")
        if otp:
            return otp
    otp = _otp_store.get(phone)
    if not otp:
        raise HTTPException(status_code=404, detail="No active OTP found for this phone number")
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
