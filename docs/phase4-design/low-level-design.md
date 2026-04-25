# Low-Level Design (LLD) – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Low-Level Design (LLD) |
| Version | 1.0 |
| Date | 2026-04-25 |
| Author | Development Lead |

## 2. Purpose
Describes the internal logic, class/module structure, algorithms, and data contracts for key FreightFlex services.

---

## 3. Module: Auth Service

### 3.1 Responsibilities
- User registration with email verification
- JWT issuance (access + refresh)
- Password hashing and reset flow
- Role-based redirect logic

### 3.2 Key Functions
```
registerUser(input: RegisterDTO): Promise<void>
  - Validate input (class-validator)
  - Check email uniqueness → throw ConflictException if duplicate
  - Hash password: bcrypt.hash(password, 12)
  - Create user record (status = INACTIVE)
  - Generate verificationToken = crypto.randomBytes(32).toString('hex')
  - Store token hash in DB with expiry (24h)
  - Send verification email via NotificationService

verifyEmail(token: string): Promise<void>
  - Hash incoming token; find matching record not expired
  - Set user.status = ACTIVE; clear token

login(email, password): Promise<{ accessToken, refreshToken }>
  - Find user by email; throw UnauthorizedException if not found
  - bcrypt.compare(password, hash); throw if mismatch
  - Generate accessToken: jwt.sign({ sub: userId, role }, privateKey, { expiresIn: '24h', algorithm: 'RS256' })
  - Generate refreshToken: uuid v4; store hash in Redis (TTL 30d)
  - Return both tokens

refreshAccessToken(refreshToken): Promise<string>
  - Hash token; check Redis; throw if not found/expired
  - Issue new accessToken

resetPassword(token, newPassword): Promise<void>
  - Validate token; hash new password; update user; invalidate all refresh tokens for user
```

### 3.3 Middleware: authGuard
```
authGuard(req, res, next)
  - Extract Bearer token from Authorization header
  - jwt.verify(token, publicKey); attach decoded payload to req.user
  - next() or throw 401

roleGuard(allowedRoles: Role[])
  - Check req.user.role in allowedRoles → next() or throw 403
```

---

## 4. Module: Job Service

### 4.1 Key Functions
```
createJob(haulierId, input: CreateJobDTO): Promise<Job>
  - Validate Haulier profile complete
  - Geocode pickup and drop via MapsService.geocode()
  - Calculate distance/duration via MapsService.getDirections()
  - Generate jobRef: 'FF-' + nanoid(8).toUpperCase()
  - Generate loadCode: crypto.randomBytes(3).toString('hex').toUpperCase()  // 6-char hex
  - Insert job record (status = OPEN)
  - Return job with ref and load code

getMatchedSuppliers(jobId): Promise<SupplierMatch[]>
  - Load job (vehicle type, pickup lat/lng, date)
  - Query suppliers:
      WHERE verified = true
        AND available on job date
        AND vehicle_type matches
        AND ST_Distance(location, pickup_point) < MAX_RADIUS_KM
  - Order by distance ASC, avg_rating DESC
  - Return supplier summaries

transitionStatus(jobId, newStatus, actorId, actorRole)
  - Validate allowed transition (see FSM below)
  - Update job.status; record transition log
  - Trigger relevant notifications

Job Status FSM:
  OPEN → BOOKED (haulier selects supplier)
  BOOKED → PAYMENT_PENDING (payment initiated)
  PAYMENT_PENDING → PAYMENT_SECURED (escrow webhook)
  PAYMENT_SECURED → IN_TRANSIT (compliance step 2 complete)
  IN_TRANSIT → DELIVERY_SUBMITTED (driver submits delivery report)
  DELIVERY_SUBMITTED → COMPLETED (haulier approves)
  DELIVERY_SUBMITTED → DISPUTED (haulier disputes)
  Any non-terminal → CANCELLED (by haulier before IN_TRANSIT)
```

---

## 5. Module: Matching Service

### 5.1 Algorithm
```
matchSuppliers(job: Job): SupplierMatch[]
  1. Build filter:
     - verified = true
     - not_available.date NOT IN job.date
     - supplier.vehicle_types CONTAINS job.vehicle_type
  2. Spatial filter:
     - Use PostGIS ST_DWithin(supplier.location, job.pickup_point, 100km)
     - Or Haversine formula if PostGIS not available
  3. Sort:
     - Primary: distance ASC
     - Secondary: avg_rating DESC
     - Tertiary: completed_jobs DESC
  4. Return top 20 matches with fields:
     { supplierId, name, vehicleType, vehicleReg, avgRating, jobCount, distanceKm }
```

---

## 6. Module: Payment Service

