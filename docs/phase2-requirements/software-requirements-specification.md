# Software Requirements Specification (SRS) – FreightFlex

## 1. Introduction

### 1.1 Purpose
This SRS describes all functional and non-functional requirements for the FreightFlex platform. It is the primary reference for developers, QA engineers, and the product owner during design and development.

### 1.2 Scope
FreightFlex is a multi-role, cloud-based freight marketplace comprising:
- A responsive web application (Haulier and Admin)
- A mobile application (Driver, React Native)
- A RESTful backend API
- Real-time WebSocket layer (GPS tracking)
- Integration with Google Maps Platform and a licensed payment gateway

### 1.3 Definitions
| Term | Definition |
|---|---|
| Haulier | Organisation or individual that needs freight transported |
| Driver | Individual supplier who personally operates a vehicle |
| Firm | Company that owns and operates a fleet of vehicles |
| Supplier | Collective term for Driver or Firm |
| Job | A freight transport request posted by a Haulier |
| Quote | A fixed price submitted by a Supplier for a specific Job |
| Escrow | Funds held by the platform pending delivery approval |
| Load Code | A unique alphanumeric code assigned to a Job for pickup verification |

## 2. Overall Description

### 2.1 System Perspective
FreightFlex is a standalone SaaS product. It integrates with:
- **Google Maps Platform** (Geocoding, Directions, Distance Matrix)
- **Payment Gateway** (Razorpay or Stripe with escrow/nodal support)
- **Email Service** (SMTP / SendGrid for verification and notifications)
- **Push Notification Service** (Firebase Cloud Messaging)
- **Cloud Storage** (Azure Blob Storage for document and photo uploads)

### 2.2 User Classes
| Class | Interface | Primary Actions |
|---|---|---|
| Driver | Mobile App | View jobs, accept assignments, complete compliance steps, track earnings |
| Haulier | Web App | Post jobs, review quotes, book suppliers, approve delivery, track live |
| Admin | Web App | Verify suppliers, manage users, monitor jobs |

### 2.3 Operating Environment
- Web: Chrome 110+, Firefox 110+, Safari 16+, Edge 110+
- Mobile: Android 9+, iOS 14+
- Backend: Python 3.11+ with FastAPI on Linux containers (Docker / Azure Container Apps)
- Database: MySQL 8.0 (InnoDB engine, UTF8MB4 charset)
- Cache: Redis 7 (sessions, Pub/Sub, rate-limit counters)
- ORM / Migrations: SQLAlchemy 2.0 + Alembic

## 3. Functional Requirements

### 3.1 Epic 1 – User Management

#### FR-1.1 Registration
- FR-1.1.1: The system shall allow a new user to register with: full name, email address, phone number, password, and role selection (Driver / Haulier / Firm).
- FR-1.1.2: The system shall send a verification email after registration. The account shall remain inactive until the link is clicked.
- FR-1.1.3: The system shall reject registration if the email address already exists.
- FR-1.1.4: Passwords shall be a minimum of 8 characters, including at least one uppercase letter, one digit, and one special character.

#### FR-1.2 Login
- FR-1.2.1: The system shall authenticate users with email and password.
- FR-1.2.2: The system shall display a descriptive error for wrong credentials without revealing which field is incorrect.
- FR-1.2.3: The system shall provide a "Forgot Password" flow that sends a time-limited reset link to the registered email.
- FR-1.2.4: After successful login, the system shall redirect to the role-appropriate interface (Driver → Mobile App, Haulier → Web Dashboard, Admin → Admin Panel).

#### FR-1.3 Profile Setup
- FR-1.3.1: Driver profile shall require: full name, photo, driving licence number, and vehicle type.
- FR-1.3.2: Haulier profile shall require: company name, registered address, and contact number.
- FR-1.3.3: Firm profile shall require: fleet details and coverage area.
- FR-1.3.4: Users with incomplete mandatory profile fields shall be blocked from transactional actions (posting jobs, submitting quotes).

### 3.2 Epic 2 – Supplier Module

#### FR-2.1 Document Upload
- FR-2.1.1: Driver shall be able to upload: driving licence, vehicle registration certificate, and insurance document.
- FR-2.1.2: Firm shall be able to upload: company registration document and fleet insurance.
- FR-2.1.3: Uploaded documents shall be stored securely and accessible only to the uploader and Admin.
- FR-2.1.4: Admin shall be able to approve or reject each document submission with a reason.
- FR-2.1.5: Suppliers with unapproved documents shall not appear in matching results and cannot accept jobs.

