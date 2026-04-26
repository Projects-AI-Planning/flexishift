from fastapi import FastAPI, Request
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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={
        "success": False,
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "errors": [
            {"field": ".".join(str(l) for l in e["loc"][1:]), "message": e["msg"]}
            for e in exc.errors()
        ],
    })


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={
        "success": False,
        "code": "INTERNAL_ERROR",
        "message": "An unexpected error occurred",
    })


PREFIX = "/api/v1"
app.include_router(auth.router,          prefix=PREFIX)
app.include_router(users.router,         prefix=PREFIX)
app.include_router(documents.router,     prefix=PREFIX)
app.include_router(availability.router,  prefix=PREFIX)
app.include_router(suppliers.router,     prefix=PREFIX)
app.include_router(jobs.router,          prefix=PREFIX)
app.include_router(payments.router,      prefix=PREFIX)
app.include_router(compliance.router,    prefix=PREFIX)
app.include_router(tracking.router,      prefix=PREFIX)
app.include_router(ratings.router,       prefix=PREFIX)
app.include_router(dashboard.router,     prefix=PREFIX)
app.include_router(admin.router,         prefix=PREFIX)
app.include_router(webhooks.router,      prefix=PREFIX)
app.include_router(maps.router,          prefix=PREFIX)
app.include_router(bookings.router,      prefix=PREFIX)
app.include_router(invoices.router,      prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)
app.include_router(ws.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