### 6.1 Escrow Initiation
```
initiateEscrow(jobId, haulierId): Promise<PaymentOrder>
  - Load job; verify status = BOOKED; verify caller is haulier
  - Load accepted quote for job
  - Create order at Razorpay/Stripe:
      amount = quote.price (in smallest currency unit)
      currency = 'INR' | 'GBP'
      notes = { jobId, jobRef }
  - Store order_id, status = PENDING in payments table
  - Return { orderId, paymentUrl }

handleWebhook(body, signature): Promise<void>
  - Verify HMAC signature (gateway secret)
  - Parse event type:
      'payment.captured' → updatePaymentStatus(orderId, ESCROWED)
      'payment.failed'   → updatePaymentStatus(orderId, FAILED); notify haulier
  - Idempotency: check if event already processed (event_id in DB)

releasePayment(jobId): Promise<void>
  - Verify job.status = COMPLETED
  - Initiate payout to supplier.bankAccountId via gateway payout API
  - Update payment.status = RELEASED
  - Call InvoiceService.generate(jobId)
  - Notify supplier
```

### 6.2 Invoice Generation
```
generateInvoice(jobId): Promise<string>  // returns S3 URL
  - Load job, quote, haulier, supplier
  - Calculate tax (GST 18% or VAT 20% based on jurisdiction flag)
  - Render HTML template with data
  - Convert to PDF via Puppeteer / pdfmake
  - Upload PDF to S3 with path: invoices/{jobRef}.pdf
  - Store S3 URL in job.invoice_url
  - Return pre-signed URL (expiry 7 days, refreshable)
```

---

## 7. Module: Compliance Service

### 7.1 Step State Machine
```
Step 1 – Load Code:
  driver enters code → verify vs job.load_code
  match: compliance.step1 = COMPLETE; unlock step 2
  no match: return error; driver stays at step 1

Step 2 – Handover Check:
  driver submits checklist + photos → compliance.checklist = SUBMITTED
  driver signs → compliance.driver_signed = true
  haulier signs → compliance.haulier_signed = true
  both signed → compliance.step2 = COMPLETE; job.status = IN_TRANSIT

Step 3 – Delivery Report:
  driver submits photo + recipient sig + notes → compliance.delivery_submitted = true
  haulier approves → job.status = COMPLETED; PaymentService.releasePayment()
  haulier disputes → job.status = DISPUTED; DisputeService.open()
```

---

## 8. Module: Tracking Service

### 8.1 GPS Ingestion (WebSocket)
```
onLocationUpdate(socket, { jobId, lat, lng, timestamp })
  - Verify socket authenticated and driver assigned to jobId
  - Verify job.status = IN_TRANSIT
  - Store { jobId, lat, lng, timestamp } in tracking_points table
  - redis.publish(`job:${jobId}:location`, { lat, lng, timestamp })
  - SocketIO room `job:${jobId}` broadcasts to all haulier sockets in room

onJobRoomJoin(socket, { jobId })  // Haulier connects
  - Verify haulier owns jobId
  - socket.join(`job:${jobId}`)
  - Return last known location from DB
```

### 8.2 ETA Calculation
```
calculateETA(jobId): Promise<ETAResult>
  - Load last tracking_point for jobId
  - Load job.drop_lat, job.drop_lng
  - Call Google Maps Directions API (origin = last point, dest = drop)
  - Return { durationMinutes, arrivalTime }
  - Compare with job.original_eta; if delta > 30 min → send delay alert
```

---

## 9. Module: Notification Service

### 9.1 Dispatch Logic
```
send(userId, notification: Notification): Promise<void>
  - Load user.push_token (if push)
  - Load user.email (if email)
  - Route to appropriate adapter:
      PUSH  → FCMAdapter.send(push_token, title, body, data)
      EMAIL → SendGridAdapter.send(email, template_id, dynamic_data)
  - Store notification record in DB (for in-app notification centre)
  - Retry up to 3 times with exponential backoff on failure
```

---

## 10. Error Handling Standards
| Scenario | HTTP Status | Error Code | Message |
|---|---|---|---|
| Validation error | 400 | VALIDATION_ERROR | Field-level errors array |
| Unauthenticated | 401 | UNAUTHORIZED | "Authentication required" |
| Forbidden | 403 | FORBIDDEN | "Insufficient permissions" |
| Resource not found | 404 | NOT_FOUND | "Resource not found" |
| Conflict (duplicate) | 409 | CONFLICT | "Email already registered" |
| Unprocessable | 422 | UNPROCESSABLE | Business rule violation detail |
| Rate limit exceeded | 429 | RATE_LIMITED | "Too many requests" |
| Internal error | 500 | INTERNAL_ERROR | "An unexpected error occurred" |

All error responses follow the shape:
```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email format" }]
}
```

## 11. Logging Standards
- Use structured JSON logging (pino / winston).
- Every request logged: `{ requestId, method, path, statusCode, durationMs, userId }`.
- Errors logged with full stack trace.
- Sensitive fields (password, token, card number) masked before logging.
- Log levels: ERROR, WARN, INFO, DEBUG (INFO in prod, DEBUG in dev/staging).
