# User Requirement Document (URD) – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | User Requirement Document (URD) |
| Version | 1.0 |
| Date | 2026-04-25 |
| Author | Product Owner / UX Researcher |

## 2. Purpose
The URD captures requirements from the perspective of end users — what they need the system to do, expressed in their language, not in technical terms. This document is the bridge between business objectives and technical specification.

## 3. User Personas

### Persona 1: Rajesh – Haulier
- **Background:** Runs a regional distribution company with 5 employees. Manages 10–20 shipments per week.
- **Current Pain:** Calls 3–4 different driver contacts each time to find someone available. Often gets let down at last minute. No visibility of where goods are once collected.
- **Goals:** Find verified, reliable drivers quickly. Know the price upfront. See where his goods are at any time.
- **Tech comfort:** Uses WhatsApp and email daily; comfortable with a web dashboard.

### Persona 2: Priya – Driver (Individual)
- **Background:** Independent truck driver, owns one HGV. Takes 2–3 jobs per week.
- **Current Pain:** Gets jobs only through word of mouth. Sometimes not paid on time or at all.
- **Goals:** See available jobs matching her route. Know she'll get paid before she starts. Simple app she can use while on the road.
- **Tech comfort:** Uses Android smartphone, moderate tech literacy.

### Persona 3: FastMove Ltd – Transport Firm
- **Background:** Owns a fleet of 12 vehicles. Wants to win contracts from multiple hauliers.
- **Current Pain:** No centralised platform to advertise fleet. Admin overhead to manage multiple job enquiries.
- **Goals:** Upload fleet credentials once. Have jobs come to them. Manage all jobs in one place.

### Persona 4: Admin (Platform Operator)
- **Background:** Internal team member responsible for onboarding and platform health.
- **Goals:** Quickly review and verify supplier documents. Handle disputes. Monitor platform KPIs.

## 4. User Requirements

### UR-01: Registration (All Users)
> "I want to create an account quickly so I can get started without a long process."
- Simple form with name, email, phone, password, and role choice.
- Confirmation that my account is being set up (email arrives within 2 minutes).
- I should not need to contact anyone to get access.

### UR-02: Login & Password Recovery
> "I want to log in easily and recover my password if I forget it."
- I should be taken straight to my relevant dashboard after login.
- If I type my password wrong, tell me without locking me out immediately.
- A reset link should come to my email within 2 minutes and expire after 24 hours.

### UR-03: Profile Setup
> "I want to set up my profile so others know who I am and trust me."
- I want to upload my photo and documents in one place.
- I want to know which fields are required and which are optional.
- I want to see a progress indicator showing how complete my profile is.

### UR-04: Document Verification (Supplier)
> "I want to upload my documents and know when I've been verified."
- I want clear guidance on which documents to upload and in what format.
- I want to know the verification status (Pending / Approved / Rejected).
- If rejected, I want to know why so I can re-upload the right document.

### UR-05: Availability Management (Driver)
> "I want to control when I'm available so I only get offered jobs I can do."
- Set my working days and hours in a simple calendar or toggle interface.
- Block specific dates when I'm on holiday or unavailable.
- Change my availability at any time.

### UR-06: Post a Freight Job (Haulier)
> "I want to post a job in under 3 minutes so I can find drivers fast."
- Type in addresses and have them auto-validated.
- See the estimated distance and time before submitting.
- Get a reference number I can use to track the job.

### UR-07: Find and Select a Driver (Haulier)
> "I want to see a shortlist of matched, verified drivers with their ratings so I can choose confidently."
- Don't show me unverified drivers.
- Show me a driver's star rating and number of completed jobs.
- Show me the vehicle type and availability date confirmation.

### UR-08: Submit a Quote (Supplier/Driver)
> "I want to see available jobs and submit my price so I can win work."
- See jobs that match my vehicle type and location.
- Submit one price per job.
- Change my price if I haven't been selected yet.

### UR-09: Secure Payment (Haulier)
> "I want to pay into escrow so I know my money is safe until the job is done."
- Pay using UPI, card, or bank transfer.
- Know my money is held safely and not released until I approve.
- See a clear breakdown of what I'm paying.

### UR-10: Compliance Steps (Driver & Haulier)
> "I want a clear step-by-step process so there's no confusion about what to do next."
- At pickup: enter a code to confirm I have the right load.
- Before driving: both I and the haulier sign off on vehicle condition with photos.
- At delivery: take a photo, get a signature from the recipient, add any notes.
- Always know what step I'm on and what's next.

### UR-11: Payment Confirmation (Driver/Firm)
> "I want to know my payment has been released and when it will arrive."
- See a clear "Payment Released" notification.
- Download a PDF invoice for my records.
- See my earnings history in the dashboard.

### UR-12: Live Tracking (Haulier)
> "I want to see exactly where my goods are on a map during delivery."
- See a live map with the truck's position updating every few seconds.
- See the planned route line.
- See the estimated arrival time.
- Get alerted if the driver is running significantly late.

### UR-13: Driver Dashboard
> "I want a simple app that shows me what I need to do today."
- See my current active job at the top.
- See upcoming and past jobs.
- Quick buttons: Navigate, Update Status, Upload Proof.
- See my total earnings.

### UR-14: Haulier Dashboard
> "I want one screen where I can see everything about my shipments."
- All active jobs with status.
- Jobs waiting for my approval.
- How much I've spent this month.
- A map of all active deliveries.
- One-click to post a new job.

### UR-15: Admin Dashboard
> "I want to manage the platform efficiently without digging through menus."
- See total users, jobs, and revenue at a glance.
- See all pending verifications in one list.
- Approve, reject, or suspend users quickly.
- Monitor all jobs and filter by status.

### UR-16: Ratings
> "I want to rate the driver after the job so others know who's reliable."
- Prompted automatically after job completion.
- Choose 1–5 stars.
- Optionally write a short review.
- See the other party's rating on their profile.

## 5. Usability Requirements
| UR-ID | Requirement |
|---|---|
| UR-UX-01 | Core driver actions (enter load code, upload proof) must be completable in ≤ 3 taps on mobile. |
| UR-UX-02 | Haulier job posting form must be completable in ≤ 3 minutes. |
| UR-UX-03 | Error messages must explain the problem in plain English, not error codes. |
| UR-UX-04 | Critical notifications (booking confirmed, payment released) must arrive within 30 seconds. |
| UR-UX-05 | All pages must be usable on a 5-inch Android screen without horizontal scrolling. |

## 6. Constraints Noted by Users
- Drivers often work in areas with poor mobile signal — offline form-fill with sync on reconnect is desirable.
- Hauliers use the platform primarily on desktop browsers during business hours.
- Admin team works in a single timezone (IST / GMT, to be confirmed).

## 7. Approval
| Name | Role | Signature | Date |
|---|---|---|---|
| | Product Owner | | |
| | Representative Haulier (Pilot) | | |
| | Representative Driver (Pilot) | | |
