# Risk Management Plan – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Risk Management Plan |
| Version | 1.0 |
| Date | 2026-04-25 |

## 2. Purpose
Defines the approach for identifying, assessing, responding to, and monitoring risks throughout the FreightFlex project lifecycle.

## 3. Risk Management Approach
- Risks are identified during sprint planning and retrospectives.
- Each risk is scored for Likelihood (1–5) and Impact (1–5).
- Risk Score = Likelihood × Impact.
- High risks (score ≥ 12) require a mitigation action owner and a weekly review.
- The Risk Log is maintained in this document and updated after each sprint.

## 4. Risk Scoring Matrix
| | Impact 1 (Negligible) | Impact 2 (Minor) | Impact 3 (Moderate) | Impact 4 (Major) | Impact 5 (Critical) |
|---|---|---|---|---|---|
| **Likelihood 5 (Almost Certain)** | 5 | 10 | 15 | 20 | 25 |
| **Likelihood 4 (Likely)** | 4 | 8 | 12 | 16 | 20 |
| **Likelihood 3 (Possible)** | 3 | 6 | 9 | 12 | 15 |
| **Likelihood 2 (Unlikely)** | 2 | 4 | 6 | 8 | 10 |
| **Likelihood 1 (Rare)** | 1 | 2 | 3 | 4 | 5 |

**Thresholds:**
- Green (1–5): Monitor
- Amber (6–11): Plan mitigation
- Red (12–25): Active mitigation required

## 5. Risk Register

| Risk-ID | Risk Description | Category | Likelihood (1–5) | Impact (1–5) | Score | Rating | Mitigation Strategy | Contingency | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| RSK-01 | Scope creep inflates timeline beyond 20 weeks | Scope | 4 | 4 | 16 | Red | Strict change control; freeze scope after Sprint 2 | De-scope lower-priority stories to a Phase 2 | PM / PO | Open |
| RSK-02 | Payment gateway escrow licensing delayed | External | 3 | 5 | 15 | Red | Start procurement in Week 1; backup gateway identified | Use basic payment hold (manual) in UAT if delayed | Dev Lead | Open |
| RSK-03 | Google Maps API cost overrun | Financial | 3 | 3 | 9 | Amber | Set billing alerts; cache geocode results; use free-tier for dev | Switch to OpenStreetMap / Mapbox for non-critical features | DevOps | Open |
| RSK-04 | GPS accuracy on low-end Android devices | Technical | 3 | 3 | 9 | Amber | Test on minimum spec device (Android 9, 2GB RAM); network fallback | Increase update interval if battery/signal issues | Mobile Dev | Open |
| RSK-05 | Key developer leaving mid-project | People | 2 | 4 | 8 | Amber | Knowledge sharing sessions; all code reviewed; docs maintained | Pre-qualify backup contractor | PM | Open |
| RSK-06 | Data breach or security vulnerability pre-launch | Security | 2 | 5 | 10 | Amber | OWASP best practices; Snyk scans; OWASP ZAP pen test in Sprint 6 | Incident response plan; delay go-live if critical vuln found | Dev Lead | Open |
| RSK-07 | Payment dispute mechanism not sufficient for regulators | Legal | 2 | 4 | 8 | Amber | Legal review of dispute flow in Phase 5 doc; use licensed aggregator | Engage legal counsel; add manual dispute resolution process | Legal Advisor | Open |
| RSK-08 | Pilot users unavailable for UAT in Weeks 18–19 | Schedule | 3 | 3 | 9 | Amber | Confirm pilot users by Week 8; provide incentives | Use internal team as proxy testers | PM / PO | Open |
| RSK-09 | WebSocket server overloaded at scale | Technical | 2 | 3 | 6 | Amber | Load test in Sprint 6; design for horizontal scaling | Increase instance count; implement rate limiting | DevOps | Open |
| RSK-10 | React Native breaking changes from library update | Technical | 2 | 2 | 4 | Green | Lock dependency versions; review changelogs before updating | Roll back library version | Mobile Dev | Open |
| RSK-11 | Third-party API (Maps/Payment) downtime during demo | External | 2 | 3 | 6 | Amber | Mock API stubs for demos; use sandbox environments | Switch to backup API provider | Dev Lead | Open |
| RSK-12 | GDPR/DPDPA non-compliance at launch | Legal | 2 | 5 | 10 | Amber | Privacy assessment in Phase 5; DPO appointed; consent flows built | Delay go-live; engage DPO for emergency review | Legal Advisor | Open |
| RSK-13 | Budget overrun due to cloud/API costs | Financial | 2 | 3 | 6 | Amber | Monthly cost review; set budget alerts; use auto-scaling policies | Reduce infra tier temporarily; negotiate vendor credits | PM / DevOps | Open |
| RSK-14 | Admin team not ready for go-live | Operational | 2 | 3 | 6 | Amber | Training plan in Week 18; admin documentation in `/docs` | Extend hypercare; PO supports admin team directly | PO | Open |

## 6. Risk Response Strategies
| Strategy | Description | When to Use |
|---|---|---|
| Avoid | Change plan to eliminate the risk | High likelihood + high impact, feasible to remove |
| Mitigate | Take actions to reduce likelihood or impact | Most risks |
| Transfer | Shift risk to third party (insurance, contract) | Financial or legal risks |
| Accept | Acknowledge risk; monitor | Low score, cost of mitigation exceeds impact |
| Contingency | Pre-planned response if risk materialises | All Red and Amber risks |

## 7. Risk Review Schedule
| Event | Frequency |
|---|---|
| Risk log review | Every sprint planning session (bi-weekly) |
| High-risk status update | Weekly (PM + Dev Lead) |
| Full risk reassessment | Mid-project (Week 10) and pre-UAT (Week 17) |

## 8. Risk Escalation
- Risk score increases to Red → immediate escalation to Project Sponsor within 24 hours.
- New critical risk identified → emergency risk review meeting within 48 hours.
