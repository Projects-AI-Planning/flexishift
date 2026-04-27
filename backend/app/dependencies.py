from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import structlog

from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserStatus, Role
from app.config import settings

log = structlog.get_logger()
bearer_scheme = HTTPBearer()
_redis = None


def get_redis():
    """Return a Redis client if available, or None if Redis is not configured/reachable."""
    global _redis
    if _redis is not None:
        return _redis
    if not settings.REDIS_URL:
        return None
    try:
        import redis as redis_client
        client = redis_client.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=2)
        client.ping()
        _redis = client
        return _redis
    except Exception:
        log.warning("redis_unavailable_using_memory_fallback")
        return None


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
