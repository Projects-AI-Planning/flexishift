# Functional Requirements Document (FRD) – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Functional Requirements Document (FRD) |
| Version | 1.0 |
| Date | 2026-04-25 |
| Author | Product Owner / Business Analyst |

## 2. Purpose
The FRD describes the discrete functions the FreightFlex system must perform. Each requirement is traceable to a business requirement (BR) and a user story.

## 3. Functional Requirement Catalogue

### Module 1: Authentication & User Management

| FR-ID | Function | Input | Process | Output | BR Ref | Story |
|---|---|---|---|---|---|---|
| FR-AUTH-01 | User Registration | Name, email, phone, password, role | Validate uniqueness; hash password; create user record; send verification email | Success screen + verification email | BR-001 | 1.1 |
| FR-AUTH-02 | Email Verification | Verification token (URL) | Validate token expiry and match; activate account | Account activated | BR-001 | 1.1 |
| FR-AUTH-03 | User Login | Email, password | Validate credentials; issue JWT + refresh token | JWT token; role-based redirect | BR-001 | 1.2 |
| FR-AUTH-04 | Forgot Password | Email address | Generate reset token; send reset email | Reset email sent | BR-001 | 1.2 |
| FR-AUTH-05 | Reset Password | Reset token, new password | Validate token; hash and update password | Password updated; old tokens invalidated | BR-001 | 1.2 |
| FR-AUTH-06 | Logout | JWT token | Invalidate refresh token | User logged out | BR-001 | 1.2 |
| FR-AUTH-07 | Profile Completion (Driver) | Name, photo, licence, vehicle type | Validate completeness; store; update profile_complete flag | Profile marked complete | BR-001 | 1.3 |
| FR-AUTH-08 | Profile Completion (Haulier) | Company name, address, contact | Validate completeness; store | Profile marked complete | BR-001 | 1.3 |
| FR-AUTH-09 | Profile Completion (Firm) | Fleet details, coverage area | Validate completeness; store | Profile marked complete | BR-001 | 1.3 |
| FR-AUTH-10 | Profile Completeness Gate | Action attempt | Check profile_complete flag | Allow or block with message | BR-001 | 1.3 |

### Module 2: Supplier Management

| FR-ID | Function | Input | Process | Output | BR Ref | Story |
|---|---|---|---|---|---|---|
| FR-SUP-01 | Document Upload (Driver) | Licence, registration, insurance files | Validate file type/size; scan; store in cloud; create pending verification record | Upload confirmation; status = Pending | BR-002 | 2.1 |
| FR-SUP-02 | Document Upload (Firm) | Company registration, fleet insurance files | As above | As above | BR-002 | 2.1 |
| FR-SUP-03 | Admin Document Review | Document ID | Display documents; allow Approve / Reject with reason | Supplier status updated; notification sent | BR-002 | 2.1 |
| FR-SUP-04 | Verification Gate | Job match or accept action | Check supplier verified flag | Allow or block with message | BR-002 | 2.1 |
| FR-SUP-05 | Availability Setup | Days, time slots | Store availability schedule; flag driver as available | Schedule saved | BR-002 | 2.2 |
| FR-SUP-06 | Mark Unavailable | Date range | Update availability; set unavailable flag | Driver excluded from matching | BR-002 | 2.2 |

### Module 3: Job Management

| FR-ID | Function | Input | Process | Output | BR Ref | Story |
|---|---|---|---|---|---|---|
| FR-JOB-01 | Post Job | Pickup/drop addr, goods type, weight, date/time, vehicle type | Geocode addresses; calculate distance; assign job ref; set status = Open | Job created with unique reference | BR-003 | 3.1 |
| FR-JOB-02 | Geocode Validation | Address string | Call Google Maps Geocoding API | Validated lat/lng or error | BR-003 | 3.1 |
| FR-JOB-03 | Distance Calculation | Origin lat/lng, destination lat/lng | Call Google Maps Directions API | Distance (km), duration (min) | BR-003 | 3.1 |
| FR-JOB-04 | Supplier Matching | Job ID | Filter verified, available suppliers by proximity and vehicle type | Ranked list of matched suppliers | BR-003 | 3.2 |
| FR-JOB-05 | Browse Open Jobs (Supplier) | Supplier ID | Return open jobs where supplier matches criteria | List of eligible jobs | BR-003 | 3.3 |
| FR-JOB-06 | Submit Quote | Job ID, supplier ID, price | Validate no existing quote; store quote; notify haulier | Quote submitted confirmation | BR-003 | 3.3 |
| FR-JOB-07 | Edit Quote | Quote ID, new price | Check job still Open and unboooked; update quote | Quote updated | BR-003 | 3.3 |

### Module 4: Booking & Payment

