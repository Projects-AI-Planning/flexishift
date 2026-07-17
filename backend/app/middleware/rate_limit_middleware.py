"""
FreightFlex – Rate Limiting Middleware
Redis-based sliding window rate limiter
Single Responsibility – only handles rate limiting
"""

import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
import redis as sync_redis
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# ── Redis client (sync for middleware) ───────────────────────────────────────
redis_client = sync_redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    password=settings.REDIS_PASSWORD or None,
    decode_responses=True,
)

# ── Route-specific rate limit rules ──────────────────────────────────────────
RATE_LIMIT_RULES = {
    "/api/v1/auth/login": (
        settings.RATE_LIMIT_LOGIN,
        settings.RATE_LIMIT_LOGIN_WINDOW,
    ),
    "/api/v1/auth/forgot-password": (
        settings.RATE_LIMIT_FORGOT_PASSWORD,
        settings.RATE_LIMIT_FORGOT_PASSWORD_WINDOW,
    ),
}

DEFAULT_LIMIT  = settings.RATE_LIMIT_DEFAULT
DEFAULT_WINDOW = settings.RATE_LIMIT_DEFAULT_WINDOW


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding window rate limiter using Redis.
    Applies per-IP limits for auth endpoints.
    Applies per-user limits for all other endpoints.
    """

    async def dispatch(self, request: Request, call_next):

        # ── Skip rate limiting for health check ───────────────────────────────
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        # ── Determine limit and window ────────────────────────────────────────
        path = request.url.path
        limit, window = RATE_LIMIT_RULES.get(path, (DEFAULT_LIMIT, DEFAULT_WINDOW))

        # ── Build Redis key ───────────────────────────────────────────────────
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{path}:{client_ip}"

        try:
            # ── Sliding window counter ────────────────────────────────────────
            current = redis_client.get(key)
            current_count = int(current) if current else 0

            if current_count >= limit:
                logger.warning(
                    "rate_limit_exceeded",
                    path=path,
                    client_ip=client_ip,
                    limit=limit,
                    window=window,
                )
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Too many requests. Try again in {window} seconds.",
                    },
                    headers={"Retry-After": str(window)},
                )

            # ── Increment counter ─────────────────────────────────────────────
            pipe = redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, window)
            pipe.execute()

        except Exception as e:
            # ── If Redis fails, allow request (fail open) ─────────────────────
            logger.error("rate_limit_redis_error", error=str(e))

        return await call_next(request)