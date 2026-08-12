"""
FlexiShift – Logging Middleware
Logs every request/response to logs/app.log with structured JSON.
"""

import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import structlog

logger = structlog.get_logger(__name__)

SENSITIVE_FIELDS = {
    "password", "confirm_password", "new_password",
    "token", "access_token", "refresh_token",
    "card_number", "bank_account_id", "jwt_private_key",
}

# Paths to skip logging (health checks, static files)
_SKIP_PATHS = {"/api/v1/health", "/docs", "/redoc", "/openapi.json"}


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in _SKIP_PATHS:
            return await call_next(request)

        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.time()

        # Capture device/client metadata from headers sent by mobile app
        headers = request.headers
        device_meta = {
            "app_type":    headers.get("X-App-Type"),
            "app_version": headers.get("X-App-Version"),
            "os_name":     headers.get("X-OS-Name"),
            "os_version":  headers.get("X-OS-Version"),
            "device_id":   headers.get("X-Device-ID"),
            "device_model":headers.get("X-Device-Model"),
            "device_brand":headers.get("X-Device-Brand"),
            "mac_address": headers.get("X-MAC-Address"),
        }
        # Store on request.state so routers can read it (e.g. auth router)
        request.state.device_meta = {k: v for k, v in device_meta.items() if v}

        client_ip = (
            headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )
        request.state.client_ip = client_ip

        logger.info(
            "request_started",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=client_ip,
            user_agent=headers.get("user-agent", ""),
            **{k: v for k, v in device_meta.items() if v},
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error(
                "request_failed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                client_ip=client_ip,
                error=str(exc),
            )
            raise

        duration_ms = round((time.time() - start_time) * 1000, 2)

        logger.info(
            "request_completed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            client_ip=client_ip,
        )

        response.headers["X-Request-ID"] = request_id
        return response
