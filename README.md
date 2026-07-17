# FreightFlex – Project Documentation

Digital freight-brokerage platform connecting Hauliers with verified Drivers and Transport Firms.

## Project Structure

- **`backend/`**: Python FastAPI backend with MySQL, Redis, and Celery.
- **`frontend/`**: React.js (Vite + TypeScript) web application for Haulier and Admin dashboards.
- **`mobile/`**: React Native application for the Driver mobile app.
- **`docs/`**: Comprehensive project documentation, diagrams, and phase reports.

## Document Index

### Phase 1 – Initiation
| Document | Path |
|---|---|
| Project Charter | [docs/phase1-initiation/project-charter.md](docs/phase1-initiation/project-charter.md) |
| Business Case | [docs/phase1-initiation/business-case.md](docs/phase1-initiation/business-case.md) |
| Feasibility Study Report | [docs/phase1-initiation/feasibility-study-report.md](docs/phase1-initiation/feasibility-study-report.md) |
| Stakeholder Register | [docs/phase1-initiation/stakeholder-register.md](docs/phase1-initiation/stakeholder-register.md) |

### Phase 2 – Requirements
| Document | Path |backend/frontend
|---|---|
| Business Requirements Document (BRD) | [docs/phase2-requirements/business-requirements-document.md](docs/phase2-requirements/business-requirements-document.md) |
| Software Requirements Specification (SRS) | [docs/phase2-requirements/software-requirements-specification.md](docs/phase2-requirements/software-requirements-specification.md) |
| Functional Requirements Document (FRD) | [docs/phase2-requirements/functional-requirements-document.md](docs/phase2-requirements/functional-requirements-document.md) |
| User Requirement Document (URD) | [docs/phase2-requirements/user-requirement-document.md](docs/phase2-requirements/user-requirement-document.md) |
| Requirements Traceability Matrix (RTM) | [docs/phase2-requirements/requirements-traceability-matrix.md](docs/phase2-requirements/requirements-traceability-matrix.md) |

### Phase 3 – Planning
| Document | Path |
|---|---|
| Project Management Plan | [docs/phase3-planning/project-management-plan.md](docs/phase3-planning/project-management-plan.md) |
| Work Breakdown Structure (WBS) | [docs/phase3-planning/wbs.md](docs/phase3-planning/wbs.md) |
| Resource Management Plan | [docs/phase3-planning/resource-management-plan.md](docs/phase3-planning/resource-management-plan.md) |
| Risk Management Plan | [docs/phase3-planning/risk-management-plan.md](docs/phase3-planning/risk-management-plan.md) |
| Communication Plan | [docs/phase3-planning/communication-plan.md](docs/phase3-planning/communication-plan.md) |

### Phase 4 – Design
| Document | Path |
|---|---|
| High-Level Design (HLD) | [docs/phase4-design/high-level-design.md](docs/phase4-design/high-level-design.md) |
| Low-Level Design (LLD) | [docs/phase4-design/low-level-design.md](docs/phase4-design/low-level-design.md) |
| Database Design Document (DDD) | [docs/phase4-design/database-design-document.md](docs/phase4-design/database-design-document.md) |
| UI/UX Design Specs | [docs/phase4-design/ui-ux-design-specs.md](docs/phase4-design/ui-ux-design-specs.md) |
| API Specification | [docs/phase4-design/api-specification.md](docs/phase4-design/api-specification.md) |

### Phase 5 – Quality & Security
| Document | Path |
|---|---|
| Test Plan | [docs/phase5-quality-security/test-plan.md](docs/phase5-quality-security/test-plan.md) |
| Data Privacy & Security Assessment | [docs/phase5-quality-security/data-privacy-security-assessment.md](docs/phase5-quality-security/data-privacy-security-assessment.md) |
| Compliance & Regulatory Checklist | [docs/phase5-quality-security/compliance-regulatory-checklist.md](docs/phase5-quality-security/compliance-regulatory-checklist.md) |

### Diagrams & Flow Diagrams
| # | Diagram | Type |
|---|---|---|
| 01 | [System Architecture](docs/diagrams/01-system-architecture.md) | Architecture |
| 02 | [Entity Relationship Diagram (ERD)](docs/diagrams/02-entity-relationship-diagram.md) | ERD |
| 03 | [User Registration & Login Flow](docs/diagrams/03-user-registration-login-flow.md) | Flowchart |
| 04 | [Supplier Onboarding & Verification Flow](docs/diagrams/04-supplier-onboarding-flow.md) | Flowchart |
| 05 | [Job Posting & Supplier Matching Flow](docs/diagrams/05-job-posting-matching-flow.md) | Flowchart |
| 06 | [Booking & Escrow Payment Flow](docs/diagrams/06-booking-payment-flow.md) | Flowchart |
| 07 | [Compliance Workflow (3-Step Chain)](docs/diagrams/07-compliance-workflow.md) | Flowchart + Sequence |
| 08 | [Live GPS Tracking & ETA Flow](docs/diagrams/08-live-tracking-eta-flow.md) | Flowchart + Sequence + State |
| 09 | [Job Status State Machine (FSM)](docs/diagrams/09-job-status-state-machine.md) | State Diagram |
| 10 | [End-to-End Sequence Diagrams](docs/diagrams/10-end-to-end-sequence.md) | Sequence |
| 11 | [User Role & Navigation Flow](docs/diagrams/11-user-role-navigation.md) | Flowchart + Journey |
| 12 | [Notification Flow](docs/diagrams/12-notification-flow.md) | Flowchart |
| 13 | [Deployment & Infrastructure](docs/diagrams/13-deployment-infrastructure.md) | Architecture |
| 14 | [Data Flow Diagrams (DFD)](docs/diagrams/14-data-flow-diagram.md) | DFD |
| 15 | [Security & Authentication Flow](docs/diagrams/15-security-flow.md) | Sequence + Flowchart |

> All diagrams use Mermaid syntax — they render automatically on GitHub. See the [Diagrams README](docs/diagrams/README.md) for viewing instructions.

### Storytelling
| Document | Description |
|---|---|
| [FreightFlex Story](docs/storytelling/freightflex-story.md) | Narrative walkthrough of the platform through the eyes of Arjun (Haulier), Priya (Driver), and Meera (Admin) — every epic and user story told as a human story, with the technology mapped at the end |

## Platform Summary

| Item | Detail |
|---|---|
| Epics | 8 |
| User Stories | 20 |
| Roles | Driver (mobile), Haulier (web), Admin (web) |
| Core Features | Job marketplace, escrow payment, 3-step compliance, live GPS tracking |
| Backend | Python 3.11 + FastAPI + SQLAlchemy 2.0 + Alembic |
| Frontend | React.js 18 + TypeScript (web) · React Native 0.73 (mobile) |
| Database | MySQL 8.0 (InnoDB) + Redis 7 |
| Infrastructure | AWS ECS Fargate · RDS MySQL · S3 · CloudFront |
| Integrations | Google Maps Platform · Razorpay/Stripe · Firebase FCM · SendGrid |
| Target Go-Live | Week 20 |
"# flexishift" 