#### FR-2.2 Availability Setup
- FR-2.2.1: A Driver shall be able to set available days of the week and time slots within each day.
- FR-2.2.2: A Driver shall be able to mark themselves as unavailable for a specific date range.
- FR-2.2.3: Unavailable drivers shall be excluded from supplier matching results.

### 3.3 Epic 3 – Job Posting & Matching

#### FR-3.1 Post a Job
- FR-3.1.1: Haulier shall enter: pickup address, drop address, goods type, weight (kg), required date, time slot, and vehicle type.
- FR-3.1.2: Addresses shall be validated via Google Maps Geocoding API. Invalid addresses shall be rejected.
- FR-3.1.3: The system shall automatically calculate and display route distance and estimated duration using Google Maps Directions API.
- FR-3.1.4: The system shall assign a unique alphanumeric job reference number on submission.
- FR-3.1.5: Job status shall be set to "Open" on creation.

#### FR-3.2 Supplier Matching
- FR-3.2.1: The system shall filter and display suppliers matching: proximity to pickup location, required vehicle type, driver availability on job date, and verification status (approved only).
- FR-3.2.2: Each matched supplier card shall display: name, vehicle type and registration, average star rating, and number of completed jobs.

#### FR-3.3 Submit Quote
- FR-3.3.1: Suppliers shall be able to browse all open jobs for which they are a matching candidate.
- FR-3.3.2: A supplier shall submit a single fixed-price quote (INR / GBP) per job.
- FR-3.3.3: The system shall prevent a second quote submission from the same supplier on the same job.
- FR-3.3.4: A supplier shall be able to edit their quote while the job status is "Open" and no booking has been made.

### 3.4 Epic 4 – Booking & Payment

#### FR-4.1 Select Supplier & Confirm Booking
- FR-4.1.1: Haulier shall be able to view all quotes for a job in a comparison table.
- FR-4.1.2: Haulier shall select exactly one supplier to book.
- FR-4.1.3: Job status shall change to "Booked" upon selection.
- FR-4.1.4: The selected supplier shall receive a push notification and email.
- FR-4.1.5: All other quoting suppliers shall receive a "not selected" notification.

#### FR-4.2 Escrow Payment
- FR-4.2.1: After selecting a supplier, the haulier shall be presented with a payment screen to deposit the agreed quote amount.
- FR-4.2.2: Accepted payment methods: UPI, debit/credit card, bank transfer.
- FR-4.2.3: Funds shall be held in escrow (nodal account) and not released to the supplier until delivery is approved.
- FR-4.2.4: The supplier's dashboard shall display a "Payment Secured" indicator once escrow is funded.

#### FR-4.3 Payment Release & Invoice
- FR-4.3.1: Payment shall be released to the supplier's registered bank account only after the haulier approves the delivery report.
- FR-4.3.2: The system shall auto-generate a PDF invoice containing: job reference, supplier name, agreed price, applicable tax breakdown (GST/VAT), and total amount.
- FR-4.3.3: Invoice shall be available for download by both haulier and supplier.

### 3.5 Epic 5 – Compliance Workflow

#### FR-5.1 Load Code Confirmation
- FR-5.1.1: The driver shall enter the load code (provided in the job details) at the pickup location.
- FR-5.1.2: The system shall validate the entered code against the job record.
- FR-5.1.3: On a successful match, Step 1 shall be marked complete and Step 2 unlocked.
- FR-5.1.4: On a mismatch, an error shall be displayed and the driver cannot proceed.

#### FR-5.2 Vehicle Handover Check
- FR-5.2.1: The driver shall complete a predefined vehicle checklist (e.g., tyres, lights, body condition).
- FR-5.2.2: The driver shall upload at least one vehicle condition photo.
- FR-5.2.3: The driver shall provide a digital signature.
- FR-5.2.4: The haulier shall provide a digital signature.
- FR-5.2.5: Both signatures are required before Step 2 is complete. Trip status shall change to "In Transit".

#### FR-5.3 Delivery Report & Approval
- FR-5.3.1: The driver shall submit: a delivery photo, recipient signature (drawn on screen), and optional delivery notes.
- FR-5.3.2: The haulier shall review the delivery report and either approve or raise a dispute.
- FR-5.3.3: Approval triggers payment release (FR-4.3.1) and sets job status to "Completed".
- FR-5.3.4: A dispute pauses payment release and opens a resolution workflow.

