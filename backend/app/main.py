<<<<<<< HEAD
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
=======
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.routers import (
    auth, users, documents, availability,
    suppliers, jobs, payments, compliance,
    tracking, ratings, admin, webhooks, ws, dashboard,
    maps, bookings, invoices, notifications,
    profile, supplier, quotes, files, system, compliance_flat,
)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={
        "status": False,
        "code": exc.status_code,
        "message": exc.detail,
        "data": None,
    })


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={
        "status": False,
        "code": 422,
        "message": "Validation failed",
        "data": {
            "errors": [
                {"field": ".".join(str(l) for l in e["loc"][1:]), "message": e["msg"]}
                for e in exc.errors()
            ]
        },
    })


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={
        "status": False,
        "code": 500,
        "message": "An unexpected error occurred",
        "data": None,
    })


PREFIX = "/api/v1"

# Core auth & user
app.include_router(auth.router,             prefix=PREFIX)
app.include_router(users.router,            prefix=PREFIX)
app.include_router(profile.router,          prefix=PREFIX)

# Documents & availability
app.include_router(documents.router,        prefix=PREFIX)
app.include_router(availability.router,     prefix=PREFIX)
app.include_router(supplier.router,         prefix=PREFIX)

# Jobs, quotes & suppliers
app.include_router(jobs.router,             prefix=PREFIX)
app.include_router(quotes.router,           prefix=PREFIX)
app.include_router(suppliers.router,        prefix=PREFIX)

# Bookings, payments & invoices
app.include_router(bookings.router,         prefix=PREFIX)
app.include_router(payments.router,         prefix=PREFIX)   # job-scoped
app.include_router(payments.flat,           prefix=PREFIX)   # /payments/* flat
app.include_router(invoices.router,         prefix=PREFIX)

# Compliance & tracking
app.include_router(compliance.router,       prefix=PREFIX)
app.include_router(compliance_flat.router,  prefix=PREFIX)
app.include_router(tracking.router,         prefix=PREFIX)   # /jobs/:id/tracking/*
app.include_router(tracking.flat,           prefix=PREFIX)   # /tracking/* (mobile flat paths)

# Ratings, notifications, dashboard
app.include_router(ratings.router,          prefix=PREFIX)
app.include_router(notifications.router,    prefix=PREFIX)
app.include_router(dashboard.router,        prefix=PREFIX)

# Admin, maps, files, system
app.include_router(admin.router,            prefix=PREFIX)
app.include_router(maps.router,             prefix=PREFIX)
app.include_router(files.router,            prefix=PREFIX)
app.include_router(system.router,           prefix=PREFIX)

# Webhooks & WebSocket
app.include_router(webhooks.router,         prefix=PREFIX)
app.include_router(ws.router)


@app.get("/api/v1/health")
def health_root():
    from app.routers.system import health_check
    return health_check()
>>>>>>> 82ea429cf7a4f2f184df450b98ade63816a05528
