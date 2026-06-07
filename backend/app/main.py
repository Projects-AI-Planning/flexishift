import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from pathlib import Path

_log = logging.getLogger(__name__)


async def _check_expired_documents() -> None:
    from app.database import SessionLocal
    from app.models.document import Document, DocStatus
    from app.models.notification import Notification
    from app.models.user import User, Role
    from app.services.notifications import create_notification

    db = SessionLocal()
    try:
        now = datetime.utcnow()
        window_start = now - timedelta(hours=25)

        newly_expired = (
            db.query(Document)
            .filter(
                Document.status == DocStatus.APPROVED,
                Document.expiry_date.isnot(None),
                Document.expiry_date >= window_start,
                Document.expiry_date <= now,
            )
            .all()
        )
        if not newly_expired:
            return

        # Build set of doc_ids already notified in the last 36 h to avoid duplicates
        notified_since = now - timedelta(hours=36)
        already_notified = {
            n.data.get("doc_id")
            for n in db.query(Notification).filter(
                Notification.type == "DOCUMENT_EXPIRED",
                Notification.created_at >= notified_since,
            ).all()
            if n.data and isinstance(n.data, dict)
        }

        admins = db.query(User).filter(User.role == Role.ADMIN).all()
        if not admins:
            return

        for doc in newly_expired:
            if doc.id in already_notified:
                continue
            owner = db.get(User, doc.user_id)
            owner_name = owner.full_name if owner else "Unknown User"
            doc_label = doc.doc_type.value.replace("_", " ").title()
            expiry_str = doc.expiry_date.strftime("%d %b %Y")
            for admin in admins:
                await create_notification(
                    db, admin.id, "DOCUMENT_EXPIRED",
                    "Document Expired",
                    f"{owner_name}'s {doc_label} expired on {expiry_str}.",
                    {"doc_id": doc.id, "doc_type": doc.doc_type.value, "user_id": doc.user_id},
                )
            db.commit()
    except Exception:
        _log.exception("expired_document_check_failed")
    finally:
        db.close()


async def _expiry_check_loop() -> None:
    await asyncio.sleep(15)  # let the server fully start first
    while True:
        await _check_expired_documents()
        await asyncio.sleep(24 * 3600)  # recheck every 24 hours


@asynccontextmanager
async def lifespan(_app: FastAPI):
    task = asyncio.create_task(_expiry_check_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

from app.core.logging_config import configure_logging
configure_logging()   # must run before any structlog usage

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
    fleet,
    invoices,
    jobs,
    local_storage,
    maps,
    notifications,
    payments,
    profile,
    quotes,
    ratings,
    shifts,
    stripe_connect,
    support,
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
    lifespan=lifespan,
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

allowed_origins = {
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8081",
}
if settings.FRONTEND_URL:
    allowed_origins.add(settings.FRONTEND_URL.rstrip("/"))
if settings.CORS_ALLOWED_ORIGINS:
    allowed_origins.update(
        origin.strip().rstrip("/")
        for origin in settings.CORS_ALLOWED_ORIGINS.split(",")
        if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.middleware.logging_middleware import LoggingMiddleware
app.add_middleware(LoggingMiddleware)

uploads_dir = Path(__file__).resolve().parent / "static" / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


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
    import traceback, sys
    traceback.print_exc(file=sys.stderr)
    msg = f"{type(exc).__name__}: {exc}" if settings.APP_ENV != "production" else "An unexpected error occurred"
    return JSONResponse(
        status_code=500,
        content={
            "status": False,
            "code": 500,
            "message": msg,
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
app.include_router(shifts.router, prefix=PREFIX)
app.include_router(stripe_connect.router, prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)
app.include_router(support.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)
app.include_router(maps.router, prefix=PREFIX)
app.include_router(files.router, prefix=PREFIX)
app.include_router(local_storage.router, prefix=PREFIX)
app.include_router(fleet.router, prefix=PREFIX)
app.include_router(system.router, prefix=PREFIX)
app.include_router(webhooks.router, prefix=PREFIX)
app.include_router(ws.router)


@app.get("/api/v1/health")
def health_root():
    from app.routers.system import health_check

    return health_check()
