from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import redis as redis_client

from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserStatus, Role
from app.config import settings

bearer_scheme = HTTPBearer()
_redis = None


def get_redis() -> redis_client.Redis:
    global _redis
    if _redis is None:
        _redis = redis_client.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(credentials.credentials)
    user = db.get(User, payload.get("sub"))
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user


def require_role(*roles: Role):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker
