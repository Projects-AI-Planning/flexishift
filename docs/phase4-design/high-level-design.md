# High-Level Design (HLD) – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | High-Level Design (HLD) / System Architecture |
| Version | 1.0 |
| Date | 2026-04-25 |
| Author | Development Lead |

## 2. Architecture Overview

FreightFlex follows a **three-tier, microservice-ready monolith** architecture for Phase 1, designed to be split into microservices in Phase 2 without re-architecture.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Haulier Web │  │  Admin Web   │  │  Driver Mobile   │  │
│  │  (React.js)  │  │  (React.js)  │  │ (React Native)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     CDN / Load Balancer                     │
│                  (AWS CloudFront / ALB)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────┐             ┌──────────────────┐
│   REST API      │             │  WebSocket Server │
│  (Node.js /     │             │  (Socket.IO)      │
│   FastAPI)      │             │  GPS Tracking     │
│  Port 443       │             │  Port 443 /ws     │
└────────┬────────┘             └────────┬──────────┘
         │                              │
         ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────────┐  │
│  │ Auth       │ │ Job &      │ │  Payment & Compliance  │  │
│  │ Service    │ │ Matching   │ │  Service               │  │
│  │            │ │ Service    │ │                        │  │
│  └────────────┘ └────────────┘ └────────────────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────────┐  │
│  │ Supplier   │ │ Tracking   │ │  Notification          │  │
│  │ Service    │ │ Service    │ │  Service               │  │
│  └────────────┘ └────────────┘ └────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────┐    ┌──────────────┐   ┌─────────────────┐
│ PostgreSQL  │    │   Redis      │   │  Cloud Storage  │
│ (Primary DB)│    │  (Cache +    │   │  (AWS S3 / GCS) │
│             │    │  Sessions +  │   │  Documents,     │
│             │    │  Pub/Sub)    │   │  Photos, PDFs   │
└─────────────┘    └──────────────┘   └─────────────────┘

         EXTERNAL INTEGRATIONS
