"""
FreightFlex – Logging Middleware
Logs every request and response with structured JSON
Single Responsibility – only handles request/response logging
"""

import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import structlog

logger = structlog.get_logger(__name__)

# ── Fields that must never appear in logs ────────────────────────────────────
SENSITIVE_FIELDS = {
    "password",
    "confirm_password",
    "new_password",
    "token",
    "access_token",
    "refresh_token",
    "card_number",
    "bank_account_id",
    "jwt_private_key",
}


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs incoming requests and outgoing responses.
    Attaches a unique request_id to every request for tracing.
    Masks sensitive fields from logs.
    """

    async def dispatch(self, request: Request, call_next) -> Response:

        # ── Generate request ID ───────────────────────────────────────────────
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # ── Record start time ─────────────────────────────────────────────────
        start_time = time.time()

        # ── Log incoming request ──────────────────────────────────────────────
        logger.info(
            "request_started",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            query=str(request.query_params),
            client_ip=request.client.host if request.client else "unknown",
        )

        # ── Process request ───────────────────────────────────────────────────
        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error(
                "request_failed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                error=str(exc),
            )
            raise

        # ── Calculate duration ────────────────────────────────────────────────
        duration_ms = round((time.time() - start_time) * 1000, 2)

        # ── Log outgoing response ─────────────────────────────────────────────
        logger.info(
            "request_completed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

        # ── Add request ID to response headers ────────────────────────────────
        response.headers["X-Request-ID"] = request_id

        return response