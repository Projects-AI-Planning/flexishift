import json
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User, UserProfile, EmailVerification, PasswordReset, RefreshToken, Role, UserStatus
from app.core.security import (
    hash_password, verify_password, create_access_token,
    generate_token, hash_token,
)
from app.config import settings
from app.services.email import send_verification_email, send_password_reset_email
from app.utils.phone_country import phone_to_country_currency


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
    # Always persist in DB so tokens survive Redis restarts
    if db is not None:
        token_hash = hash_token(token)
        expires_at = datetime.utcnow() + timedelta(seconds=ttl)
        db.add(RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at))
        db.commit()
    # Also cache in Redis for fast lookup
    if r is not None:
        try:
            r.setex(f"{REFRESH_PREFIX}{token}", ttl, user_id)
        except Exception:
            pass


def _consume_refresh(r, token: str, db=None) -> str | None:
    # Try Redis fast path first
    if r is not None:
        try:
            key = f"{REFRESH_PREFIX}{token}"
            user_id = r.get(key)
            if user_id:
                r.delete(key)
                # Also revoke in DB
                if db is not None:
                    token_hash = hash_token(token)
                    row = db.query(RefreshToken).filter(
                        RefreshToken.token_hash == token_hash,
                        RefreshToken.revoked.is_(False),
                    ).first()
                    if row:
                        row.revoked = True
                        db.commit()
                return user_id
        except Exception:
            pass
    # Fall back to DB (handles Redis cache miss or Redis unavailable)
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
        try:
            r.delete(f"{REFRESH_PREFIX}{token}")
        except Exception:
            pass
    if db is not None:
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


async def register(db: Session, full_name: str, email: str, phone: str | None, password: str, role: str, r=None, currency: str | None = None, country: str | None = None, organisation_number: str | None = None, vat_number: str | None = None, company_name: str | None = None, address: str | None = None, esignature_data: str | None = None, organisation_doc_url: str | None = None) -> dict:
    email = email.strip().lower()
    # Only block if an ACTIVE (non-deleted) account uses this email. Deactivated
    # (soft-deleted) accounts release their email so it can be reused.
    if db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    detected_country, detected_currency = phone_to_country_currency(phone)
    # Prefer client-provided values; fall back to phone-detected ones
    final_country  = (country or detected_country or "").upper()[:2] or None
    # Currency is country-wise: client sends the selected country's currency, but if
    # it's missing, derive it from the chosen country before falling back to phone.
    from app.utils.phone_country import _COUNTRY_CURRENCY
    country_currency = _COUNTRY_CURRENCY.get(final_country) if final_country else None
    final_currency = (currency or country_currency or detected_currency or "").upper() or None

    otp = _generate_otp()
    pending = {
        "full_name": full_name,
        "email": email,
        "phone": phone or "",
        "password_hash": hash_password(password),
        "role": role,
        "country": final_country,
        "currency": final_currency,
        "organisation_number": organisation_number or None,
        "vat_number": vat_number or None,
        "company_name": company_name or None,
        "company_address": address or None,
        "esignature_data": esignature_data or None,
        "organisation_doc_url": organisation_doc_url or None,
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
            _role = Role(pending["role"])
            user = User(
                full_name=pending["full_name"],
                email=pending["email"],
                phone=pending["phone"],
                password_hash=pending["password_hash"],
                role=_role,
                country=pending.get("country"),
                currency=pending.get("currency") or None,
                status=UserStatus.ACTIVE,
                verified=True,
                admin_approved=(_role != Role.HAULIER),
            )
            db.add(user)
            db.flush()
            db.add(UserProfile(
                user_id=user.id,
                organisation_number=pending.get("organisation_number"),
                vat_number=pending.get("vat_number"),
                company_name=pending.get("company_name"),
                company_address=pending.get("company_address"),
                esignature_data=pending.get("esignature_data"),
            ))
            # Optional organisation registration document → goes to admin for verification.
            org_doc_url = pending.get("organisation_doc_url")
            if org_doc_url and _role == Role.HAULIER:
                from app.models.document import Document, DocType, DocStatus
                from app.services.notifications import create_notification
                from app.core.enums import NotificationType
                doc = Document(
                    user_id=user.id,
                    doc_type=DocType.COMPANY_REG,
                    custom_name="Organisation Registration",
                    file_url=org_doc_url,
                    status=DocStatus.PENDING,
                )
                db.add(doc)
                db.flush()
                # Notify Admins
                admins = db.query(User).filter(User.role == Role.ADMIN).all()
                for admin in admins:
                    await create_notification(
                        db, admin.id, NotificationType.HAULIER_REGISTRATION_PENDING.value,
                        "New Haulier Registration",
                        f"New haulier {user.full_name} registered and pending approval.",
                        {"user_id": user.id, "doc_id": doc.id}
                    )
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
                    EmailVerification.expires_at > datetime.utcnow(),
                )
                .first()
            )
            if not ev:
                raise HTTPException(status_code=400, detail="Invalid or expired OTP")
            ev.used_at = datetime.utcnow()
            user = db.get(User, ev.user_id)
            user.verified = True
            user.status = UserStatus.ACTIVE
            if user.role != Role.HAULIER:
                user.admin_approved = True
            db.commit()
            db.refresh(user)
    else:
        token_hash = hash_token(token)
        ev = db.query(EmailVerification).filter(
            EmailVerification.token_hash == token_hash,
            EmailVerification.used_at.is_(None),
            EmailVerification.expires_at > datetime.utcnow(),
        ).first()
        if not ev:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        ev.used_at = datetime.utcnow()
        user = db.get(User, ev.user_id)
        user.verified = True
        user.status = UserStatus.ACTIVE
        if user.role != Role.HAULIER:
            user.admin_approved = True
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user.id, user.role.value)
    raw_refresh = generate_token()
    _store_refresh(r, user.id, raw_refresh, db=db)

    return {"user": user, "access_token": access_token, "refresh_token": raw_refresh}


