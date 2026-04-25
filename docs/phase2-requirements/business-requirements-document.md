# Business Requirements Document (BRD) – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Business Requirements Document (BRD) |
| Version | 1.0 |
| Date | 2026-04-25 |
| Author | Product Owner |
| Approved By | Project Sponsor |

## 2. Business Objectives
1. Create a trusted digital marketplace connecting hauliers with verified freight suppliers.
2. Eliminate manual phone/email freight procurement and reduce booking time to under 10 minutes.
3. Guarantee supplier payment via escrow, reducing payment disputes to < 1%.
4. Enforce a compliance chain (load code → handover → delivery proof) on every job.
5. Provide real-time shipment visibility to hauliers via live GPS.
6. Generate platform revenue through commission on every completed job.

## 3. Business Requirements

### BR-001: User Registration & Role Selection
The platform must allow new users to self-register and select one of three roles: Driver, Haulier, or Admin. Each role receives a tailored onboarding flow and dashboard.

### BR-002: Supplier Verification
Before a supplier (Driver or Firm) can accept jobs, the platform must verify their identity and vehicle/company documents. Unverified suppliers must be blocked from transactional features.

### BR-003: Job Marketplace
Hauliers must be able to post freight jobs with full pickup/drop details, and the system must automatically surface a shortlist of matched, verified suppliers.

### BR-004: Quote & Booking
Suppliers must be able to submit competitive quotes on open jobs. Hauliers must be able to compare and confirm a booking in a single workflow.

### BR-005: Secure Payment
Payment must be held in escrow at booking time and released to the supplier only after the haulier confirms successful delivery. The platform must support UPI, card, and bank transfer.

### BR-006: Compliance Workflow
Every job must pass through a mandatory three-step compliance chain before payment is released:
1. Load code verification at pickup
2. Dual sign-off vehicle handover check
3. Delivery proof and haulier approval

### BR-007: Live Tracking
Hauliers must be able to see the driver's live location on a map during an active job, with ETA recalculated in real time.

### BR-008: Dashboards
Each role must have a purpose-built dashboard:
- Driver: job status, earnings, quick actions
- Haulier: active jobs, pending approvals, spend summary
- Admin: platform overview, pending verifications, user management

### BR-009: Ratings & Trust
After every completed job, both haulier and driver must have the opportunity to rate each other (1–5 stars + optional text). Ratings must be visible on supplier profiles.

### BR-010: Invoicing
The system must automatically generate a PDF invoice on payment release, including job reference, agreed price, tax breakdown, and total.

## 4. Business Rules
| Rule ID | Rule Description |
|---|---|
| BRU-01 | A supplier cannot accept jobs until their documents are admin-approved. |
| BRU-02 | A haulier cannot post jobs without a complete profile. |
| BRU-03 | Only one quote per supplier per job is allowed. |
| BRU-04 | Payment is released only after haulier approves delivery report. |
| BRU-05 | The compliance workflow steps must be completed in strict sequential order. |
| BRU-06 | Duplicate email addresses are not permitted at registration. |
| BRU-07 | Only one rating per user per job is allowed. |
| BRU-08 | Drivers marked unavailable must not appear in supplier matching results. |

## 5. Constraints
| Constraint | Description |
|---|---|
| Technology | Platform must work on modern browsers and Android/iOS devices. |
| Timeline | Phase 1 go-live within 20 weeks. |
| Budget | Development within approved budget (TBD by Finance). |
| Regulatory | Must comply with applicable data privacy and payment regulations. |
| Geography | Phase 1 limited to domestic shipments. |

## 6. Assumptions
1. Google Maps Platform API will be available and within budget throughout Phase 1.
2. A licensed payment aggregator with escrow capability will be contracted before Sprint 3.
3. Pilot hauliers and suppliers will be available for UAT in Week 18–19.
4. All regulatory approvals (payment escrow, data privacy) will be in place before go-live.

## 7. Dependencies
| Dependency | Impact if Not Met |
|---|---|
| Google Maps API key provisioned | Job posting and matching cannot be built |
| Payment gateway escrow contract signed | Booking and payment flow is blocked |
| Admin verification team trained | Supplier onboarding is blocked |
| Legal review of T&C and Privacy Policy | Platform cannot go live |

## 8. Approval
| Name | Role | Signature | Date |
|---|---|---|---|
| | Project Sponsor | | |
| | Product Owner | | |
