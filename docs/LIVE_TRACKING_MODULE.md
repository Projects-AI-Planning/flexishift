# FlexiShift – Live Location Tracking Module
## Technical Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [REST API Endpoints](#4-rest-api-endpoints)
5. [WebSocket API](#5-websocket-api)
6. [ETA & Route Calculation](#6-eta--route-calculation)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Mobile Integration](#8-mobile-integration)
9. [Incident Reporting](#9-incident-reporting)
10. [Coupling & Dependencies](#10-coupling--dependencies)
11. [File Reference](#11-file-reference)

---

## 1. Overview

The live location tracking system gives real-time GPS visibility of drivers during active freight jobs. It connects the **FlexiShift driver mobile app**, the **FastAPI backend**, and the **haulier web dashboard** into a single data pipeline that runs for the duration of a job's `IN_TRANSIT` phase.

**What it does:**
- Receives GPS coordinates from the driver's device at regular intervals
- Persists every location point to the database
- Broadcasts updates to all WebSocket subscribers watching that job
- Calculates ETA and remaining distance using Google Maps (with haversine fallback)
- Detects delays and triggers notifications to the haulier
- Gates all operations behind job status and supplier assignment checks

**What it does NOT do:**
- It does not maintain a continuous GPS stream from the device (mobile sends via REST polling)
- It does not process payments or compliance steps itself (those are separate modules)
- It does not expose public endpoints — all routes require JWT authentication

---

## 2. Architecture

```
Driver App (React Native)
  │
  │  POST /tracking/update-location  (every N seconds while IN_TRANSIT)
  │  POST /tracking/start/{job_id}
  │  POST /tracking/stop/{job_id}
  │  GET  /tracking/eta/{job_id}
  ▼
FastAPI Backend
  ├── routers/tracking.py      ← HTTP route handlers
  ├── services/tracking.py     ← Business logic + DB writes + broadcast trigger
  ├── services/eta.py          ← Distance/duration calculation
  ├── services/maps.py         ← Google Maps API or haversine fallback
  ├── routers/ws.py            ← WebSocket endpoint
  └── core/connection_manager.py  ← In-memory connection pool
  │
  ├── PostgreSQL               ← tracking_points table
  └── WebSocket broadcast
        │
        ▼
  Haulier Web Dashboard (subscribes to /ws/jobs/{job_id}/tracking)
```

### Data Flow (single location update)

```
Driver App
  │  POST /tracking/update-location { jobId, latitude, longitude, recordedAt }
  ▼
tracking.py router  →  tracking service
  │  1. Verify job exists
  │  2. Verify supplier is assigned to job
  │  3. Verify job.status == IN_TRANSIT
  │  4. INSERT tracking_point into DB
  │  5. await manager.broadcast(job_id, { type: "tracking_update", lat, lng, ... })
  ▼
connection_manager.py
  │  Iterates all WebSocket connections subscribed to job_id
  ▼
Haulier Web Dashboard
  └── Updates truck marker on map
```

---

## 3. Database Schema

### `tracking_points` table

| Column       | Type             | Constraints           | Description                         |
|--------------|------------------|-----------------------|-------------------------------------|
| `id`         | VARCHAR (UUID)   | PRIMARY KEY           | Unique tracking point ID            |
| `job_id`     | VARCHAR (UUID)   | FK → jobs.id, NOT NULL | The job this location belongs to   |
| `lat`        | DECIMAL(10, 7)   | NOT NULL              | Latitude                            |
| `lng`        | DECIMAL(10, 7)   | NOT NULL              | Longitude                           |
| `recorded_at`| TIMESTAMP        | NOT NULL              | When the GPS reading was taken      |
| `created_at` | TIMESTAMP        | NOT NULL, DEFAULT NOW | When stored in database             |

### SQLAlchemy model (`backend/app/models/tracking.py`)

```python
class TrackingPoint(Base):
    __tablename__ = "tracking_points"

    id          = Column(String, primary_key=True, default=lambda: str(uuid4()))
    job_id      = Column(String, ForeignKey("jobs.id"), nullable=False)
    lat         = Column(Numeric(10, 7), nullable=False)
    lng         = Column(Numeric(10, 7), nullable=False)
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("Job", back_populates="tracking")
```

### Related `jobs` columns used by tracking

| Column               | Type        | Used by tracking for                          |
|----------------------|-------------|-----------------------------------------------|
| `id`                 | UUID        | Foreign key in tracking_points                |
| `status`             | JobStatus   | Guard: only accept updates when `IN_TRANSIT`  |
| `selected_supplier_id` | UUID      | Guard: only allow the assigned driver/firm    |
| `pickup_lat/lng`     | DECIMAL     | ETA calculation origin                        |
| `drop_lat/lng`       | DECIMAL     | ETA calculation destination                   |
| `original_eta`       | TIMESTAMP   | Delay detection (compare vs calculated ETA)   |

---

## 4. REST API Endpoints

All endpoints require a valid `Authorization: Bearer <JWT>` header unless noted.

### `POST /tracking/start/{job_id}`

Start a tracking session for a job. Transitions job status from `PAYMENT_SECURED` → `IN_TRANSIT` and notifies the haulier.

**Auth:** DRIVER or FIRM role; must be the assigned supplier on the job.

**Request body:** none required

**Response `200`:**
```json
{
  "message": "Tracking started",
  "job_id": "uuid",
  "started_at": "2026-05-17T10:00:00Z"
}
```

**Errors:**
- `403` – caller is not the assigned supplier
- `409` – job is not in a startable status

---

### `POST /tracking/update-location`

Driver sends current GPS coordinates. Persists a tracking point and broadcasts to WebSocket subscribers.

**Auth:** DRIVER or FIRM role; must be the assigned supplier on the job.

**Request body:**
```json
{
  "jobId": "uuid",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "speed": 60.5,
  "heading": 180.0,
  "accuracy": 5.0,
  "recordedAt": "2026-05-17T10:15:00Z"
}
```

**Response `201`:**
```json
{
  "id": "uuid",
  "job_id": "uuid",
  "lat": 51.5074,
  "lng": -0.1278,
  "recorded_at": "2026-05-17T10:15:00Z",
  "created_at": "2026-05-17T10:15:01Z"
}
```

**Errors:**
- `403` – caller is not the assigned supplier
- `409` – job is not `IN_TRANSIT`

---

### `GET /tracking/live/{job_id}`

Get the most recent location point for a job.

**Auth:** Any authenticated user.

**Response `200`:**
```json
{
  "trackingId": "uuid",
  "jobId": "uuid",
  "driver": {
    "id": "uuid",
    "name": "Driver Name"
  },
  "latitude": 51.5074,
  "longitude": -0.1278,
  "lastUpdatedAt": "2026-05-17T10:15:00Z"
}
```

---

### `GET /tracking/history/{job_id}`

Paginated history of all location points for a job, ordered by `recorded_at` ascending.

**Auth:** Any authenticated user.

**Query params:** `page` (default 1), `per_page` (default 50)

**Response `200`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "job_id": "uuid",
      "lat": 51.5074,
      "lng": -0.1278,
      "recorded_at": "2026-05-17T10:00:00Z",
      "created_at": "2026-05-17T10:00:01Z"
    }
  ],
  "total": 142,
  "page": 1,
  "per_page": 50
}
```

---

### `GET /tracking/eta/{job_id}`

Get ETA and remaining distance/duration from the driver's last known location to the drop-off point.

**Auth:** Any authenticated user.

**Response `200`:**
```json
{
  "current_lat": 51.5074,
  "current_lng": -0.1278,
  "destination_lat": 51.6,
  "destination_lng": -0.09,
  "remaining_distance_km": 18.4,
  "remaining_duration_min": 27,
  "eta": "2026-05-17T10:42:00Z",
  "original_eta": "2026-05-17T10:30:00Z",
  "is_delayed": true,
  "delay_minutes": 12
}
```

---

### `POST /tracking/stop/{job_id}`

Stop an active tracking session after the driver arrives.

**Auth:** DRIVER or FIRM role; must be the assigned supplier.

**Response `200`:**
```json
{
  "message": "Tracking stopped",
  "job_id": "uuid",
  "final_location": { "lat": 51.6, "lng": -0.09 },
  "session_duration_minutes": 47
}
```

---

### `POST /tracking/delay-alert/{job_id}`

Report a delivery delay. Sends a `DELAY_ALERT` notification to the haulier.

**Auth:** DRIVER or FIRM role; must be the assigned supplier.

**Request body:**
```json
{
  "delayMinutes": 30,
  "reason": "Heavy traffic on M25",
  "newEta": "2026-05-17T11:15:00Z"
}
```

**Response `200`:**
```json
{
  "message": "Delay alert sent",
  "notified_at": "2026-05-17T10:30:00Z"
}
```

---

### Alternate job-scoped routes

The same operations are also available prefixed under `/jobs/{job_id}/`:

| Method | Path                                  | Equivalent flat route              |
|--------|---------------------------------------|------------------------------------|
| POST   | `/jobs/{job_id}/tracking`             | POST `/tracking/update-location`   |
| GET    | `/jobs/{job_id}/tracking`             | GET `/tracking/history/{job_id}`   |
| POST   | `/jobs/{job_id}/tracking/start`       | POST `/tracking/start/{job_id}`    |
| POST   | `/jobs/{job_id}/tracking/stop`        | POST `/tracking/stop/{job_id}`     |
| POST   | `/jobs/{job_id}/tracking/delay-alert` | POST `/tracking/delay-alert/{job_id}` |

---

## 5. WebSocket API

### Endpoint

```
GET /ws/jobs/{job_id}/tracking?token=<JWT>
```

Upgrades to a WebSocket connection. The client subscribes to all location updates for a specific job. Used primarily by the haulier web dashboard to show a live-moving truck on a map.

**Auth:** JWT passed as query parameter `token`. Decoded before the connection is accepted — invalid or expired tokens are rejected immediately.

### Connection lifecycle

```
Client → Server:  HTTP GET /ws/jobs/{job_id}/tracking?token=...
Server → Client:  101 Switching Protocols (connection accepted)

[Every time a driver sends POST /tracking/update-location:]
Server → Client:  { "type": "tracking_update", "job_id": "...", "lat": ..., "lng": ..., "recorded_at": "..." }

Client → Server:  (optional ping frames to keep connection alive)

[When job ends or client disconnects:]
Server:           ConnectionManager.disconnect(job_id, websocket) — removes from pool
```

### Message format (server → client)

```json
{
  "type": "tracking_update",
  "job_id": "uuid",
  "lat": 51.5074,
  "lng": -0.1278,
  "recorded_at": "2026-05-17T10:15:00Z"
}
```

### ConnectionManager (`backend/app/core/connection_manager.py`)

The server uses an in-memory connection pool (no Redis/message broker in current deployment):

```python
class ConnectionManager:
    active: Dict[str, Set[WebSocket]]       # job_id → set of subscriber sockets
    user_active: Dict[str, Set[WebSocket]]  # user_id → set of notification sockets

    async def connect(job_id, websocket)    # Add to pool, accept WS
    def disconnect(job_id, websocket)       # Remove from pool
    async def broadcast(job_id, message)   # Send to all job subscribers
    async def connect_user(user_id, ws)    # Notification channel
    async def push_to_user(user_id, msg)   # Push to single user
```

### User notification WebSocket

```
GET /ws/notifications/live?token=<JWT>
```

Separate channel for per-user push notifications (new job offers, compliance alerts, payment events). Shares the same `ConnectionManager` but uses `user_active` instead of `active`.

---

## 6. ETA & Route Calculation

**File:** `backend/app/services/eta.py` and `backend/app/services/maps.py`

### Calculation flow

1. Fetch the most recent `TrackingPoint` for the job (current driver location)
2. Fetch `job.drop_lat` / `job.drop_lng` (destination)
3. Call `get_route_info(current_lat, current_lng, drop_lat, drop_lng)`
4. ETA = `now() + duration_minutes`
5. Compare ETA with `job.original_eta` — if difference > 15 minutes, set `is_delayed = True`

### Maps service (`backend/app/services/maps.py`)

```python
async def get_route_info(origin_lat, origin_lng, dest_lat, dest_lng) -> dict:
    if settings.GOOGLE_MAPS_API_KEY:
        # Call Google Distance Matrix API
        # Returns real road distance and driving duration
    else:
        # Haversine straight-line distance fallback
        distance_km = haversine_km(origin_lat, origin_lng, dest_lat, dest_lng)
        duration_min = distance_km * 1.5  # rough estimate
```

**Google Maps API key** is configured via `GOOGLE_MAPS_API_KEY` environment variable. If absent, the haversine fallback is used — accurate for distance, less accurate for duration in urban areas.

---

## 7. Authentication & Authorization

### JWT token structure

```json
{
  "sub": "user-uuid",
  "role": "DRIVER",
  "exp": 1747483200
}
```

Signed with HS256 (configurable to RS256). Created on login, expires after the configured TTL.

### Dependency injection (`backend/app/dependencies.py`)

```python
def get_current_user(token: str) -> User:
    payload = decode_access_token(token)   # raises 401 if invalid/expired
    user = db.query(User).get(payload["sub"])
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(403)
    return user

def require_role(*roles: Role):
    # Checks current_user.role is in the allowed set
    # Raises 403 if not
```

### Supplier check (tracking-specific)

Before accepting a location update or start/stop action, the service verifies:

```python
if job.selected_supplier_id != current_user.id:
    raise HTTPException(403, "Not the assigned supplier for this job")
```

This check runs in `services/tracking.py` on every mutating operation.

### Role access matrix

| Endpoint                        | DRIVER | FIRM | HAULIER | ADMIN |
|---------------------------------|--------|------|---------|-------|
| POST update-location            | ✓ (own job) | ✓ (own job) | — | ✓ |
| POST start/stop                 | ✓ (own job) | ✓ (own job) | — | ✓ |
| POST delay-alert                | ✓ (own job) | ✓ (own job) | — | ✓ |
| GET live/{job_id}               | ✓ | ✓ | ✓ | ✓ |
| GET history/{job_id}            | ✓ | ✓ | ✓ | ✓ |
| GET eta/{job_id}                | ✓ | ✓ | ✓ | ✓ |
| WebSocket /ws/jobs/{id}/tracking | ✓ | ✓ | ✓ | ✓ |

---

## 8. Mobile Integration

### API client (`mobile/src/api/driverApi.ts`)

```typescript
tracking: {
  start:          (jobId) => POST `/tracking/start/${jobId}`
  stop:           (jobId, payload) => POST `/tracking/stop/${jobId}`
  updateLocation: (payload) => POST `/tracking/update-location`
  getLive:        (jobId) => GET  `/tracking/live/${jobId}`
  getEta:         (jobId) => GET  `/tracking/eta/${jobId}`
}

incidents: {
  report: (payload) => POST `/tracking/incident`
}
```

All requests are handled by `mobile/src/api/client.ts` which:
- Auto-injects `Authorization: Bearer <JWT>` header from stored session
- Refreshes the access token on `401` responses via `refreshSessionHandler`
- Exposes `getNotificationsWebSocketUrl(token)` for the notification WebSocket

### State management (`mobile/src/DriverApp.tsx`)

Tracking data is loaded in parallel with the dashboard overview:

```typescript
const loadTracking = async () => {
  const overview = await driverApi.dashboard.getOverview();

  if (overview.activeJob?.jobId) {
    const [etaResult, complianceResult, liveResult] = await Promise.allSettled([
      driverApi.tracking.getEta(activeJob.jobId),
      driverApi.compliance.getFullStatus(activeJob.jobId),
      driverApi.tracking.getLive(activeJob.jobId),
    ]);

    setTrackingEta(etaResult.value);
    setComplianceStatus(complianceResult.value);
    setTrackingLiveLocation(liveResult.value);
  }
};
```

State is then passed as props down to `LiveTrackingScreen`.

### Driver actions wired in `DriverApp.tsx`

```typescript
handleUpdateLocation(location) → driverApi.tracking.updateLocation({ latitude, longitude, timestamp })
handleStopTracking()           → driverApi.tracking.stop(jobId, { reason: 'arrived_at_destination' })
                                  then navigate to compliance.delivery screen
handleIncidentReport(type, desc) → driverApi.incidents.report({ jobId, incidentType: type, description })
```

### `LiveTrackingScreen` props

```typescript
interface LiveTrackingScreenProps {
  activeJob:            any;                   // job metadata from dashboard
  trackingEta:          any;                   // ETA/distance from GET /tracking/eta
  trackingLiveLocation: {                      // from GET /tracking/live
    lastUpdatedAt?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  complianceStatus:     any;                   // step progress (load → handover → transit → delivery)
  onUpdateLocation:     (location: any) => void;
  onStopTracking:       () => void;
  onGoToLoadCode:       () => void;
  onGoToHandover:       () => void;
  onGoToDelivery:       () => void;
  onReportIncident:     () => void;
}
```

The screen renders:
- 4-step compliance progress bar (Arrived → Unload → Delivery → Done)
- Map with pickup, drop, and current location markers (`ActiveJobMap` component)
- ETA, remaining distance, and time metrics
- "Report Incident" and "Finish Trip" action buttons

---

## 9. Incident Reporting

### Endpoint

```
POST /tracking/incident
```

**Auth:** DRIVER or FIRM role; must be the assigned supplier.

**Request body:**
```json
{
  "jobId": "uuid",
  "incidentType": "breakdown",
  "description": "Rear tyre blowout on M6 near junction 15. Vehicle is safe. Waiting for recovery."
}
```

**Incident types accepted:**

| ID            | Label          |
|---------------|----------------|
| `accident`    | Accident       |
| `breakdown`   | Breakdown      |
| `delay`       | Delay          |
| `cargo_damage`| Cargo Issue    |
| `route_change`| Route Change   |
| `other`       | Other          |

**Constraints:**
- `incidentType` must be one of the values above
- `description` must be at least 10 characters

**Response `201`:** Confirmation with notification reference.

**Side effects:** Triggers a push notification to the haulier user via `manager.push_to_user(haulier_id, message)`.

---

## 10. Coupling & Dependencies

The live tracking module is not a standalone service. It depends on and is tightly integrated with the following FlexiShift-specific systems:

### 1. Job lifecycle state machine

Tracking is only active when `job.status == IN_TRANSIT`. This status is controlled by the compliance workflow:

```
OPEN → BOOKED → PAYMENT_SECURED → IN_TRANSIT → COMPLETED
                                      ↑
                          Triggered by POST /tracking/start/{job_id}
                          (which itself requires compliance steps 1 & 2 complete)
```

Tracking operations check `job.status` on every request. This means the tracking module reads and writes to the `jobs` table directly.

### 2. Supplier assignment model

Every tracking write operation verifies `job.selected_supplier_id == current_user.id`. This is FlexiShift's supplier/haulier relationship model — a structural concept that would need to be re-implemented entirely in any other system.

### 3. JWT user roles

The four roles (`DRIVER`, `FIRM`, `HAULIER`, `ADMIN`) are baked into the authorization logic throughout the tracking service. The WebSocket token auth also depends on the same JWT signing secret and payload structure.

### 4. Compliance workflow

The mobile `LiveTrackingScreen` displays a 4-step compliance progress bar (Load Code → Handover → In Transit → Delivery). The step state comes from `driverApi.compliance.getFullStatus()` loaded alongside the tracking data. The "Finish Trip" button navigates to the `compliance.delivery` screen, not just ends tracking.

### 5. Notification system

Delay alerts, incident reports, and tracking start/stop all trigger push notifications via `ConnectionManager.push_to_user()`. The notification recipient is derived from `job.haulier_id` — a FlexiShift-specific field. Extracting tracking without the notification system removes core operational value.

### 6. Google Maps API key

The ETA calculation calls the Google Distance Matrix API using `settings.GOOGLE_MAPS_API_KEY`. Without this key, ETA falls back to haversine (straight-line distance), which is significantly less accurate in real road conditions.

---

## 11. File Reference

| Layer | File | Purpose |
|-------|------|---------|
| **DB Model** | `backend/app/models/tracking.py` | `TrackingPoint` ORM model |
| **Pydantic Schemas** | `backend/app/schemas/tracking.py` | Request/response validation schemas |
| **Business Logic** | `backend/app/services/tracking.py` | Add point, list history, status guards, WS broadcast |
| **ETA Logic** | `backend/app/services/eta.py` | Distance/duration/delay calculation |
| **Maps Integration** | `backend/app/services/maps.py` | Google Maps API + haversine fallback |
| **HTTP Routes** | `backend/app/routers/tracking.py` | All REST endpoint handlers |
| **WebSocket Routes** | `backend/app/routers/ws.py` | WS endpoint for live location stream |
| **Connection Pool** | `backend/app/core/connection_manager.py` | In-memory WS connection management |
| **Auth Middleware** | `backend/app/dependencies.py` | `get_current_user`, `require_role` |
| **JWT** | `backend/app/core/security.py` | Token creation and validation |
| **Mobile Screen** | `mobile/src/screens/tracking/LiveTrackingScreen.tsx` | Driver tracking UI |
| **Mobile Screen** | `mobile/src/screens/tracking/IncidentReportScreen.tsx` | Incident reporting UI |
| **Map Component** | `mobile/src/components/map/ActiveJobMap.tsx` | Map with markers |
| **API Client** | `mobile/src/api/driverApi.ts` | Tracking API calls from mobile |
| **HTTP Client** | `mobile/src/api/client.ts` | JWT auth, token refresh, WS URL builder |
| **App Integration** | `mobile/src/DriverApp.tsx` | State management + event handlers for tracking |
| **Sequence Diagrams** | `docs/diagrams/08-live-tracking-eta-flow.md` | Visual data flow and lifecycle diagrams |

---

*Generated: 2026-05-17 — FlexiShift Driver Platform*
