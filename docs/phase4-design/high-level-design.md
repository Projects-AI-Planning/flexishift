# High-Level Design (HLD) – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | High-Level Design (HLD) / System Architecture |
| Version | 2.0 |
| Date | 2026-04-25 |
| Author | Development Lead |
| Stack | Python FastAPI · React.js · React Native · MySQL 8.0 · Redis 7 |

## 2. Architecture Overview

FreightFlex follows a **three-tier, service-modular monolith** architecture for Phase 1, designed to extract into microservices in Phase 2 without re-architecture.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Haulier Web │  │  Admin Web   │  │  Driver Mobile   │  │
│  │  (React.js   │  │  (React.js   │  │ (React Native)   │  │
│  │  TypeScript) │  │  TypeScript) │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     CDN / Load Balancer                     │
│                  (Azure CDN / ALB)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────┐             ┌──────────────────┐
│   REST API      │             │  WebSocket Server │
│  Python FastAPI │             │  FastAPI WS       │
│  Uvicorn/Gunicorn│            │  + Redis Pub/Sub  │
│  Port 443       │             │  GPS Tracking     │
└────────┬────────┘             └────────┬──────────┘
         │                              │
         ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                APPLICATION / SERVICE LAYER                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────────┐  │
│  │ Auth       │ │ Job &      │ │  Payment & Compliance  │  │
│  │ Router     │ │ Matching   │ │  Router                │  │
│  │            │ │ Router     │ │                        │  │
│  └────────────┘ └────────────┘ └────────────────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────────┐  │
│  │ Supplier   │ │ Tracking   │ │  Notification          │  │
│  │ Router     │ │ WS Router  │ │  Service               │  │
│  └────────────┘ └────────────┘ └────────────────────────┘  │
│                                                             │
│  SQLAlchemy 2.0 ORM  ·  Pydantic v2 Schemas  ·  Alembic    │
└───────────────────────────────┬─────────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────┐
         ▼                      ▼                  ▼
┌─────────────┐      ┌──────────────┐   ┌─────────────────┐
│  MySQL 8.0  │      │   Redis 7    │   │  Cloud Storage  │
│  (InnoDB)   │      │  (Cache +    │   │  (Azure Blob Storage) │
│  Primary +  │      │  Sessions +  │   │  Documents,     │
│  Read Replica│     │  Pub/Sub +   │   │  Photos, PDFs   │
└─────────────┘      │  Rate limit) │   └─────────────────┘
                     └──────────────┘

         EXTERNAL INTEGRATIONS
