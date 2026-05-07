# Low-Level Design (LLD) – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Low-Level Design (LLD) |
| Version | 2.0 |
| Date | 2026-04-25 |
| Author | Development Lead |
| Stack | Python 3.11 · FastAPI 0.110 · SQLAlchemy 2.0 · MySQL 8.0 · Pydantic v2 |

## 2. Project Structure

```
freightflex-api/
├── app/
│   ├── main.py                 # FastAPI app factory, router mounts, middleware
│   ├── config.py               # pydantic-settings: env vars, secrets
│   ├── database.py             # SQLAlchemy engine, SessionLocal, Base
│   ├── dependencies.py         # Shared FastAPI Depends (get_db, get_current_user, require_role)
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── job.py
│   │   ├── quote.py
│   │   ├── payment.py
│   │   ├── compliance.py
│   │   ├── tracking.py
│   │   └── rating.py
│   ├── schemas/                # Pydantic request/response models
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── job.py
│   │   ├── payment.py
│   │   └── ...
│   ├── routers/                # FastAPI APIRouter per domain
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── suppliers.py
│   │   ├── jobs.py
│   │   ├── payments.py
│   │   ├── compliance.py
│   │   ├── tracking.py
│   │   ├── ratings.py
│   │   ├── admin.py
│   │   ├── webhooks.py
│   │   └── ws.py               # WebSocket endpoint
│   ├── services/               # Business logic (pure Python, no HTTP concern)
│   │   ├── auth_service.py
│   │   ├── job_service.py
│   │   ├── matching_service.py
│   │   ├── payment_service.py
│   │   ├── compliance_service.py
│   │   ├── tracking_service.py
│   │   ├── notification_service.py
│   │   ├── invoice_service.py
│   │   └── maps_service.py
│   ├── core/
│   │   ├── security.py         # JWT, bcrypt, token helpers
│   │   ├── connection_manager.py  # WebSocket room manager
│   │   └── exceptions.py       # Custom HTTP exceptions
│   └── tasks/                  # Celery background tasks
│       ├── email_tasks.py
│       └── notification_tasks.py
├── alembic/                    # Database migrations
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── docker-compose.yml          # dev: FastAPI + MySQL + Redis
└── requirements.txt
```

---

## 3. Core Infrastructure

### 3.1 `app/database.py` – SQLAlchemy + MySQL
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,           # mysql+pymysql://user:pass@host/db
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,              # reconnect on stale connections
    pool_recycle=3600,               # recycle every 1h (MySQL wait_timeout)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 3.2 `app/config.py` – Pydantic Settings
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str                    # mysql+pymysql://...
    REDIS_URL: str                       # redis://...
    JWT_PRIVATE_KEY: str                 # RS256 PEM (from Secrets Manager)
    JWT_PUBLIC_KEY: str
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    AZURE_STORAGE_ACCOUNT_NAME: str
    AZURE_STORAGE_ACCOUNT_KEY: str
    AZURE_CONTAINER_DOCS: str
    AZURE_CONTAINER_INVOICES: str
    GOOGLE_MAPS_API_KEY: str
    RAZORPAY_KEY_ID: str
    RAZORPAY_KEY_SECRET: str
    SENDGRID_API_KEY: str
    FCM_SERVER_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()