### 3.6 Epic 6 – Tracking & ETA

#### FR-6.1 Live GPS Tracking
- FR-6.1.1: The driver's mobile app shall transmit GPS coordinates to the server every 10–15 seconds during an active trip.
- FR-6.1.2: The haulier's dashboard shall display the truck's current position on a map in real time.
- FR-6.1.3: The planned route shall be drawn as a polyline on the map.
- FR-6.1.4: GPS tracking shall activate only when trip status is "In Transit" and deactivate on "Completed" or "Cancelled".

#### FR-6.2 ETA Display
- FR-6.2.1: The system shall display the current ETA to the drop location on the haulier dashboard.
- FR-6.2.2: ETA shall recalculate with each GPS update using Google Maps Directions API.
- FR-6.2.3: If the updated ETA deviates by more than 30 minutes from the original estimate, a delay alert shall be shown.

### 3.7 Epic 7 – Dashboards

#### FR-7.1 Driver Dashboard (Mobile)
- FR-7.1.1: Display current active job with status indicator.
- FR-7.1.2: List upcoming and past jobs.
- FR-7.1.3: Display total earnings summary (week / month / all-time).
- FR-7.1.4: Provide quick action buttons: Start Navigation, Update Status, Upload Proof.

#### FR-7.2 Haulier Dashboard (Web)
- FR-7.2.1: Display active jobs with live status badges.
- FR-7.2.2: Highlight jobs awaiting haulier approval.
- FR-7.2.3: Display total spend summary.
- FR-7.2.4: Provide a "Post New Job" button in the header.
- FR-7.2.5: Embed a live map widget showing all active deliveries.

#### FR-7.3 Admin Dashboard (Web)
- FR-7.3.1: Display platform KPIs: total registered users, total jobs, total platform revenue.
- FR-7.3.2: Show a list of suppliers with pending document verification.
- FR-7.3.3: Allow admin to verify, approve, reject, or suspend any user.
- FR-7.3.4: Provide a job monitoring table with filter by status.

### 3.8 Epic 8 – Ratings

#### FR-8.1 Rate After Job
- FR-8.1.1: After a job reaches "Completed" status, both the haulier and the driver shall be prompted to rate the other party.
- FR-8.1.2: Rating shall be a 1–5 star integer, with an optional free-text review field.
- FR-8.1.3: The average rating shall be displayed on the rated user's public profile.
- FR-8.1.4: The system shall enforce a maximum of one rating per user per job.

## 4. Non-Functional Requirements

### 4.1 Performance
| Requirement | Target |
|---|---|
| API response time (95th percentile) | ≤ 500 ms |
| GPS location update latency (server side) | ≤ 2 seconds from client send |
| Page load time (web, 4G connection) | ≤ 3 seconds |
| Concurrent active users supported (Phase 1) | 500 |

### 4.2 Security
- All data in transit must be encrypted via TLS 1.2+.
- Passwords must be hashed using bcrypt (cost factor ≥ 12).
- JWT tokens must expire after 24 hours; refresh tokens after 30 days.
- All file uploads must be scanned for malware before storage.
- Role-based access control (RBAC) must be enforced on every API endpoint.

### 4.3 Availability
- Platform availability SLA: 99.5% uptime (Phase 1).
- Planned maintenance window: Sundays 02:00–04:00 local time.

### 4.4 Scalability
- Architecture must support horizontal scaling of API and WebSocket services.
- Database connection pooling must be configured for peak loads.

### 4.5 Usability
- WCAG 2.1 AA accessibility compliance for web interfaces.
- Mobile app must support offline mode for compliance step form-fills (sync on reconnect).

### 4.6 Data Retention
- Job records and associated documents: 7 years (regulatory).
- GPS location history: 90 days.
- User account data: until account deletion + 30-day grace period.

## 5. External Interface Requirements
| Interface | Protocol | Format |
|---|---|---|
| Google Maps Geocoding | HTTPS REST | JSON |
| Google Maps Directions | HTTPS REST | JSON |
| Payment Gateway | HTTPS REST + Webhooks | JSON |
| Firebase Cloud Messaging | HTTPS REST | JSON |
| Email (SendGrid) | HTTPS REST | JSON |
| Cloud Storage (Azure Blob Storage) | HTTPS REST / SDK | Binary |

## 6. Approval
| Name | Role | Signature | Date |
|---|---|---|---|
| | Product Owner | | |
| | Development Lead | | |
| | QA Lead | | |
