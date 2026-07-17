# Project Charter – FreightFlex

## 1. Project Overview
| Field | Detail |
|---|---|
| Project Name | FreightFlex |
| Document Type | Project Charter |
| Version | 1.0 |
| Date | 2026-04-25 |
| Prepared By | Project Sponsor / PMO |

## 2. Project Purpose
FreightFlex is a digital freight-brokerage platform that connects Hauliers (freight buyers) with verified Drivers and Transport Firms (suppliers). The platform automates job posting, supplier matching, booking, escrow payment, compliance workflows, live tracking, and post-job ratings — replacing manual phone/email-based freight procurement.

## 3. Project Objectives
1. Launch a multi-role web + mobile platform within agreed timeline.
2. Automate end-to-end freight booking with secure escrow payment.
3. Enforce compliance (load code, dual sign-off, delivery proof) before payment release.
4. Provide live GPS tracking and real-time ETA to hauliers.
5. Build trust via verified supplier profiles and post-job ratings.

## 4. Scope

### In Scope
- User registration, login, and role-based profile setup (Driver, Haulier, Admin)
- Supplier document upload and admin verification workflow
- Job posting with Google Maps address validation and auto distance calculation
- Supplier matching (location, vehicle type, availability, verification)
- Quote submission, comparison, and booking confirmation
- Escrow payment (UPI / Card / Bank Transfer) and auto invoice generation
- Five-step compliance workflow (Load Code → Handover Check → Delivery Report)
- Live GPS tracking (10–15 s refresh) and dynamic ETA
- Role-specific dashboards (Driver mobile app, Haulier web, Admin panel)
- Star ratings and written reviews after job completion

### Out of Scope
- Third-party logistics integrations (ERP, WMS) in Phase 1
- International shipments
- Native iOS/Android build (Phase 1 targets PWA / React Native MVP)

## 5. Stakeholders
| Role | Responsibility |
|---|---|
| Project Sponsor | Funding, strategic sign-off |
| Product Owner | Backlog prioritisation, acceptance |
| Development Lead | Technical architecture and delivery |
| UI/UX Designer | Wireframes, design system |
| QA Lead | Test strategy and sign-off |
| Hauliers (end users) | Primary demand-side users |
| Drivers / Firms (end users) | Primary supply-side users |
| Admin Team | Platform governance |

## 6. High-Level Milestones
| Milestone | Target Date |
|---|---|
| Documentation & Design Complete | Week 4 |
| Sprint 1 – Auth & User Management | Week 6 |
| Sprint 2 – Supplier Module & Job Posting | Week 9 |
| Sprint 3 – Booking & Payment | Week 12 |
| Sprint 4 – Compliance & Tracking | Week 15 |
| Sprint 5 – Dashboards & Ratings | Week 17 |
| UAT & Go-Live | Week 20 |

## 7. Budget Estimate (High Level)
| Category | Estimated Cost |
|---|---|
| Development (FE + BE + Mobile) | TBD |
| Infrastructure (Cloud / DevOps) | TBD |
| Third-party APIs (Maps, Payments) | TBD |
| QA & Testing | TBD |
| Contingency (15%) | TBD |

## 8. Risks (Summary)
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep | High | High | Strict change control process |
| Payment gateway integration delays | Medium | High | Early PoC in Sprint 1 |
| Driver GPS accuracy issues | Medium | Medium | Test on multiple devices |
| Regulatory compliance (data privacy) | Low | High | GDPR/DPDPA review in Phase 5 |

## 9. Approvals
| Name | Role | Signature | Date |
|---|---|---|---|
| | Project Sponsor | | |
| | Product Owner | | |
| | Development Lead | | |
