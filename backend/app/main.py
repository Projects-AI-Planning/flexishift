"""
FreightFlex – Main Application Entry Point
MVC + SOLID Architecture
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.middleware.logging_middleware import LoggingMiddleware
from app.middleware.rate_limit_middleware import RateLimitMiddleware

# ── Routers ──────────────────────────────────────────────────────────────────
from app.routers.auth_router import router as auth_router
from app.routers.user_router import router as user_router
from app.routers.supplier_router import router as supplier_router
from app.routers.job_router import router as job_router
from app.routers.quote_router import router as quote_router
from app.routers.booking_router import router as booking_router
from app.routers.payment_router import router as payment_router
from app.routers.compliance_router import router as compliance_router
from app.routers.tracking_router import router as tracking_router
from app.routers.rating_router import router as rating_router
from app.routers.admin_router import router as admin_router
from app.routers.webhook_router import router as webhook_router
from app.routers.ws_router import router as ws_router


def create_application() -> FastAPI:
    """
    Application factory – Single Responsibility Principle.
    Creates and configures the FastAPI application instance.
    """
    application = FastAPI(
        title=settings.APP_NAME,
        description="Digital freight-brokerage platform API",
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
    )

    # ── CORS Middleware ───────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Custom Middleware ─────────────────────────────────────────────────────
    application.add_middleware(LoggingMiddleware)
    application.add_middleware(RateLimitMiddleware)

    # ── Exception Handlers ────────────────────────────────────────────────────
    application.add_exception_handler(
        StarletteHTTPException,
        http_exception_handler,
    )
    application.add_exception_handler(
        RequestValidationError,
        validation_exception_handler,
    )
    application.add_exception_handler(
        Exception,
        generic_exception_handler,
    )

    # ── API Routers ───────────────────────────────────────────────────────────
    API_PREFIX = settings.API_PREFIX  # /api/v1

    application.include_router(auth_router,       prefix=f"{API_PREFIX}/auth",        tags=["Authentication"])
    application.include_router(user_router,       prefix=f"{API_PREFIX}/users",       tags=["Users"])
    application.include_router(supplier_router,   prefix=f"{API_PREFIX}/suppliers",   tags=["Suppliers"])
    application.include_router(job_router,        prefix=f"{API_PREFIX}/jobs",        tags=["Jobs"])
    application.include_router(quote_router,      prefix=f"{API_PREFIX}/jobs",        tags=["Quotes"])
    application.include_router(booking_router,    prefix=f"{API_PREFIX}/jobs",        tags=["Booking"])
    application.include_router(payment_router,    prefix=f"{API_PREFIX}/jobs",        tags=["Payments"])
    application.include_router(compliance_router, prefix=f"{API_PREFIX}/jobs",        tags=["Compliance"])
    application.include_router(tracking_router,   prefix=f"{API_PREFIX}/jobs",        tags=["Tracking"])
    application.include_router(rating_router,     prefix=f"{API_PREFIX}/jobs",        tags=["Ratings"])
    application.include_router(admin_router,      prefix=f"{API_PREFIX}/admin",       tags=["Admin"])
    application.include_router(webhook_router,    prefix=f"{API_PREFIX}/webhooks",    tags=["Webhooks"])
    application.include_router(ws_router,         prefix="",                          tags=["WebSocket"])

    # ── Health Check ──────────────────────────────────────────────────────────
    @application.get("/health", tags=["Health"])
    async def health_check():
        return {
            "success": True,
            "data": {
                "status": "healthy",
                "version": settings.APP_VERSION,
                "environment": settings.ENVIRONMENT,
            }
        }

    return application


app = create_application()