| FR-ID | Function | Input | Process | Output | BR Ref | Story |
|---|---|---|---|---|---|---|
| FR-BKG-01 | View Quotes | Job ID | Return all submitted quotes for job | Quote comparison list | BR-004 | 4.1 |
| FR-BKG-02 | Confirm Booking | Job ID, selected supplier ID | Set job status = Booked; notify selected and rejected suppliers | Booking confirmed | BR-004 | 4.1 |
| FR-BKG-03 | Initiate Escrow Payment | Job ID, payment method | Create payment order at gateway; redirect to payment page | Payment intent ID | BR-005 | 4.2 |
| FR-BKG-04 | Record Escrow Receipt | Payment gateway webhook | Validate signature; update job payment_status = Escrowed | Job payment secured | BR-005 | 4.2 |
| FR-BKG-05 | Display Payment Secured | Job ID | Check payment_status; return indicator | "Payment Secured" shown to supplier | BR-005 | 4.2 |
| FR-BKG-06 | Release Payment | Job ID | Trigger payout via gateway to supplier bank account; update payment_status = Released | Funds transferred; invoice generated | BR-005 | 4.3 |
| FR-BKG-07 | Generate Invoice | Job ID | Compile job ref, parties, price, tax, total; render PDF | PDF invoice stored and downloadable | BR-005 | 4.3 |

### Module 5: Compliance Workflow

| FR-ID | Function | Input | Process | Output | BR Ref | Story |
|---|---|---|---|---|---|---|
| FR-CMP-01 | Enter Load Code | Job ID, entered code | Compare with stored load code for job | Match → Step 1 complete; No match → error | BR-006 | 5.1 |
| FR-CMP-02 | Unlock Step 2 | Step 1 completion event | Set compliance.step2_unlocked = true | Step 2 form available to driver | BR-006 | 5.1 |
| FR-CMP-03 | Submit Vehicle Checklist | Checklist data, photo(s) | Store checklist; store photos; set checklist_submitted = true | Awaiting dual signature | BR-006 | 5.2 |
| FR-CMP-04 | Driver Digital Signature | Job ID, signature data | Store driver signature; check for haulier signature | Awaiting haulier if not signed | BR-006 | 5.2 |
| FR-CMP-05 | Haulier Digital Signature | Job ID, signature data | Store haulier signature; check driver signed | Both signed → Step 2 complete; trip = In Transit | BR-006 | 5.2 |
| FR-CMP-06 | Submit Delivery Report | Delivery photo, recipient sig, notes | Store delivery proof; notify haulier for approval | Delivery report submitted | BR-006 | 5.3 |
| FR-CMP-07 | Approve Delivery | Job ID | Set job status = Completed; trigger FR-BKG-06 | Payment released; job completed | BR-006 | 5.3 |
| FR-CMP-08 | Dispute Delivery | Job ID, dispute reason | Set job status = Disputed; pause payment; open dispute record | Dispute raised | BR-006 | 5.3 |

### Module 6: Live Tracking

| FR-ID | Function | Input | Process | Output | BR Ref | Story |
|---|---|---|---|---|---|---|
| FR-TRK-01 | Transmit GPS Location | Driver device lat/lng, job ID | Validate job In Transit; store location point; broadcast via WebSocket | Location stored and pushed to haulier | BR-007 | 6.1 |
| FR-TRK-02 | Display Live Map | Haulier session | Receive WebSocket location events; update map marker | Truck position on map | BR-007 | 6.1 |
| FR-TRK-03 | Draw Route Polyline | Origin, destination lat/lng | Call Directions API; return polyline | Route drawn on map | BR-007 | 6.1 |
| FR-TRK-04 | Calculate ETA | Current position, destination | Call Directions API; return duration | ETA displayed on dashboard | BR-007 | 6.2 |
| FR-TRK-05 | Delay Alert | Current ETA, original ETA | Compare; if delta > 30 min trigger alert | Delay notification sent to haulier | BR-007 | 6.2 |

### Module 7: Notifications

| FR-ID | Function | Trigger | Channel | Recipient |
|---|---|---|---|---|
| FR-NOT-01 | Email Verification | Registration | Email | New user |
| FR-NOT-02 | Document Status Update | Admin approve/reject | Email + Push | Supplier |
| FR-NOT-03 | New Quote Received | Supplier submits quote | Email + Push | Haulier |
| FR-NOT-04 | Booking Confirmation | Haulier books | Email + Push | Selected supplier |
| FR-NOT-05 | Not Selected Notification | Haulier books | Email | Rejected suppliers |
| FR-NOT-06 | Payment Secured | Escrow funded | Push | Supplier |
| FR-NOT-07 | Delivery Approval Required | Driver submits delivery report | Email + Push | Haulier |
| FR-NOT-08 | Payment Released | Haulier approves | Email + Push | Supplier |
| FR-NOT-09 | Delay Alert | ETA deviation > 30 min | Push | Haulier |
| FR-NOT-10 | Rating Prompt | Job completed | Push | Both parties |

### Module 8: Ratings

| FR-ID | Function | Input | Process | Output | BR Ref | Story |
|---|---|---|---|---|---|---|
| FR-RAT-01 | Submit Rating | Job ID, rater ID, stars (1–5), review text | Validate one-rating-per-job-per-user; store; update rated user avg | Rating saved | BR-009 | 8.1 |
| FR-RAT-02 | Display Rating on Profile | User ID | Compute average; return rating count and avg | Displayed on profile | BR-009 | 8.1 |

## 4. Approval
| Name | Role | Signature | Date |
|---|---|---|---|
| | Product Owner | | |
| | Development Lead | | |
