# Test Plan – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Test Plan |
| Version | 1.0 |
| Date | 2026-04-25 |
| Author | QA Lead |

## 2. Objectives
1. Verify all 20 user stories meet their acceptance criteria.
2. Validate all 50+ functional requirements from the SRS.
3. Confirm non-functional requirements (performance, security, usability) are met.
4. Ensure no regression defects in existing features when new sprints are delivered.
5. Provide go/no-go confidence for UAT and production deployment.

## 3. Test Scope

### In Scope
- All 8 epics and 20 user stories (see RTM)
- REST API endpoints (all routes in API Specification)
- WebSocket events (GPS tracking)
- Web app (Chrome, Firefox, Safari, Edge)
- Mobile app (Android 9+, iOS 14+)
- Third-party integrations (Google Maps, Payment Gateway — sandbox)
- Performance under expected Phase 1 load (500 concurrent users)
- Security (OWASP Top 10 coverage)

### Out of Scope
- Load testing beyond 500 concurrent users (Phase 2)
- Browser versions below those listed in SRS
- Physical device testing beyond 3 reference devices per platform
- Accessibility automated audit beyond WCAG 2.1 AA

## 4. Test Levels

### 4.1 Unit Testing
- **Owner:** Developers
- **Target:** All FastAPI service methods; React / React Native component rendering
- **Framework (Backend):** Pytest 7 + pytest-asyncio; SQLAlchemy in-memory MySQL (or sqlite for unit tests)
- **Framework (Frontend):** Vitest + React Testing Library (web); Jest + React Native Testing Library (mobile)
- **Coverage Target:** ≥ 80% line coverage per service module
- **Execution:** On every PR commit via GitHub Actions CI

### 4.2 Integration Testing
- **Owner:** Developers + QA
- **Target:** FastAPI endpoint contracts, MySQL interactions, Redis operations, third-party API sandbox calls
- **Framework:** Pytest + `httpx.AsyncClient` (FastAPI's built-in test client); real MySQL instance in Docker
- **Coverage Target:** All 60+ API endpoints (happy path + key error paths)
- **Execution:** On every merge to `develop` via CI

### 4.3 End-to-End (E2E) Testing
- **Owner:** QA
- **Target:** Critical user journeys through web and mobile UIs
- **Framework:** Playwright (web — Chrome, Firefox, Safari); Detox / Maestro (React Native mobile)
- **Coverage Target:** All happy-path flows per user story
- **Execution:** Nightly on staging; blocking for UAT

### 4.4 Performance Testing
- **Owner:** QA + DevOps
- **Target:** FastAPI throughput, MySQL query latency, WebSocket concurrency, React page load
- **Tool:** k6 (API + WebSocket load tests), Lighthouse (React web), py-spy (Python profiling)
- **Execution:** Sprint 6 (hardening)

### 4.5 Security Testing
- **Owner:** DevOps + External Pen Tester (optional)
- **Tool:** OWASP ZAP (dynamic), Bandit (Python static analysis), pip-audit (dependency CVEs), Snyk
- **Coverage:** OWASP Top 10; see Security Assessment doc
- **Execution:** Sprint 6

### 4.6 User Acceptance Testing (UAT)
- **Owner:** Product Owner + Pilot Users
- **Participants:** 2–3 pilot hauliers, 3–5 pilot drivers
- **Duration:** Weeks 18–19
- **Approach:** Facilitated sessions with test scripts; defects logged in Jira

## 5. Test Scenarios by Story

### Epic 1 – User Management
| Test ID | Story | Scenario | Expected Result |
|---|---|---|---|
| TC-AUTH-01 | 1.1 | Register with valid data | Account created; verification email sent |
| TC-AUTH-02 | 1.1 | Register with duplicate email | 409 Conflict error shown |
| TC-AUTH-03 | 1.1 | Click verification link | Account activated; redirect to login |
| TC-AUTH-04 | 1.1 | Expired verification link | Error shown; resend option offered |
| TC-AUTH-05 | 1.2 | Login with correct credentials | JWT issued; role-based redirect |
| TC-AUTH-06 | 1.2 | Login with wrong password | Error shown; no token issued |
| TC-AUTH-07 | 1.2 | Forgot password flow | Reset email received; password updated |
| TC-AUTH-08 | 1.3 | Driver completes profile | Profile marked complete; gate lifted |
| TC-AUTH-09 | 1.3 | Haulier attempts to post job with incomplete profile | Blocked with message |

### Epic 2 – Supplier Module
| Test ID | Story | Scenario | Expected Result |
|---|---|---|---|
| TC-SUP-01 | 2.1 | Driver uploads driving licence | Document stored; status = PENDING |
| TC-SUP-02 | 2.1 | Admin approves document | Status = APPROVED; driver notified |
| TC-SUP-03 | 2.1 | Admin rejects document with reason | Status = REJECTED; reason shown to driver |
| TC-SUP-04 | 2.1 | Unverified driver attempts to accept job | Blocked with message |
| TC-SUP-05 | 2.2 | Driver sets availability for Mon–Fri | Schedule saved; driver appears in matching |
| TC-SUP-06 | 2.2 | Driver marks themselves unavailable | Driver excluded from matching results |

### Epic 3 – Job Posting & Matching
| Test ID | Story | Scenario | Expected Result |
|---|---|---|---|
| TC-JOB-01 | 3.1 | Post job with valid addresses | Job created; ref number returned; distance shown |
| TC-JOB-02 | 3.1 | Post job with invalid address | Geocoding error shown; job not created |
| TC-JOB-03 | 3.2 | View matched suppliers | Only verified, available, correct vehicle type shown |
| TC-JOB-04 | 3.3 | Submit quote for a job | Quote saved; haulier notified |
| TC-JOB-05 | 3.3 | Submit second quote for same job | Blocked with "already quoted" error |
| TC-JOB-06 | 3.3 | Edit quote before booking | Quote updated successfully |
| TC-JOB-07 | 3.3 | Edit quote after booking | Blocked with "job already booked" error |

### Epic 4 – Booking & Payment
| Test ID | Story | Scenario | Expected Result |
|---|---|---|---|
| TC-BKG-01 | 4.1 | Haulier views submitted quotes | All quotes listed with supplier details |
| TC-BKG-02 | 4.1 | Haulier selects supplier | Job status → BOOKED; selected supplier notified; others notified |
| TC-BKG-03 | 4.2 | Haulier initiates escrow payment via card | Payment order created; redirect to payment page |
| TC-BKG-04 | 4.2 | Successful payment webhook received | Job payment_status → ESCROWED; supplier sees "Payment Secured" |
| TC-BKG-05 | 4.2 | Failed payment webhook received | Status → FAILED; haulier notified |
| TC-BKG-06 | 4.3 | Haulier approves delivery (payment release) | Payout triggered; status → RELEASED |
| TC-BKG-07 | 4.3 | Invoice generated and downloadable | PDF contains correct fields; pre-signed URL works |

### Epic 5 – Compliance Workflow
| Test ID | Story | Scenario | Expected Result |
|---|---|---|---|
| TC-CMP-01 | 5.1 | Driver enters correct load code | Step 1 complete; Step 2 unlocked |
| TC-CMP-02 | 5.1 | Driver enters wrong load code | Error shown; cannot proceed to Step 2 |
| TC-CMP-03 | 5.2 | Driver cannot access Step 2 before Step 1 | Step 2 locked |
| TC-CMP-04 | 5.2 | Driver submits checklist + photo + signature | Awaiting haulier signature |
| TC-CMP-05 | 5.2 | Both parties sign | Step 2 complete; job → IN_TRANSIT |
| TC-CMP-06 | 5.3 | Haulier cannot sign Step 2 until driver signs | Blocked |
| TC-CMP-07 | 5.3 | Driver submits delivery report | Haulier notified for approval |
| TC-CMP-08 | 5.3 | Haulier approves delivery | Job → COMPLETED; payment released |
| TC-CMP-09 | 5.3 | Haulier disputes delivery | Job → DISPUTED; payment paused |

### Epic 6 – Live Tracking
| Test ID | Story | Scenario | Expected Result |
|---|---|---|---|
| TC-TRK-01 | 6.1 | Driver app sends GPS update | Location stored; broadcast to haulier WebSocket |
| TC-TRK-02 | 6.1 | Haulier opens live tracking view | Map shows current driver position |
| TC-TRK-03 | 6.1 | Driver tracking outside IN_TRANSIT status | Location updates rejected |
| TC-TRK-04 | 6.2 | ETA displayed and updates | ETA recalculates with each location update |
| TC-TRK-05 | 6.2 | ETA deviates > 30 minutes | Delay alert notification sent to haulier |

### Epic 7 – Dashboards
| Test ID | Story | Scenario | Expected Result |
|---|---|---|---|
| TC-DASH-01 | 7.1 | Driver views dashboard | Active job, upcoming jobs, earnings visible |
| TC-DASH-02 | 7.2 | Haulier views dashboard | Active jobs, approvals needed, spend, map shown |
| TC-DASH-03 | 7.3 | Admin views dashboard | KPIs, pending verifications, job monitor shown |

### Epic 8 – Ratings
| Test ID | Story | Scenario | Expected Result |
|---|---|---|---|
| TC-RAT-01 | 8.1 | User rates after completed job | Rating saved; avg updated on profile |
| TC-RAT-02 | 8.1 | User attempts to rate same job twice | Blocked with "already rated" error |
| TC-RAT-03 | 8.1 | User attempts to rate incomplete job | Blocked with "job not completed" error |

## 6. Performance Test Targets
| Scenario | Target |
|---|---|
| POST /auth/login (100 rps) | 95th pct ≤ 300 ms |
| GET /jobs (100 rps) | 95th pct ≤ 500 ms |
| POST /jobs (50 rps) | 95th pct ≤ 800 ms |
| WebSocket: 500 concurrent GPS streams | No dropped messages; latency ≤ 2s |
| Web page initial load (4G) | LCP ≤ 2.5s (Lighthouse) |
| Mobile app cold start | < 3 seconds |

## 7. Defect Classification
| Severity | Definition | SLA to Fix |
|---|---|---|
| P1 – Blocker | Platform down or data loss | Same day |
| P2 – Critical | Core feature broken (payment, compliance) | 2 business days |
| P3 – Major | Feature degraded; workaround exists | Current sprint |
| P4 – Minor | UI/UX issue, non-critical bug | Next sprint |
| P5 – Trivial | Cosmetic issue | Backlog |

## 8. UAT Sign-off Criteria
- All P1 and P2 defects resolved and retested.
- ≥ 95% of test cases passed.
- All 20 user stories signed off by Product Owner.
- Pilot users complete end-to-end flows without facilitator assistance.
- Performance benchmarks met on staging.
- Security scan clean (no Critical or High OWASP findings unresolved).

## 9. Test Environments
| Environment | Purpose | Owner |
|---|---|---|
| Local (dev) | Unit + integration tests | Developers |
| Staging | E2E, performance, security, UAT | QA + DevOps |
| Production | Smoke test post-deployment only | QA + DevOps |

## 10. Approval
| Name | Role | Signature | Date |
|---|---|---|---|
| | QA Lead | | |
| | Product Owner | | |
| | Development Lead | | |
