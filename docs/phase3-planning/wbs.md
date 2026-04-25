# Work Breakdown Structure (WBS) – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Work Breakdown Structure (WBS) |
| Version | 1.0 |
| Date | 2026-04-25 |

## 2. WBS Structure
The WBS decomposes the total project scope into manageable work packages. Each level-3 item is a deliverable with an owner and effort estimate.

---

### 1.0 FreightFlex Platform

#### 1.1 Project Management
| WBS-ID | Work Package | Owner | Est. Effort |
|---|---|---|---|
| 1.1.1 | Project Charter & Business Case | PM | 2 days |
| 1.1.2 | Sprint planning and ceremonies (20 weeks) | PM / PO | Ongoing |
| 1.1.3 | Status reporting | PM | 0.5 day/week |
| 1.1.4 | Risk log maintenance | PM | 0.5 day/week |
| 1.1.5 | Change control management | PM / PO | As needed |

#### 1.2 Documentation & Design
| WBS-ID | Work Package | Owner | Est. Effort |
|---|---|---|---|
| 1.2.1 | BRD, SRS, FRD, URD, RTM | PO / BA | 5 days |
| 1.2.2 | Project Management Plan, WBS, Resource, Risk, Comms Plans | PM | 4 days |
| 1.2.3 | High-Level Design (HLD) | Dev Lead | 3 days |
| 1.2.4 | Low-Level Design (LLD) | Dev Team | 4 days |
| 1.2.5 | Database Design Document | Dev Lead / DB | 3 days |
| 1.2.6 | API Specification Document | Backend Dev | 4 days |
| 1.2.7 | UI/UX Wireframes & Mockups (all screens) | Designer | 7 days |
| 1.2.8 | Test Plan | QA Lead | 2 days |
| 1.2.9 | Security & Privacy Assessment | Dev Lead / Legal | 2 days |

#### 1.3 Infrastructure & DevOps
| WBS-ID | Work Package | Owner | Est. Effort |
|---|---|---|---|
| 1.3.1 | Cloud environment setup (dev/staging/prod) | DevOps | 2 days |
| 1.3.2 | CI/CD pipeline (GitHub Actions) | DevOps | 2 days |
| 1.3.3 | Docker containerisation | DevOps | 1 day |
| 1.3.4 | Database provisioning (PostgreSQL + Redis) | DevOps | 1 day |
| 1.3.5 | Cloud storage setup (S3/GCS) | DevOps | 0.5 day |
| 1.3.6 | Monitoring and alerting (Datadog / Sentry) | DevOps | 1 day |
| 1.3.7 | SSL certificates and domain setup | DevOps | 0.5 day |

#### 1.4 Backend API Development
| WBS-ID | Work Package | Owner | Est. Effort |
|---|---|---|---|
| 1.4.1 | API scaffolding, routing, middleware | Backend Dev | 2 days |
| 1.4.2 | Authentication (register, login, JWT, reset) | Backend Dev | 3 days |
| 1.4.3 | User profile management | Backend Dev | 2 days |
| 1.4.4 | Document upload and verification workflow | Backend Dev | 3 days |
| 1.4.5 | Availability management | Backend Dev | 1.5 days |
| 1.4.6 | Job posting (Google Maps integration) | Backend Dev | 3 days |
| 1.4.7 | Supplier matching algorithm | Backend Dev | 3 days |
| 1.4.8 | Quote management | Backend Dev | 2 days |
| 1.4.9 | Booking and notification system | Backend Dev | 3 days |
| 1.4.10 | Escrow payment integration | Backend Dev | 4 days |
| 1.4.11 | Compliance workflow (3 steps) | Backend Dev | 4 days |
| 1.4.12 | Payment release and invoice generation (PDF) | Backend Dev | 3 days |
| 1.4.13 | WebSocket server (GPS tracking) | Backend Dev | 3 days |
| 1.4.14 | ETA calculation and delay alerts | Backend Dev | 2 days |
| 1.4.15 | Ratings and reviews | Backend Dev | 2 days |
| 1.4.16 | Admin management endpoints | Backend Dev | 2 days |
| 1.4.17 | Push notification integration (FCM) | Backend Dev | 1.5 days |
| 1.4.18 | Email notification integration (SendGrid) | Backend Dev | 1 day |

