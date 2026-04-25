# API Specification Document – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | API Specification Document |
| Version | 1.0 |
| Date | 2026-04-25 |
| Author | Backend Development Lead |
| Format | RESTful JSON API (OpenAPI 3.0 compatible) |

## 2. General Conventions

### 2.1 Base URL
```
Production:  https://api.freightflex.io/api/v1
Staging:     https://staging-api.freightflex.io/api/v1
Development: http://localhost:3000/api/v1
```

### 2.2 Authentication
All endpoints except `/auth/*` require a Bearer token in the Authorization header:
```
Authorization: Bearer <accessToken>
```

### 2.3 Standard Response Envelope
```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 150 }  // pagination only
}

// Error
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

### 2.4 Pagination
List endpoints accept `?page=1&limit=20`. Default limit: 20. Max limit: 100.

### 2.5 Date/Time Format
ISO 8601: `2026-04-25T09:30:00Z` (UTC)

---

## 3. Authentication Endpoints

### POST /auth/register
Register a new user.
```
Request Body:
{
  "fullName": "Rajesh Kumar",
  "email": "rajesh@example.com",
  "phone": "+919876543210",
  "password": "SecurePass1!",
  "role": "HAULIER"  // DRIVER | HAULIER | FIRM
}

Response 201:
{
  "success": true,
  "data": { "message": "Registration successful. Please verify your email." }
}

Errors: 400 VALIDATION_ERROR, 409 CONFLICT (email exists)
```

### POST /auth/verify-email
Verify email with token from email link.
```
Request Body: { "token": "abc123..." }
Response 200: { "success": true, "data": { "message": "Email verified." } }
Errors: 400 INVALID_TOKEN, 410 TOKEN_EXPIRED
```

### POST /auth/login
```
Request Body: { "email": "...", "password": "..." }

Response 200:
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "uuid-v4-...",
    "user": { "id": "uuid", "role": "HAULIER", "profileComplete": false }
  }
}

Errors: 401 INVALID_CREDENTIALS, 403 ACCOUNT_INACTIVE
```

### POST /auth/refresh
```
Request Body: { "refreshToken": "uuid-v4-..." }
Response 200: { "success": true, "data": { "accessToken": "eyJ..." } }
Errors: 401 INVALID_REFRESH_TOKEN
```

### POST /auth/forgot-password
```
Request Body: { "email": "..." }
Response 200: { "success": true, "data": { "message": "Reset link sent." } }
```

### POST /auth/reset-password
```
Request Body: { "token": "...", "newPassword": "NewPass1!" }
Response 200: { "success": true, "data": { "message": "Password reset." } }
Errors: 400 INVALID_TOKEN, 410 TOKEN_EXPIRED
```

### POST /auth/logout
```
Request Body: { "refreshToken": "..." }
Response 200: { "success": true }
```

---

## 4. User & Profile Endpoints

### GET /users/me
Returns current user's profile.
```
Response 200:
{
  "success": true,
  "data": {
    "id": "uuid", "fullName": "...", "email": "...", "role": "...",
    "status": "ACTIVE", "verified": false, "profileComplete": true,
    "avgRating": 4.7, "completedJobs": 42,
    "profile": { ... role-specific fields ... }
  }
}
```

### PUT /users/me/profile
Update profile (role-specific fields).
```
Request Body (Driver): { "licenceNumber": "...", "vehicleType": "HGV", "vehicleRegistration": "..." }
Request Body (Haulier): { "companyName": "...", "companyAddress": "...", "contactNumber": "..." }
Request Body (Firm): { "fleetDetails": {...}, "coverageArea": "..." }
Response 200: { "success": true, "data": { "profileComplete": true } }
```

### POST /users/me/profile/photo
Upload profile photo (multipart/form-data, field: `photo`).
```
Response 200: { "success": true, "data": { "photoUrl": "https://..." } }
```

---

## 5. Supplier Endpoints

### POST /suppliers/documents
Upload a verification document (multipart/form-data).
```
Form fields:
  - docType: DRIVING_LICENCE | VEHICLE_REG | VEHICLE_INSURANCE | COMPANY_REG | FLEET_INSURANCE
  - file: (binary, max 10MB, PDF/JPG/PNG)