┌──────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────┐
│ Google Maps  │ │  Razorpay / │ │  Firebase    │ │ SendGrid │
│ Platform     │ │  Stripe     │ │  Cloud Msg   │ │ (Email)  │
│ (Geocoding,  │ │  (Payment + │ │  (Push Notif)│ │          │
│  Directions) │ │   Escrow)   │ │              │ │          │
└──────────────┘ └─────────────┘ └──────────────┘ └──────────┘
```

## 3. Component Descriptions

### 3.1 Client Applications
| Component | Technology | Responsibility |
|---|---|---|
| Haulier Web App | React.js + TypeScript | Job posting, quote comparison, booking, payment, haulier dashboard, live map |
| Admin Web App | React.js + TypeScript | User management, document verification, job monitoring, platform KPIs |
| Driver Mobile App | React Native | Job browsing, quote submission, compliance steps, GPS tracking (background), earnings |

### 3.2 API Gateway / Load Balancer
- AWS Application Load Balancer (ALB) routes traffic to REST API and WebSocket server.
- AWS CloudFront serves static assets (web build) with edge caching.
- SSL termination at the load balancer.

### 3.3 REST API Server
- **Runtime:** Node.js 20 LTS with Express.js (or FastAPI if Python selected).
- **Authentication:** JWT (access token, 24h) + refresh token (30 days, stored in Redis).
- **Routing:** Versioned routes `/api/v1/...`.
- **Middleware:** Auth guard, role guard, rate limiter, request logger, error handler.
- **Containerisation:** Docker image deployed to AWS ECS (Fargate) or GKE.

### 3.4 WebSocket Server
- **Runtime:** Node.js with Socket.IO.
- **Purpose:** Real-time GPS location broadcast from Driver app to Haulier dashboard.
- **Rooms:** Each active job has a dedicated Socket.IO room (`job:<jobId>`).
- **Scaling:** Redis Pub/Sub adapter for multi-instance deployments.

### 3.5 Application Services (Logical Modules)
| Service | Key Responsibilities |
|---|---|
| Auth Service | Registration, login, JWT issuance, password reset, email verification |
| User / Profile Service | Profile CRUD, profile completeness flag |
| Supplier Service | Document upload, verification status, availability management |
| Job Service | Job creation, geocoding, distance calculation, job lifecycle (status transitions) |
| Matching Service | Filter and rank suppliers by location, vehicle type, availability, verification |
| Quote Service | Quote CRUD, one-per-supplier enforcement |
| Booking Service | Booking confirmation, status transitions, notification triggers |
| Payment Service | Escrow initiation, webhook handling, payment release, invoice generation |
| Compliance Service | Load code verification, checklist, dual signature, delivery report, dispute management |
| Tracking Service | GPS coordinate storage, ETA calculation, delay detection |
| Notification Service | Push (FCM), email (SendGrid) dispatch |
| Rating Service | Rating CRUD, average calculation |
| Admin Service | Dashboard KPIs, user management actions |

### 3.6 Database (PostgreSQL)
- Primary relational store for all business entities.
- Connection pooling via PgBouncer.
- Read replica for analytics and dashboard queries.
- See Database Design Document for full schema.

### 3.7 Cache (Redis)
- Session / refresh token store.
- Geocoding result cache (reduce Maps API calls).
- Socket.IO Pub/Sub adapter.
- Rate-limiting counters.

### 3.8 Cloud Storage (AWS S3 / GCS)
- Driver documents (licence, registration, insurance).
- Vehicle condition photos.
- Delivery proof photos.
- Generated PDF invoices.
- Pre-signed URLs used for secure, time-limited download access.

## 4. Data Flow – Key Journeys

### 4.1 Job Posting Flow
```
Haulier fills form → FE sends POST /api/v1/jobs
→ API geocodes addresses (Google Maps)
→ Calculates distance (Google Directions)
→ Saves job to DB (status = Open)
→ Returns job ref number to FE
```

### 4.2 Live GPS Tracking Flow
```
Driver app sends GPS coords every 10-15s via WebSocket
→ Tracking Service stores coordinate in DB
→ Broadcasts to job room (job:<jobId>)
→ Haulier web app receives event → updates map marker
→ ETA recalculated via Google Directions API
→ If delay > 30 min → Notification Service sends push to haulier
```

### 4.3 Payment Release Flow
```
Haulier approves delivery report → POST /api/v1/jobs/:id/approve
→ Compliance Service marks Step 3 complete
→ Payment Service triggers payout via gateway API
→ DB: payment_status = Released, job status = Completed
→ Invoice Service generates PDF → stored in S3
→ Notification Service: push + email to supplier (payment released)
→ Rating prompts sent to both parties
```

## 5. Deployment Architecture
| Environment | Infrastructure | Purpose |
|---|---|---|
| Development | Local Docker Compose | Developer local env |
| Staging | AWS ECS (Fargate) + RDS PostgreSQL | Integration testing, UAT |
| Production | AWS ECS (Fargate) + RDS PostgreSQL Multi-AZ | Live platform |

## 6. Security Architecture
- All HTTP traffic redirected to HTTPS.
- JWT tokens signed with RS256 (asymmetric keys).
- File uploads restricted to PDF, JPG, PNG; max 10 MB; virus scanned.
- RBAC enforced at API middleware layer for all endpoints.
- Secrets stored in AWS Secrets Manager / GCP Secret Manager.
- Database credentials rotated via secrets manager.
- CORS restricted to approved origins.

## 7. Scalability Strategy
| Layer | Scaling Approach |
|---|---|
| REST API | Horizontal (ECS auto-scaling on CPU/memory) |
| WebSocket | Horizontal (Redis Pub/Sub adapter) |
| Database | Vertical first; read replica for analytics |
| Cache | Redis cluster mode for Phase 2 |
| Static assets | CDN edge caching |