def login(db: Session, r, email: str, password: str, expected_role: str | None = None) -> dict:
    email = email.strip().lower()
    user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.status == UserStatus.INACTIVE:
        raise HTTPException(status_code=403, detail="Email not verified. Please check your inbox (and spam folder) for the verification code.")
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(status_code=403, detail="Account suspended")
    if expected_role:
        allowed = [role_str.strip().upper() for role_str in expected_role.split(",")]
        if user.role.value.upper() not in allowed:
            if user.role.value.upper() == "DRIVER":
                raise HTTPException(status_code=403, detail="This account is registered as a driver. Please use the driver mobile app to log in.")
            else:
                raise HTTPException(status_code=403, detail="This account is registered as a haulier. Please use the haulier web portal to log in.")

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
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(ev)
    db.commit()
    _email_otp_store[email] = otp
    if r is not None:
        r.setex(f"{EMAIL_OTP_PREFIX}{email}", OTP_TTL, otp)
    return await send_verification_email(email, user.full_name, otp)


async def forgot_password(db: Session, email: str) -> tuple[bool, str | None]:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False, None  # silent — don't reveal existence

    otp = _generate_otp()
    pr = PasswordReset(
        user_id=user.id,
        token_hash=hash_token(otp),
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(pr)
    db.commit()

    # Store in memory so the debug endpoint and dev fallback can read it
    _email_otp_store[email] = otp

    email_sent = await send_password_reset_email(email, user.full_name, otp)
    # Return raw OTP only when email delivery failed (caller uses it for dev fallback)
    return email_sent, (otp if not email_sent else None)


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
            PasswordReset.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not pr:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    pr.used_at = datetime.utcnow()
    user = db.get(User, pr.user_id)
    user.password_hash = hash_password(new_password)
    # Receiving the OTP proves email ownership — activate account if not already
    if not user.verified or user.status == UserStatus.INACTIVE:
        user.verified = True
        user.status = UserStatus.ACTIVE
    db.commit()
