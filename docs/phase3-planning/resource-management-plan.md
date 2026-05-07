# Resource Management Plan – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Resource Management Plan |
| Version | 1.0 |
| Date | 2026-04-25 |

## 2. Purpose
Defines the human, technical, and material resources required to deliver FreightFlex, and describes how they will be acquired, allocated, managed, and released.

## 3. Human Resources

### 3.1 Team Structure
| Role | Count | Type | Allocation | Responsible for |
|---|---|---|---|---|
| Project Manager (PM) | 1 | Internal | 50% | Planning, reporting, risk, change control |
| Product Owner (PO) | 1 | Internal | 100% | Backlog, acceptance, stakeholder liaison |
| UI/UX Designer | 1 | Internal / Contract | 100% (Weeks 1–6), 25% thereafter | Wireframes, design system, UX reviews |
| Backend Developer | 2 | Contract | 100% | API, database, integrations |
| Frontend Developer | 1–2 | Contract | 100% | Web app (Haulier + Admin) |
| Mobile Developer | 1 | Contract | 100% | React Native driver app |
| QA Engineer | 1–2 | Contract | 100% (from Sprint 2) | Test plans, automation, UAT |
| DevOps Engineer | 1 | Contract / Part-time | 50% | CI/CD, infra, monitoring |
| Legal / Compliance Advisor | 1 | External / Part-time | As needed | T&C, privacy policy, payment compliance |

### 3.2 RACI Matrix
| Activity | PM | PO | Dev Lead | FE Dev | Mobile Dev | QA | DevOps | Designer |
|---|---|---|---|---|---|---|---|---|
| Sprint Planning | A | R | C | I | I | I | I | I |
| Architecture Decisions | I | C | R | C | C | I | C | I |
| UI/UX Design Approval | I | A | I | C | C | I | I | R |
| Code Review | I | I | A | R | R | C | I | I |
| Deployment to Staging | I | I | C | I | I | I | R | I |
| UAT Facilitation | C | R | C | C | C | A | I | I |
| Go-Live Decision | A | R | C | I | I | C | C | I |

R = Responsible, A = Accountable, C = Consulted, I = Informed

## 4. Resource Allocation Timeline
| Resource | Sprint 0 | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | Sprint 5 | Sprint 6 | UAT | Go-Live |
|---|---|---|---|---|---|---|---|---|---|
| PM | 50% | 50% | 50% | 50% | 50% | 50% | 50% | 50% | 100% |
| PO | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| Designer | 100% | 100% | 50% | 25% | 25% | 25% | 25% | 25% | 10% |
| Backend Dev (x2) | 50% | 100% | 100% | 100% | 100% | 100% | 100% | 50% | 25% |
| FE Dev | 25% | 100% | 100% | 100% | 100% | 100% | 100% | 50% | 25% |
| Mobile Dev | 25% | 50% | 100% | 100% | 100% | 100% | 100% | 50% | 25% |
| QA (x2) | 0% | 25% | 50% | 100% | 100% | 100% | 100% | 100% | 50% |
| DevOps | 100% | 50% | 50% | 50% | 50% | 50% | 100% | 25% | 100% |

## 5. Skills Matrix
| Skill | Required | Current Team | Gap |
|---|---|---|---|
| React.js 18 / TypeScript | Yes | FE Dev | Confirm at hire |
| React Native 0.73 / TypeScript | Yes | Mobile Dev | Confirm at hire |
| Python 3.11 + FastAPI | Yes | Backend Dev | Confirm at hire |
| SQLAlchemy 2.0 + Alembic | Yes | Backend Dev | Confirm at hire |
| MySQL 8.0 (InnoDB, JSON columns) | Yes | Backend Dev | Confirm at hire |
| Redis 7 (Pub/Sub, sessions) | Yes | Backend Dev | Potential gap — brief training Week 1 |
| FastAPI WebSockets (async) | Yes | Backend Dev | Potential gap — assess at Sprint 4 |
| Pydantic v2 data validation | Yes | Backend Dev | Confirm at hire |
| Celery background tasks | Yes | Backend Dev | Confirm at hire |
| Google Maps Platform API | Yes | Backend / FE Dev | Self-paced training |
| Razorpay / Stripe SDK (Python) | Yes | Backend Dev | External advisor as backup |
| Docker / Azure Container Apps | Yes | DevOps | Confirm at hire |
| Automated testing (Pytest + Playwright) | Yes | QA | Confirm at hire |
| Figma / UI design | Yes | Designer | Available |

## 6. Onboarding Plan
| Week | Activity |
|---|---|
| Week 1 | Contracts signed; access provisioned (GitHub, Slack, Jira, cloud accounts) |
| Week 1 | Kickoff meeting: project goals, architecture overview, sprint process |
| Week 1–2 | Designer delivers initial wireframes for review |
| Week 2 | Dev team: environment setup, codebase scaffolding, coding standards review |
| Week 3 | QA: test plan drafted; automation framework selected |

## 7. Training Needs
| Training | Who | When |
|---|---|---|
| FastAPI async patterns + WebSocket | Backend Dev | Week 1 (self-paced) |
| SQLAlchemy 2.0 async sessions + Alembic | Backend Dev | Week 1 |
| MySQL 8.0 JSON columns + indexing | Backend Dev | Week 1 |
| Redis Pub/Sub patterns | Backend Dev | Week 1–2 |
| Google Maps Platform APIs | Backend + FE Dev | Week 1 (self-paced) |
| Razorpay / Stripe Python SDK + escrow setup | Backend Dev | Week 1–2 |
| React Hook Form + Zod validation | FE Dev + Mobile Dev | Week 1 |
| WeasyPrint / Jinja2 PDF templating | Backend Dev | Sprint 3 (pre-invoice feature) |
| Pytest + httpx async testing | QA + Backend | Week 2 |
| GDPR / DPDPA basics | All | Week 1 (1-hour session) |
| Admin panel walkthrough | Admin Team | Week 18 (pre-UAT) |

## 8. Resource Release Plan
| Resource | Release Point |
|---|---|
| UI/UX Designer (high allocation) | After Sprint 2 design complete; reduced to 25% |
| Contract Developers | After 2-week hypercare period (Week 22) |
| QA Engineers | After UAT signed off |
| DevOps Engineer | Transitions to part-time support model post go-live |

## 9. Procurement Plan
| Item | Vendor | Procurement Method | Lead Time |
|---|---|---|---|
| Cloud hosting (Azure) | Azure | Direct sign-up | Immediate |
| Google Maps Platform API | Google | API key via Azure Console | 1 day |
| Payment Gateway (Razorpay/Stripe) | Razorpay / Stripe | Account + escrow agreement | 3–5 business days |
| Email service (SendGrid) | Twilio SendGrid | Direct sign-up | Immediate |
| Push notifications (FCM) | Google | Firebase Console | Immediate |
| PDF generation (WeasyPrint) | Open-source | pip install | Immediate |
| Security scanning (Snyk / pip-audit) | Snyk + pip-audit | CLI install | Immediate |
