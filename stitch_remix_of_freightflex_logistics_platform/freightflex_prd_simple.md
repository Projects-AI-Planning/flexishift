# FreightFlex – Epic & User Stories (Simple)

## EPIC 1: USER MANAGEMENT
**STORY 1.1 – Register**
As a new user, I want to register on FreightFlex, So that I can access the platform.
- Acceptance Criteria: Register with name, email, phone, password; Select role (Driver / Haulier / Firm); Email verification on signup; Duplicate email not allowed.

**STORY 1.2 – Login**
As a registered user, I want to log in securely, So that I can use my dashboard.
- Acceptance Criteria: Login with email & password; Wrong credentials show error; Forgot password option available; Role-based redirect after login (Driver -> Mobile App, Haulier -> Web Dashboard, Admin -> Admin Panel).

**STORY 1.3 – Profile Setup**
As a new user, I want to complete my profile, So that others can identify me.
- Acceptance Criteria: Driver: Name, photo, license, vehicle type; Haulier: Company name, address, contact; Firm: Fleet details, coverage area; Incomplete profile blocked from key actions.

## EPIC 2: SUPPLIER MODULE
**STORY 2.1 – Document Upload**
As a supplier (Driver or Firm), I want to upload my documents, So that I can get verified on the platform.
- Acceptance Criteria: Driver uploads: Driving license, Vehicle registration, Insurance document; Firm uploads: Company registration, Fleet insurance; Admin reviews and approves or rejects; Unverified suppliers cannot accept jobs.

**STORY 2.2 – Availability Setup**
As a driver, I want to set my availability, So that I only get jobs I can do.
- Acceptance Criteria: Set available days and time slots; Mark as unavailable when needed; Unavailable drivers not shown in matching.

## EPIC 3: JOB POSTING & MATCHING
**STORY 3.1 – Post a Job**
As a haulier, I want to post a transport job, So that suppliers can quote for it.
- Acceptance Criteria: Enter job details: Pickup & drop location, Goods type & weight, Date & time slot, Vehicle type required; Address validated via Google Maps; Distance & route calculated automatically; Job gets unique reference number; Job status set to "Open".

**STORY 3.2 – Supplier Matching**
As a haulier, I want the system to show matched suppliers, So that I don't search manually.
- Acceptance Criteria: Filter by location, vehicle type, availability, verification status; Only verified suppliers shown; Each supplier shows name, vehicle details and rating.

**STORY 3.3 – Submit Quote**
As a supplier, I want to submit a quote on a job, So that I can win the work.
- Acceptance Criteria: View matched open jobs; Submit fixed price quote; One quote per supplier per job; Edit quote before haulier selects.

## EPIC 4: BOOKING & PAYMENT
**STORY 4.1 – Select Supplier & Confirm Booking**
As a haulier, I want to select the best quote and confirm booking, So that the job is assigned.
- Acceptance Criteria: View all submitted quotes; Select one supplier; Job status changes to "Booked"; Selected supplier notified; Other suppliers notified (not selected).

**STORY 4.2 – Escrow Payment**
As a haulier, I want to pay upfront into escrow, So that payment is secured before job starts.
- Acceptance Criteria: Haulier pays after selecting supplier; Payment held in escrow; Supplier can see payment is secured; Payment methods: UPI / Card / Bank Transfer.

**STORY 4.3 – Payment Release & Invoice**
As a supplier, I want payment released after job approval, So that I get paid for completed work.
- Acceptance Criteria: Payment released only after haulier approves; Invoice auto-generated with: Job reference, Agreed price, Tax breakdown, Total amount; Invoice downloadable as PDF.

## EPIC 5: COMPLIANCE WORKFLOW (Strict Order)
**STORY 5.1 – Load Code Confirmation**
As a driver, I want to confirm the load code at pickup, So that correct goods are verified before loading.
- Acceptance Criteria: Driver enters load code at pickup; System verifies code against job record; Match -> Step 1 complete, next step unlocked; No match -> Error shown, cannot proceed.

**STORY 5.2 – Vehicle Handover Check**
As a driver and haulier, I want both parties to sign off on vehicle condition, So that there is no dispute later.
- Acceptance Criteria: Driver completes vehicle checklist; Driver uploads condition photos; Driver signs digitally; Haulier signs digitally; Both signatures required to proceed; Trip status changes to "In Transit".

**STORY 5.3 – Delivery Report & Approval**
As a driver, I want to submit delivery proof at drop location, So that job completion is recorded.
- Acceptance Criteria: Driver submits: Delivery photo, Recipient signature, Any delivery notes; Haulier reviews and approves or disputes; Approval triggers payment release; Job status changes to "Completed".

## EPIC 6: LIVE TRACKING & ETA
**STORY 6.1 – Live GPS Tracking**
As a haulier, I want to track the driver live on map, So that I know where my goods are.
- Acceptance Criteria: Live truck position shown on map; Location updates every 10-15 seconds; Route line displayed; Tracking active only during job.

**STORY 6.2 – ETA Display**
As a haulier, I want to see estimated arrival time, So that I can plan receiving the goods.
- Acceptance Criteria: ETA shown on dashboard; ETA updates based on live location; Delay flagged if ETA changes significantly.

## EPIC 7: DASHBOARDS
**STORY 7.1 – Driver Dashboard**
As a driver, I want a simple dashboard on my app, So that I can manage jobs and earnings.
- Acceptance Criteria: Active job status; Upcoming & past jobs; Total earnings summary; Quick action: start navigation, update status, upload proof.

**STORY 7.2 – Haulier Dashboard**
As a haulier, I want a dashboard to manage my jobs, So that I have full visibility.
- Acceptance Criteria: Active jobs with live status; Jobs awaiting approval; Total spend summary; Post new job button; Live map of active deliveries.

**STORY 7.3 – Admin Dashboard**
As an admin, I want a central panel to manage the platform, So that everything runs smoothly.
- Acceptance Criteria: Total users, jobs, revenue overview; Pending verifications list; User management (verify, suspend); Job monitoring.

## EPIC 8: RATINGS & REVIEWS
**STORY 8.1 – Rate After Job**
As a haulier or driver, I want to rate the other party after job completion, So that trust is built on the platform.
- Acceptance Criteria: Star rating (1 to 5) after job completed; Optional written review; Rating visible on profile; One rating per job per user.