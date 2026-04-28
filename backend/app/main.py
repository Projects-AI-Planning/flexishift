from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.routers import (
    admin,
    auth,
    availability,
    bookings,
    compliance,
    compliance_flat,
    dashboard,
    documents,
    files,
    invoices,
    jobs,
    maps,
    notifications,
    payments,
    profile,
    quotes,
    ratings,
    supplier,
    suppliers,
    system,
    tracking,
    users,
    webhooks,
    ws,
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
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": False,
            "code": exc.status_code,
            "message": exc.detail,
            "data": None,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "status": False,
            "code": 422,
            "message": "Validation failed",
            "data": {
                "errors": [
                    {
                        "field": ".".join(str(loc) for loc in error["loc"][1:]),
                        "message": error["msg"],
                    }
                    for error in exc.errors()
                ]
            },
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "status": False,
            "code": 500,
            "message": "An unexpected error occurred",
            "data": None,
        },
    )


PREFIX = "/api/v1"

app.include_router(auth.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(profile.router, prefix=PREFIX)
app.include_router(documents.router, prefix=PREFIX)
app.include_router(availability.router, prefix=PREFIX)
app.include_router(supplier.router, prefix=PREFIX)
app.include_router(jobs.router, prefix=PREFIX)
app.include_router(quotes.router, prefix=PREFIX)
app.include_router(suppliers.router, prefix=PREFIX)
app.include_router(bookings.router, prefix=PREFIX)
app.include_router(payments.router, prefix=PREFIX)
app.include_router(payments.flat, prefix=PREFIX)
app.include_router(invoices.router, prefix=PREFIX)
app.include_router(compliance.router, prefix=PREFIX)
app.include_router(compliance_flat.router, prefix=PREFIX)
app.include_router(tracking.router, prefix=PREFIX)
app.include_router(tracking.flat, prefix=PREFIX)
app.include_router(ratings.router, prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)
app.include_router(maps.router, prefix=PREFIX)
app.include_router(files.router, prefix=PREFIX)
app.include_router(system.router, prefix=PREFIX)
app.include_router(webhooks.router, prefix=PREFIX)
app.include_router(ws.router)


@app.get("/api/v1/health")
def health_root():
    from app.routers.system import health_check

    return health_check()