Response 201:
{
  "success": true,
  "data": { "documentId": "uuid", "status": "PENDING" }
}
```

### GET /suppliers/documents
List own documents and their verification status.
```
Response 200:
{
  "success": true,
  "data": [
    { "id": "uuid", "docType": "DRIVING_LICENCE", "status": "APPROVED", "uploadedAt": "..." },
    ...
  ]
}
```

### GET /suppliers/availability
Get own availability schedule.

### PUT /suppliers/availability
Set weekly availability.
```
Request Body:
{
  "slots": [
    { "dayOfWeek": 0, "startTime": "08:00", "endTime": "17:00" },
    { "dayOfWeek": 1, "startTime": "08:00", "endTime": "17:00" }
  ]
}
Response 200: { "success": true }
```

### POST /suppliers/availability/blocks
Block a date range (unavailable).
```
Request Body: { "blockStart": "2026-05-01", "blockEnd": "2026-05-07", "reason": "Holiday" }
Response 201: { "success": true, "data": { "blockId": "uuid" } }
```

### DELETE /suppliers/availability/blocks/:blockId
Remove a date block.

---

## 6. Job Endpoints

### POST /jobs
Post a new freight job. (Role: HAULIER)
```
Request Body:
{
  "pickupAddress": "123 Main St, Mumbai",
  "dropAddress": "456 Port Rd, Chennai",
  "goodsType": "Machinery",
  "weightKg": 5000,
  "vehicleType": "HGV",
  "jobDate": "2026-05-15",
  "timeSlot": "MORNING"  // MORNING | AFTERNOON | EVENING | FULL_DAY
}

Response 201:
{
  "success": true,
  "data": {
    "jobId": "uuid", "jobRef": "FF-A1B2C3D4",
    "distanceKm": 1338.5, "durationMin": 960,
    "pickupLat": 19.076, "pickupLng": 72.877,
    "dropLat": 13.082, "dropLng": 80.270,
    "status": "OPEN"
  }
}
Errors: 400 INVALID_ADDRESS, 403 PROFILE_INCOMPLETE
```

### GET /jobs
List jobs. Role-based:
- HAULIER: own posted jobs
- DRIVER/FIRM: open jobs matching their profile (supplier view)
- ADMIN: all jobs

Query params: `?status=OPEN&page=1&limit=20`

### GET /jobs/:jobId
Get single job details.

### GET /jobs/:jobId/matches
Get matched suppliers for a job. (Role: HAULIER)
```
Response 200:
{
  "success": true,
  "data": [
    {
      "supplierId": "uuid", "name": "Priya Sharma",
      "vehicleType": "HGV", "vehicleRegistration": "MH12AB1234",
      "avgRating": 4.8, "completedJobs": 67,
      "distanceKm": 12.3, "quote": { "quoteId": "uuid", "price": 45000 }
    }
  ]
}
```

---

## 7. Quote Endpoints

### POST /jobs/:jobId/quotes
Submit a quote. (Role: DRIVER | FIRM)
```
Request Body: { "price": 45000, "currency": "INR" }
Response 201: { "success": true, "data": { "quoteId": "uuid", "status": "ACTIVE" } }
Errors: 409 QUOTE_ALREADY_EXISTS, 422 JOB_NOT_OPEN
```

### PUT /jobs/:jobId/quotes/:quoteId
Edit own quote (before booking).
```
Request Body: { "price": 43000 }
Response 200: { "success": true }
Errors: 422 JOB_ALREADY_BOOKED
```

---

## 8. Booking Endpoints

### POST /jobs/:jobId/book
Select a supplier and confirm booking. (Role: HAULIER)
```
Request Body: { "quoteId": "uuid" }
Response 200:
{
  "success": true,
  "data": { "jobId": "uuid", "status": "BOOKED", "selectedSupplierId": "uuid" }
}
Errors: 404 QUOTE_NOT_FOUND, 422 JOB_NOT_OPEN
```

---

## 9. Payment Endpoints

### POST /jobs/:jobId/payment/initiate
Initiate escrow payment. (Role: HAULIER)
```
Response 201:
{
  "success": true,
  "data": {
    "orderId": "order_xyz",
    "amount": 45000,
    "currency": "INR",
    "paymentUrl": "https://checkout.razorpay.com/..."
  }
}
```

### POST /webhooks/payment
Receive payment gateway webhook (no auth — HMAC signature verified in handler).
```
Headers: X-Razorpay-Signature: <hmac>
Body: { "event": "payment.captured", "payload": { ... } }
Response 200: { "status": "ok" }
```

### GET /jobs/:jobId/invoice
Get invoice download URL.
```
Response 200:
{
  "success": true,
  "data": { "invoiceUrl": "https://s3.amazonaws.com/...?presigned..." }
}
```

---

## 10. Compliance Endpoints

### POST /jobs/:jobId/compliance/load-code
Step 1: Verify load code. (Role: DRIVER)
```
Request Body: { "code": "4F9A2B" }
Response 200: { "success": true, "data": { "step1Complete": true } }
Errors: 422 LOAD_CODE_MISMATCH
```

### POST /jobs/:jobId/compliance/handover
Step 2: Submit vehicle checklist + photos. (Role: DRIVER)
```
Multipart form:
  - checklistData: JSON string
  - photos: multiple files (min 1)
