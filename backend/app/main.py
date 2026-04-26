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


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
