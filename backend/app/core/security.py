import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": user_id, "role": role, "exp": expire}
    algorithm = settings.JWT_ALGORITHM.upper()
    if algorithm == "RS256":
        return jwt.encode(payload, settings.JWT_PRIVATE_KEY, algorithm=algorithm)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=algorithm)


def decode_access_token(token: str) -> dict:
    try:
        algorithm = settings.JWT_ALGORITHM.upper()
        if algorithm == "RS256":
            return jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=[algorithm])
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