Response 200: { "success": true, "data": { "awaitingSignatures": true } }
```

### POST /jobs/:jobId/compliance/sign/driver
Driver digital signature. (Role: DRIVER)
```
Multipart form: signatureImage (file, PNG)
Response 200: { "success": true, "data": { "driverSigned": true } }
```

### POST /jobs/:jobId/compliance/sign/haulier
Haulier digital signature. (Role: HAULIER)
```
Multipart form: signatureImage (file, PNG)
Response 200:
{
  "success": true,
  "data": { "step2Complete": true, "jobStatus": "IN_TRANSIT" }
}
```

### POST /jobs/:jobId/compliance/delivery
Step 3: Submit delivery report. (Role: DRIVER)
```
Multipart form:
  - deliveryPhoto (file, required)
  - recipientSignature (file, required)
  - notes (text, optional)
Response 200: { "success": true, "data": { "deliverySubmitted": true } }
```

### POST /jobs/:jobId/compliance/approve
Haulier approves delivery. (Role: HAULIER)
```
Response 200: { "success": true, "data": { "jobStatus": "COMPLETED", "paymentReleased": true } }
```

### POST /jobs/:jobId/compliance/dispute
Haulier disputes delivery. (Role: HAULIER)
```
Request Body: { "reason": "Goods damaged in transit." }
Response 200: { "success": true, "data": { "jobStatus": "DISPUTED" } }
```

---

## 11. Tracking Endpoints

### GET /jobs/:jobId/tracking/latest
Get latest GPS location for a job. (Role: HAULIER)
```
Response 200:
{
  "success": true,
  "data": { "lat": 20.5937, "lng": 78.9629, "recordedAt": "2026-05-15T10:42:00Z" }
}
```

### GET /jobs/:jobId/tracking/eta
Get current ETA.
```
Response 200:
{
  "success": true,
  "data": { "durationMinutes": 145, "arrivalTime": "2026-05-15T14:30:00Z", "delayMinutes": 35 }
}
```

---

## 12. Rating Endpoints

### POST /jobs/:jobId/ratings
Submit a rating after job completion.
```
Request Body: { "stars": 5, "reviewText": "Excellent driver, on time." }
Response 201: { "success": true, "data": { "ratingId": "uuid" } }
Errors: 409 ALREADY_RATED, 422 JOB_NOT_COMPLETED
```

### GET /users/:userId/ratings
Get a user's rating summary and recent reviews.
```
Response 200:
{
  "success": true,
  "data": {
    "avgRating": 4.8, "totalRatings": 67,
    "reviews": [ { "stars": 5, "reviewText": "...", "createdAt": "..." } ]
  }
}
```

---

## 13. Admin Endpoints

### GET /admin/users
List all users with filter options.
Query params: `?role=DRIVER&status=ACTIVE&verified=false`

### PUT /admin/users/:userId/verify
Mark supplier as verified. (Role: ADMIN)
```
Response 200: { "success": true }
```

### PUT /admin/users/:userId/suspend
Suspend a user. (Role: ADMIN)
```
Request Body: { "reason": "Policy violation." }
Response 200: { "success": true }
```

### PUT /admin/documents/:documentId/review
Approve or reject a document. (Role: ADMIN)
```
Request Body: { "action": "APPROVE" }  // or "REJECT"
Request Body (reject): { "action": "REJECT", "reason": "Image blurry. Re-upload required." }
Response 200: { "success": true }
```

### GET /admin/stats
Platform KPI summary.
```
Response 200:
{
  "success": true,
  "data": {
    "totalUsers": 1250, "totalJobs": 4300, "completedJobs": 3890,
    "platformRevenueMonthly": 150000, "pendingVerifications": 12
  }
}
```

---

## 14. WebSocket Events (Socket.IO)

### Connection
```
URL: wss://api.freightflex.io
Auth: Handshake query param: ?token=<accessToken>
```

### Client → Server Events
| Event | Payload | Who Emits | Description |
|---|---|---|---|
| `join_job_room` | `{ jobId }` | Haulier | Subscribe to live updates for a job |
| `leave_job_room` | `{ jobId }` | Haulier | Unsubscribe |
| `location_update` | `{ jobId, lat, lng, timestamp }` | Driver | Transmit GPS position |

### Server → Client Events
| Event | Payload | Who Receives | Description |
|---|---|---|---|
| `location_updated` | `{ lat, lng, timestamp }` | Haulier (in job room) | New driver position |
| `eta_updated` | `{ durationMinutes, arrivalTime }` | Haulier | Recalculated ETA |
| `delay_alert` | `{ delayMinutes, newEta }` | Haulier | Significant delay detected |
| `job_status_changed` | `{ jobId, newStatus }` | Both parties in room | Job status transition |

---

## 15. Rate Limits
| Endpoint Group | Limit | Window |
|---|---|---|
| POST /auth/login | 10 requests | Per 15 minutes per IP |
| POST /auth/forgot-password | 3 requests | Per hour per IP |
| POST /jobs | 50 requests | Per hour per user |
| All other endpoints | 300 requests | Per minute per user |
| WebSocket connections | 1 per user | Per active job |
