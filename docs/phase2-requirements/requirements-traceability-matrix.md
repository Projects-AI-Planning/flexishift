# Requirements Traceability Matrix (RTM) – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Requirements Traceability Matrix (RTM) |
| Version | 1.0 |
| Date | 2026-04-25 |
| Status | Initial Setup (Design Phase) |

## 2. Purpose
The RTM maps each user requirement → business requirement → functional requirement → user story → test case (to be populated during QA phase). It ensures complete coverage and prevents requirements from being missed or implemented without justification.

## 3. Traceability Matrix

| UR-ID | User Requirement | BR-ID | Business Requirement | FR-ID | Functional Requirement | Story | Test Case(s) |
|---|---|---|---|---|---|---|---|
| UR-01 | User Registration | BR-001 | User Reg & Role Selection | FR-AUTH-01, FR-AUTH-02 | Register, Email Verify | 1.1 | TC-AUTH-01, TC-AUTH-02 |
| UR-02 | Login & Password Recovery | BR-001 | User Reg & Role Selection | FR-AUTH-03, FR-AUTH-04, FR-AUTH-05, FR-AUTH-06 | Login, Forgot/Reset Pwd | 1.2 | TC-AUTH-03–06 |
| UR-03 | Profile Setup | BR-001 | User Reg & Role Selection | FR-AUTH-07, FR-AUTH-08, FR-AUTH-09, FR-AUTH-10 | Profile completion, gate | 1.3 | TC-AUTH-07–10 |
| UR-04 | Document Verification | BR-002 | Supplier Verification | FR-SUP-01, FR-SUP-02, FR-SUP-03, FR-SUP-04 | Upload, admin review, gate | 2.1 | TC-SUP-01–04 |
| UR-05 | Availability Management | BR-002 | Supplier Verification | FR-SUP-05, FR-SUP-06 | Availability set/block | 2.2 | TC-SUP-05–06 |
| UR-06 | Post a Freight Job | BR-003 | Job Marketplace | FR-JOB-01, FR-JOB-02, FR-JOB-03 | Post job, geocode, distance | 3.1 | TC-JOB-01–03 |
| UR-07 | Find and Select a Driver | BR-003, BR-004 | Job Marketplace, Quote | FR-JOB-04 | Supplier matching | 3.2 | TC-JOB-04 |
| UR-08 | Submit a Quote | BR-003, BR-004 | Job Marketplace, Quote | FR-JOB-05, FR-JOB-06, FR-JOB-07 | Browse jobs, quote, edit | 3.3 | TC-JOB-05–07 |
| UR-07 (cont.) | View & Confirm Booking | BR-004 | Quote & Booking | FR-BKG-01, FR-BKG-02 | View quotes, confirm booking | 4.1 | TC-BKG-01–02 |
| UR-09 | Secure Payment | BR-005 | Secure Payment | FR-BKG-03, FR-BKG-04, FR-BKG-05 | Escrow initiate/confirm | 4.2 | TC-BKG-03–05 |
| UR-11 | Payment Confirmation | BR-005 | Secure Payment | FR-BKG-06, FR-BKG-07 | Release payment, invoice | 4.3 | TC-BKG-06–07 |
| UR-10 | Compliance Step 1 | BR-006 | Compliance Workflow | FR-CMP-01, FR-CMP-02 | Load code confirm | 5.1 | TC-CMP-01–02 |
| UR-10 | Compliance Step 2 | BR-006 | Compliance Workflow | FR-CMP-03, FR-CMP-04, FR-CMP-05 | Handover check, dual sign | 5.2 | TC-CMP-03–05 |
| UR-10, UR-11 | Compliance Step 3 | BR-006 | Compliance Workflow | FR-CMP-06, FR-CMP-07, FR-CMP-08 | Delivery report, approve | 5.3 | TC-CMP-06–08 |
| UR-12 | Live Tracking | BR-007 | Live Tracking | FR-TRK-01, FR-TRK-02, FR-TRK-03 | GPS transmit, map display | 6.1 | TC-TRK-01–03 |
| UR-12 | ETA Display | BR-007 | Live Tracking | FR-TRK-04, FR-TRK-05 | ETA calc, delay alert | 6.2 | TC-TRK-04–05 |
| UR-13 | Driver Dashboard | BR-008 | Dashboards | FR-7.1.1–7.1.4 | Driver mobile dashboard | 7.1 | TC-DASH-01 |
| UR-14 | Haulier Dashboard | BR-008 | Dashboards | FR-7.2.1–7.2.5 | Haulier web dashboard | 7.2 | TC-DASH-02 |
| UR-15 | Admin Dashboard | BR-008 | Dashboards | FR-7.3.1–7.3.4 | Admin panel | 7.3 | TC-DASH-03 |
| UR-16 | Ratings | BR-009 | Ratings & Trust | FR-RAT-01, FR-RAT-02 | Submit and display rating | 8.1 | TC-RAT-01–02 |
| — | Auto-invoice | BR-010 | Invoicing | FR-BKG-07 | PDF invoice generation | 4.3 | TC-BKG-07 |

## 4. Coverage Summary
| Epic | Stories | BRs Covered | FRs Mapped | Test Cases |
|---|---|---|---|---|
| 1 – User Management | 3 | BR-001 | FR-AUTH-01–10 | TC-AUTH-01–10 |
| 2 – Supplier Module | 2 | BR-002 | FR-SUP-01–06 | TC-SUP-01–06 |
| 3 – Job Posting & Matching | 3 | BR-003 | FR-JOB-01–07 | TC-JOB-01–07 |
| 4 – Booking & Payment | 3 | BR-004, BR-005, BR-010 | FR-BKG-01–07 | TC-BKG-01–07 |
| 5 – Compliance Workflow | 3 | BR-006 | FR-CMP-01–08 | TC-CMP-01–08 |
| 6 – Live Tracking & ETA | 2 | BR-007 | FR-TRK-01–05 | TC-TRK-01–05 |
| 7 – Dashboards | 3 | BR-008 | FR-7.x.x | TC-DASH-01–03 |
| 8 – Ratings | 1 | BR-009 | FR-RAT-01–02 | TC-RAT-01–02 |
| **Total** | **20** | **10 BRs** | **50+ FRs** | **50+ TCs** |

## 5. Revision History
| Version | Date | Author | Change Summary |
|---|---|---|---|
| 1.0 | 2026-04-25 | Product Owner | Initial setup – design phase |
| — | TBD | QA Lead | Test cases linked post-QA phase |

## 6. Note
Test case IDs (TC-*) are placeholders to be populated during the Test Plan (Phase 5). This matrix will be updated at the end of each sprint to reflect implementation and test status.