```

### 3.3 `app/core/security.py` – JWT & Password
```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": user_id, "role": role, "exp": expire},
        settings.JWT_PRIVATE_KEY,
        algorithm="RS256",
    )

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=["RS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

### 3.4 `app/dependencies.py` – FastAPI Auth Dependencies
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.security import decode_access_token
from app.database import get_db
from app.models.user import User, Role

bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(credentials.credentials)
    user = db.get(User, payload["sub"])
    if not user or user.status != "ACTIVE":
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

def require_role(*roles: Role):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker
```

---

## 4. Module: Auth Service

### 4.1 `app/services/auth_service.py`
```python
import hashlib, secrets
from uuid import uuid4
from sqlalchemy.orm import Session
from app.models.user import User, UserStatus
from app.models.email_verification import EmailVerification
from app.core.security import hash_password, verify_password, create_access_token
from app.tasks.email_tasks import send_verification_email
import aioredis

async def register_user(db: Session, redis: aioredis.Redis, data: RegisterRequest) -> None:
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(409, "Email already registered")

    user = User(
        id=str(uuid4()),
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        password_hash=hash_password(data.password),
        role=data.role,
        status=UserStatus.INACTIVE,
    )
    db.add(user)

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    verification = EmailVerification(
        id=str(uuid4()),
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(verification)
    db.commit()

    send_verification_email.delay(user.email, raw_token)   # Celery task

async def verify_email(db: Session, token: str) -> None:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    record = (
        db.query(EmailVerification)
        .filter(
            EmailVerification.token_hash == token_hash,
            EmailVerification.used_at.is_(None),
            EmailVerification.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not record:
        raise HTTPException(410, "Verification link expired or already used")

    db.execute(
        update(User).where(User.id == record.user_id).values(status=UserStatus.ACTIVE)
    )
    record.used_at = datetime.now(timezone.utc)
    db.commit()

async def login(db: Session, redis: aioredis.Redis, email: str, password: str) -> TokenPair:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    if user.status == UserStatus.INACTIVE:
        raise HTTPException(403, "Please verify your email first")
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(403, "Account suspended")

    access_token = create_access_token(user.id, user.role)
    refresh_token = secrets.token_urlsafe(32)
    rt_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    await redis.setex(
        f"refresh:{rt_hash}",
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        user.id,
    )
    return TokenPair(access_token=access_token, refresh_token=refresh_token)
```

---

## 5. Module: Job Service

### 5.1 `app/services/job_service.py`
```python
import nanoid, secrets
from app.services.maps_service import geocode, get_directions

async def create_job(db: Session, haulier_id: str, data: CreateJobRequest) -> Job:
    # Profile completeness gate
    user = db.get(User, haulier_id)
    if not user.profile_complete:
        raise HTTPException(403, "Complete your profile before posting a job")

    pickup = await geocode(data.pickup_address)        # returns (lat, lng)
    drop = await geocode(data.drop_address)
    route = await get_directions(pickup, drop)          # returns (distance_km, duration_min)

    job_ref = "FF-" + nanoid.generate(size=8).upper()
    load_code = secrets.token_hex(3).upper()            # 6-char hex e.g. "4F9A2B"

    job = Job(
        id=str(uuid4()),
        haulier_id=haulier_id,
        job_ref=job_ref,
        load_code=load_code,
        pickup_address=data.pickup_address,
        pickup_lat=pickup[0], pickup_lng=pickup[1],
        drop_address=data.drop_address,
        drop_lat=drop[0], drop_lng=drop[1],
        goods_type=data.goods_type,
        weight_kg=data.weight_kg,
        vehicle_type=data.vehicle_type,
        job_date=data.job_date,
        time_slot=data.time_slot,
        distance_km=route["distance_km"],
        duration_min=route["duration_min"],
        status=JobStatus.OPEN,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job

def transition_status(db: Session, job_id: str, new_status: JobStatus, actor_id: str) -> Job:
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    # FSM: validate allowed transition
    ALLOWED = {
        JobStatus.OPEN: [JobStatus.BOOKED, JobStatus.CANCELLED],
        JobStatus.BOOKED: [JobStatus.PAYMENT_PENDING, JobStatus.CANCELLED],
        JobStatus.PAYMENT_PENDING: [JobStatus.PAYMENT_SECURED, JobStatus.BOOKED],
        JobStatus.PAYMENT_SECURED: [JobStatus.IN_TRANSIT, JobStatus.CANCELLED],
        JobStatus.IN_TRANSIT: [JobStatus.DELIVERY_SUBMITTED],
        JobStatus.DELIVERY_SUBMITTED: [JobStatus.COMPLETED, JobStatus.DISPUTED],
        JobStatus.DISPUTED: [JobStatus.COMPLETED, JobStatus.CANCELLED],
    }
    if new_status not in ALLOWED.get(job.status, []):
        raise HTTPException(422, f"Cannot transition from {job.status} to {new_status}")
    job.status = new_status
    db.commit()
    return job
```

---

## 6. Module: Matching Service

### 6.1 `app/services/matching_service.py`
```python
from math import radians, cos, sin, asin, sqrt

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance in km (no PostGIS needed with MySQL)."""
    R = 6371
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)**2
    return R * 2 * asin(sqrt(a))

def get_matched_suppliers(db: Session, job: Job) -> list[SupplierMatch]:
    # Load verified, role-appropriate suppliers
    candidates = (
        db.query(User)
        .filter(
            User.role.in_([Role.DRIVER, Role.FIRM]),
            User.verified == True,
            User.status == UserStatus.ACTIVE,
        )
        .all()
    )

    # Filter by vehicle type, availability, and proximity
    matches = []
    for supplier in candidates:
        if not _has_vehicle_type(db, supplier.id, job.vehicle_type):
            continue
        if not _is_available(db, supplier.id, job.job_date):
            continue
        dist = haversine_km(supplier.location_lat, supplier.location_lng,
                            job.pickup_lat, job.pickup_lng)
        if dist > 100:                              # 100km radius
            continue
        quote = _get_active_quote(db, supplier.id, job.id)
        matches.append(SupplierMatch(
            supplier_id=supplier.id,
            name=supplier.full_name,
            avg_rating=supplier.avg_rating,
            completed_jobs=supplier.completed_jobs,
            distance_km=round(dist, 1),
            quote=quote,
        ))

    return sorted(matches, key=lambda m: (m.distance_km, -m.avg_rating))[:20]
```

---

## 7. Module: Payment Service

### 7.1 `app/services/payment_service.py`
```python
import razorpay, hashlib, hmac

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

async def initiate_escrow(db: Session, job_id: str, haulier_id: str) -> PaymentOrder:
    job = db.get(Job, job_id)
    if job.haulier_id != haulier_id or job.status != JobStatus.BOOKED:
        raise HTTPException(422, "Job not eligible for payment")

    quote = (
        db.query(Quote)
        .filter(Quote.job_id == job_id, Quote.status == QuoteStatus.SELECTED)
        .first()
    )
    amount_paise = int(quote.price * 100)              # Razorpay uses smallest unit

    order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "notes": {"job_id": job_id, "job_ref": job.job_ref},
    })
    payment = Payment(
        id=str(uuid4()), job_id=job_id,
        gateway_order_id=order["id"],
        amount=quote.price, currency="INR",
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    db.commit()
    return PaymentOrder(order_id=order["id"], amount=quote.price, currency="INR")

async def handle_webhook(body: bytes, signature: str) -> None:
    # Verify HMAC-SHA256
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "Invalid webhook signature")

    event = json.loads(body)
    gateway_event_id = event["payload"]["payment"]["entity"]["id"]

    # Idempotency: skip if already processed
    if db.query(PaymentEvent).filter_by(gateway_event_id=gateway_event_id).first():
        return

    db.add(PaymentEvent(id=str(uuid4()), gateway_event_id=gateway_event_id,
                        event_type=event["event"]))

    if event["event"] == "payment.captured":
        order_id = event["payload"]["payment"]["entity"]["order_id"]
        payment = db.query(Payment).filter_by(gateway_order_id=order_id).first()
        payment.status = PaymentStatus.ESCROWED
        payment.escrowed_at = datetime.now(timezone.utc)
        db.execute(update(Job).where(Job.id == payment.job_id)
                   .values(status=JobStatus.PAYMENT_SECURED))
        db.commit()
        notify_supplier_payment_secured.delay(payment.job_id)
```

### 7.2 Invoice Generation
```python
from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader

async def generate_invoice(db: Session, job_id: str) -> str:
    job = db.get(Job, job_id)
    payment = db.query(Payment).filter_by(job_id=job_id).first()
    supplier = db.get(User, job.selected_supplier_id)
    haulier = db.get(User, job.haulier_id)

    tax_rate = Decimal("0.18")                          # GST 18%
    tax_amount = payment.amount * tax_rate
    total = payment.amount + tax_amount

    env = Environment(loader=FileSystemLoader("app/templates"))
    html = env.get_template("invoice.html").render(
        job=job, payment=payment,
        supplier=supplier, haulier=haulier,
        tax_rate=tax_rate, tax_amount=tax_amount, total=total,
    )
    pdf_bytes = HTML(string=html).write_pdf()

    key = f"invoices/{job.job_ref}.pdf"
    blob_client = BlobServiceClient.from_connection_string(azure_conn_str)
    blob_client.get_blob_client(settings.AZURE_CONTAINER_INVOICES, key).upload_blob(pdf_bytes, overwrite=True)
    url = f"https://{settings.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/{settings.AZURE_CONTAINER_INVOICES}/{key}"
    db.execute(update(Job).where(Job.id == job_id).values(invoice_url=url))
    db.commit()
    return url
```

---

## 8. Module: Compliance Service

### 8.1 `app/services/compliance_service.py`
```python
async def verify_load_code(db: Session, job_id: str, driver_id: str, code: str) -> bool:
    job = db.get(Job, job_id)
    if job.selected_supplier_id != driver_id:
        raise HTTPException(403, "Not assigned to this job")
    if job.status != JobStatus.PAYMENT_SECURED:
        raise HTTPException(422, "Job not ready for compliance")
    if code.upper() != job.load_code:
        raise HTTPException(422, "Load code does not match")

    record = db.query(ComplianceRecord).filter_by(job_id=job_id).first()
    record.step1_completed_at = datetime.now(timezone.utc)
    db.commit()
    return True

async def complete_dual_signoff(db: Session, job_id: str) -> None:
    """Called after either party signs — checks if both have signed."""
    record = db.query(ComplianceRecord).filter_by(job_id=job_id).first()
    if record.driver_signed_at and record.haulier_signed_at:
        record.step2_completed_at = datetime.now(timezone.utc)
        db.execute(update(Job).where(Job.id == job_id)
                   .values(status=JobStatus.IN_TRANSIT,
                           original_eta=_calculate_original_eta(db, job_id)))
        db.commit()
        # Activate GPS tracking
        await redis.set(f"tracking_active:{job_id}", "1")

async def approve_delivery(db: Session, job_id: str, haulier_id: str) -> None:
    job = db.get(Job, job_id)
    if job.haulier_id != haulier_id:
        raise HTTPException(403, "Not your job")
    if job.status != JobStatus.DELIVERY_SUBMITTED:
        raise HTTPException(422, "Delivery report not submitted yet")

    record = db.query(ComplianceRecord).filter_by(job_id=job_id).first()
    record.step3_approved_at = datetime.now(timezone.utc)
    db.execute(update(Job).where(Job.id == job_id)
               .values(status=JobStatus.COMPLETED))
    db.commit()
    await PaymentService.release_payment(db, job_id)
```

---

## 9. Module: WebSocket Tracking

### 9.1 `app/core/connection_manager.py`
```python
from fastapi import WebSocket
import aioredis, json

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, set[WebSocket]] = {}    # job_id → set of WS connections

    async def connect(self, job_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(job_id, set()).add(ws)

    def disconnect(self, job_id: str, ws: WebSocket):
        self.active.get(job_id, set()).discard(ws)

    async def broadcast(self, job_id: str, message: dict):
        dead = set()
        for ws in self.active.get(job_id, set()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        self.active.get(job_id, set()).difference_update(dead)

manager = ConnectionManager()
```

### 9.2 `app/routers/ws.py`
```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.connection_manager import manager
from app.services.tracking_service import record_location, calculate_eta
from app.core.security import decode_access_token

ws_router = APIRouter()

@ws_router.websocket("/ws/jobs/{job_id}/track")
async def tracking_endpoint(job_id: str, ws: WebSocket, token: str):
    payload = decode_access_token(token)
    await manager.connect(job_id, ws)
    try:
        while True:
            data = await ws.receive_json()
            if payload["role"] == "DRIVER" and data.get("type") == "location_update":
                await record_location(job_id, data["lat"], data["lng"])
                eta = await calculate_eta(job_id, data["lat"], data["lng"])
                await manager.broadcast(job_id, {
                    "type": "location_updated",
                    "lat": data["lat"], "lng": data["lng"],
                    "eta": eta,
                })
    except WebSocketDisconnect:
        manager.disconnect(job_id, ws)
```

---

## 10. Error Handling

### 10.1 Custom Exception Handlers
```python
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={
        "success": False, "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "errors": [{"field": ".".join(str(l) for l in e["loc"][1:]),
                    "message": e["msg"]} for e in exc.errors()],
    })

async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={
        "success": False, "code": exc.detail.upper().replace(" ", "_"),
        "message": exc.detail,
    })
```

---

## 11. Logging Standards
```python
import structlog

logger = structlog.get_logger()

# Every request logged via middleware:
# {"event": "request", "method": "POST", "path": "/api/v1/jobs",
#  "status": 201, "duration_ms": 145, "user_id": "uuid", "request_id": "uuid"}

# Sensitive fields never logged: password, token, card_number, bank_account_id
```

---

## 12. Alembic Migration Convention
```
alembic/versions/
  0001_create_users_table.py
  0002_create_jobs_table.py
  0003_create_quotes_table.py
  ...

# Run migration:
alembic upgrade head

# Generate new:
alembic revision --autogenerate -m "add_compliance_records_table"
```