┌──────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────┐
│ Google Maps  │ │  Razorpay / │ │  Firebase    │ │ SendGrid │
│ Platform     │ │  Stripe     │ │  Cloud Msg   │ │ (Email)  │
└──────────────┘ └─────────────┘ └──────────────┘ └──────────┘
```

## 3. Component Descriptions

### 3.1 Client Applications
| Component | Technology | Responsibility |
|---|---|---|
| Haulier Web App | React.js 18 + TypeScript + Vite | Job posting, quote comparison, booking, payment, haulier dashboard, live map |
| Admin Web App | React.js 18 + TypeScript + Vite | User management, document verification, job monitoring, platform KPIs |
| Driver Mobile App | React Native 0.73 + TypeScript | Job browsing, quote submission, compliance steps, GPS tracking (background), earnings |

**Key shared libraries:**
- State management: Zustand (web) / Zustand (mobile)
- HTTP client: Axios with interceptors (auto JWT refresh)
- Forms: React Hook Form + Zod validation
- Maps: `@react-google-maps/api` (web) / `react-native-maps` (mobile)
- WebSocket: native browser WebSocket API / `react-native` WebSocket

### 3.2 API Gateway / Load Balancer
- Azure Application Load Balancer (ALB) routes traffic to FastAPI REST and WebSocket containers.
- Azure CDN serves static assets (React build) with edge caching.
- SSL termination at the load balancer (ACM wildcard certificate).

### 3.3 REST API Server (FastAPI)
- **Runtime:** Python 3.11 + FastAPI 0.110+ + Uvicorn (ASGI)
- **Process manager:** Gunicorn with UvicornWorker (multi-process)
- **Authentication:** JWT (access token 24h, RS256) + refresh token stored as hash in Redis
- **Routing:** Versioned routers mounted at `/api/v1/`
- **Validation:** Pydantic v2 models on all request/response schemas
- **Middleware:** CORS, rate limiting (slowapi), JWT auth dependency, structured logging (structlog)
- **Containerisation:** Docker image → Azure Container Apps
- **Auto docs:** FastAPI auto-generates OpenAPI 3.0 docs at `/docs` (disabled in production)

### 3.4 WebSocket Server (FastAPI)
- **Runtime:** FastAPI built-in WebSocket support (ASGI async)
- **Purpose:** Real-time GPS location broadcast from Driver app to Haulier dashboard
- **Rooms (connection manager):** In-memory `ConnectionManager` class; Redis Pub/Sub for multi-instance scale
- **Auth:** JWT token passed as query param on WebSocket handshake
- **Scaling:** Redis channel `job:{jobId}:location` for Pub/Sub across container instances

### 3.5 Database (MySQL 8.0)
- **Engine:** InnoDB (ACID, row-level locking)
- **Charset:** `utf8mb4` (full Unicode + emoji)
- **Primary keys:** UUID stored as `CHAR(36)` or `BINARY(16)` (application generates via `uuid.uuid4()`)
- **Connection pooling:** SQLAlchemy `create_engine` with `pool_size=10, max_overflow=20`
- **Read replica:** For dashboard analytics and matching queries
- **Migrations:** Alembic (versioned, reversible)
- **Backups:** Azure Database for MySQL automated daily snapshots, 7-day retention

### 3.6 Cache (Redis 7)
- JWT refresh token store (`refresh:{token_hash}` → `user_id`, TTL 30 days)
- Geocoding result cache (`geocode:{address_hash}` → `lat,lng`, TTL 7 days)
- WebSocket Pub/Sub channels for GPS broadcast
- Rate-limiting counters (sliding window via `slowapi` + Redis)
- Session data for compliance workflow step state

### 3.7 Application Routers (FastAPI)
| Router | Mount Path | Responsibilities |
|---|---|---|
| `auth_router` | `/api/v1/auth` | Register, login, verify email, forgot/reset password, logout, refresh |
| `users_router` | `/api/v1/users` | Profile CRUD, photo upload |
| `suppliers_router` | `/api/v1/suppliers` | Document upload, availability management |
| `jobs_router` | `/api/v1/jobs` | Job CRUD, geocoding, distance calc, matching, quote management |
| `bookings_router` | `/api/v1/bookings` | Booking confirmation, status transitions |
| `payments_router` | `/api/v1/payments` | Escrow initiation, webhook handling, payout, invoice |
| `compliance_router` | `/api/v1/compliance` | Load code, handover, delivery report, approve/dispute |
| `tracking_router` | `/api/v1/tracking` | Latest location, ETA endpoint |
| `ratings_router` | `/api/v1/ratings` | Submit and retrieve ratings |
| `admin_router` | `/api/v1/admin` | Dashboard KPIs, user management, document review |
| `webhooks_router` | `/api/v1/webhooks` | Payment gateway webhook receiver |
| `ws_router` | `/ws` | WebSocket endpoint for GPS tracking |

### 3.8 Cloud Storage (Azure Blob Storage)
- Driver documents, vehicle photos, delivery proof photos, signatures.
- Generated PDF invoices (`invoices/{job_ref}.pdf`).
- Pre-signed URLs (time-limited 7 days) for secure download.
- Buckets with `Block Public Access` enforced.
- Server-side encryption (Azure SSE (AES-256)).

## 4. Data Flow – Key Journeys

### 4.1 Job Posting Flow
```
Haulier submits form → POST /api/v1/jobs
→ Pydantic schema validates all fields
→ GoogleMapsService.geocode(pickup_address) → lat/lng
→ GoogleMapsService.geocode(drop_address) → lat/lng
→ GoogleMapsService.get_directions(origin, destination) → distance_km, duration_min
→ JobService.create(haulier_id, validated_data) → generates job_ref, load_code
→ SQLAlchemy session.add(job); session.commit()
→ Returns JobResponse schema to client
```

### 4.2 Live GPS Tracking Flow
```
Driver app sends GPS coords via WebSocket every 10–15s
→ FastAPI WS endpoint: ws_router.location_update(job_id, lat, lng)
→ TrackingService.validate_job_in_transit(job_id)
→ SQLAlchemy: INSERT tracking_points
→ redis.publish(f"job:{job_id}:location", json.dumps({lat, lng, ts}))
→ ConnectionManager.broadcast_to_job(job_id, message)  ← via Redis subscriber
→ Haulier WebSocket client receives message → update map marker
→ ETAService.calculate(current_lat, current_lng, drop_lat, drop_lng) → Google Directions
→ If delay > 30 min → NotificationService.send_delay_alert(haulier_id)
```

### 4.3 Payment Release Flow
```
Haulier approves → POST /api/v1/compliance/{job_id}/approve
→ ComplianceService.approve_delivery(job_id, haulier_id)
→ Validate job.status == IN_TRANSIT, compliance step 3 submitted
→ db.execute(UPDATE jobs SET status='COMPLETED')
→ PaymentService.release_payment(job_id)
→ RazorpayClient.create_payout(supplier.bank_account_id, amount)
→ db.execute(UPDATE payments SET status='RELEASED', released_at=now())
→ InvoiceService.generate_pdf(job_id) → WeasyPrint/ReportLab → upload Azure Blob
→ NotificationService.send(supplier_id, 'PAYMENT_RELEASED')
→ RatingService.create_prompts(job_id)
```

## 5. Deployment Architecture
| Environment | Infrastructure | Purpose |
|---|---|---|
| Development | Local Docker Compose (FastAPI + MySQL + Redis) | Developer local env |
| Staging | Azure Container Apps + RDS MySQL Multi-AZ | Integration testing, UAT |
| Production | Azure Container Apps + RDS MySQL Multi-AZ + Read Replica | Live platform |

## 6. Python Package Dependencies (Core)
```
fastapi==0.110.*
uvicorn[standard]==0.29.*
gunicorn==21.*
sqlalchemy==2.0.*
alembic==1.13.*
pymysql==1.1.*           # MySQL driver for SQLAlchemy
cryptography             # required by PyMySQL for SSL
pydantic[email]==2.6.*
pydantic-settings==2.2.* # env config via .env
python-jose[cryptography]==3.3.*  # JWT RS256
passlib[bcrypt]==1.7.*   # password hashing
python-multipart==0.0.*  # file uploads
azure-storage-blob==12.19.0*            # Azure Blob Storage
aioredis==2.0.*          # async Redis
httpx==0.27.*            # async HTTP (Google Maps, FCM, SendGrid)
slowapi==0.1.*           # rate limiting
structlog==24.*          # structured logging
weasyprint==62.*         # PDF invoice generation
python-dotenv==1.0.*     # local dev env
celery==5.3.*            # background tasks (email, notifications)
```

## 7. Security Architecture
- All HTTP traffic redirected to HTTPS (ALB + HSTS header).
- JWT tokens signed with RS256 (private key in Azure Key Vault).
- Passwords hashed via `passlib.hash.bcrypt` (rounds=12).
- File uploads: MIME type + magic-byte check, ClamAV scan, quarantine bucket.
- RBAC implemented as FastAPI `Depends(require_role([...]))` dependency.
- CORS restricted via FastAPI `CORSMiddleware` to approved origins.
- Secrets loaded via `pydantic-settings` from Azure Key Vault / env (never hardcoded).

## 8. Scalability Strategy
| Layer | Approach |
|---|---|
| FastAPI REST | Horizontal ECS auto-scaling (CPU/memory alarms) |
| FastAPI WebSocket | Horizontal + Redis Pub/Sub for cross-instance broadcast |
| MySQL | Vertical first; read replica for analytics and matching |
| Redis | Single instance Phase 1; Redis Cluster Phase 2 |
| File storage | Azure Blob Storage — unlimited scale |
| Background tasks | Celery + Redis broker (email, notifications, PDF generation) |
