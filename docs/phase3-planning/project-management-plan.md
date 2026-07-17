# Project Management Plan – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Project Management Plan (Master Plan) |
| Version | 1.0 |
| Date | 2026-04-25 |

## 2. Purpose
This document is the master plan governing how the FreightFlex project is planned, executed, monitored, and closed. All subsidiary plans (resource, risk, communications, WBS) are referenced herein.

## 3. Project Summary
| Item | Detail |
|---|---|
| Objective | Build and launch the FreightFlex freight-marketplace platform |
| Duration | 20 weeks (approx. 5 months) |
| Methodology | Agile Scrum (2-week sprints) |
| Team Size | 6–10 people |
| Go-Live Target | Week 20 |

## 4. Delivery Approach

### 4.1 Methodology
- **Framework:** Agile Scrum with 2-week sprints.
- **Ceremonies:** Sprint Planning (Day 1), Daily Stand-up (15 min), Sprint Review + Retrospective (Day 14).
- **Backlog Management:** Product Owner maintains and prioritises backlog in Jira / Linear.
- **Definition of Done:** Code reviewed, unit tested (≥ 80% coverage), integration tested, deployed to staging, product owner signed off.

### 4.2 Sprint Plan
| Sprint | Weeks | Focus |
|---|---|---|
| 0 – Setup | 1–2 | Infra setup, CI/CD, design system, API scaffolding |
| 1 – Auth & Users | 3–4 | Registration, login, profile, email verification |
| 2 – Supplier & Jobs | 5–7 | Document upload, availability, job posting, matching |
| 3 – Booking & Payment | 8–10 | Quotes, booking, escrow, invoice |
| 4 – Compliance & Tracking | 11–13 | Load code, handover, delivery report, GPS tracking, ETA |
| 5 – Dashboards & Ratings | 14–15 | Role dashboards, notifications, ratings |
| 6 – Hardening | 16–17 | Performance testing, security audit, bug fixes |
| UAT | 18–19 | User acceptance testing with pilot users |
| Go-Live | 20 | Production deployment, hypercare |

## 5. Governance

### 5.1 Decision Making
| Decision Type | Authority |
|---|---|
| Scope change | Project Sponsor + Product Owner |
| Technical architecture | Development Lead |
| Bug priority | QA Lead + Product Owner |
| Budget change | Project Sponsor + CFO |

### 5.2 Change Control
1. Change request raised in writing (Jira ticket tagged `change-request`).
2. Impact assessment by Dev Lead (effort, risk, timeline).
3. Approval by Project Sponsor for changes affecting scope, budget, or timeline > 3 days.
4. RTM, WBS, and backlog updated before implementation begins.

### 5.3 Escalation Path
Level 1 → Team Lead resolution within 24 hours
Level 2 → Product Owner + Dev Lead within 48 hours
Level 3 → Project Sponsor within 5 days

## 6. Quality Management
- Code reviews mandatory for all PRs (min. 1 reviewer).
- Unit test coverage target: 80% per service.
- Integration tests run on every PR merge to `develop`.
- Regression suite runs before each sprint deployment.
- UAT sign-off required from Product Owner before go-live.
- Security scan (OWASP ZAP / Snyk) run during Sprint 6.

## 7. Tools & Platforms
| Purpose | Tool |
|---|---|
| Project tracking | Jira / Linear |
| Version control | GitHub |
| CI/CD | GitHub Actions |
| Communication | Slack + Google Meet |
| Documentation | This repository (`/docs`) |
| Design | Figma |
| API testing | Postman |
| Monitoring | Datadog / Sentry |

## 8. Key Milestones & Checkpoints
| Milestone | Target Week | Criteria |
|---|---|---|
| Design sign-off | Week 3 | All wireframes and API spec approved |
| Sprint 1 demo | Week 4 | Auth flows working in staging |
| Sprint 3 demo | Week 10 | End-to-end booking flow with escrow |
| Sprint 4 demo | Week 13 | Full compliance chain + live GPS working |
| UAT start | Week 18 | All stories implemented, staging stable |
| Go-live | Week 20 | UAT passed, security scan clean, sponsor sign-off |

## 9. Subsidiary Plans (References)
| Plan | Location |
|---|---|
| Work Breakdown Structure (WBS) | `/docs/phase3-planning/wbs.md` |
| Resource Management Plan | `/docs/phase3-planning/resource-management-plan.md` |
| Risk Management Plan | `/docs/phase3-planning/risk-management-plan.md` |
| Communication Plan | `/docs/phase3-planning/communication-plan.md` |

## 10. Approval
| Name | Role | Signature | Date |
|---|---|---|---|
| | Project Sponsor | | |
| | Product Owner | | |
| | Development Lead | | |