#### 1.5 Web Frontend Development (Haulier + Admin)
| WBS-ID | Work Package | Owner | Est. Effort |
|---|---|---|---|
| 1.5.1 | Design system / component library | FE Dev | 3 days |
| 1.5.2 | Authentication screens (login, register, reset) | FE Dev | 2 days |
| 1.5.3 | Haulier profile setup screen | FE Dev | 1.5 days |
| 1.5.4 | Job posting form (with Maps autocomplete) | FE Dev | 3 days |
| 1.5.5 | Supplier matching and quote comparison views | FE Dev | 2 days |
| 1.5.6 | Booking confirmation and payment screen | FE Dev | 2.5 days |
| 1.5.7 | Compliance workflow views (haulier side) | FE Dev | 2 days |
| 1.5.8 | Haulier dashboard (with live map widget) | FE Dev | 3 days |
| 1.5.9 | Admin dashboard and verification panel | FE Dev | 3 days |
| 1.5.10 | Invoice download page | FE Dev | 1 day |
| 1.5.11 | Ratings submission screen | FE Dev | 1 day |

#### 1.6 Mobile App Development (Driver – React Native)
| WBS-ID | Work Package | Owner | Est. Effort |
|---|---|---|---|
| 1.6.1 | App scaffolding, navigation, auth screens | Mobile Dev | 3 days |
| 1.6.2 | Driver profile and document upload screens | Mobile Dev | 2 days |
| 1.6.3 | Availability management screen | Mobile Dev | 1.5 days |
| 1.6.4 | Job browse and quote submission screens | Mobile Dev | 2 days |
| 1.6.5 | Compliance workflow screens (Steps 1–3) | Mobile Dev | 3 days |
| 1.6.6 | GPS background tracking service | Mobile Dev | 3 days |
| 1.6.7 | Driver dashboard | Mobile Dev | 2 days |
| 1.6.8 | Earnings and job history screens | Mobile Dev | 1.5 days |
| 1.6.9 | Rating submission screen | Mobile Dev | 1 day |
| 1.6.10 | Offline mode (form-fill sync) | Mobile Dev | 2 days |

#### 1.7 Testing
| WBS-ID | Work Package | Owner | Est. Effort |
|---|---|---|---|
| 1.7.1 | Unit tests (backend) | Dev Team | Ongoing |
| 1.7.2 | Integration tests (API) | QA / Backend | 5 days |
| 1.7.3 | UI automation tests (web) | QA | 4 days |
| 1.7.4 | Mobile functional tests | QA | 3 days |
| 1.7.5 | Performance testing | QA | 2 days |
| 1.7.6 | Security / penetration testing | QA / DevOps | 2 days |
| 1.7.7 | UAT facilitation and defect triage | QA / PO | 4 days |

#### 1.8 Go-Live & Hypercare
| WBS-ID | Work Package | Owner | Est. Effort |
|---|---|---|---|
| 1.8.1 | Production deployment checklist | DevOps | 1 day |
| 1.8.2 | DNS cutover and SSL validation | DevOps | 0.5 day |
| 1.8.3 | Smoke testing on production | QA | 1 day |
| 1.8.4 | Hypercare monitoring (2 weeks post go-live) | Full team | 2 weeks |
| 1.8.5 | Post-launch retrospective and lessons learned | PM | 1 day |

## 3. WBS Summary by Phase
| Phase | WBS Sections | Estimated Effort |
|---|---|---|
| Project Management | 1.1 | Ongoing |
| Documentation & Design | 1.2 | ~37 days |
| Infrastructure & DevOps | 1.3 | ~11 days |
| Backend Development | 1.4 | ~44 days |
| Web Frontend | 1.5 | ~24 days |
| Mobile App | 1.6 | ~21 days |
| Testing | 1.7 | ~20 days |
| Go-Live & Hypercare | 1.8 | ~5 days + 2 weeks |
