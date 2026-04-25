# Communication Plan – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Communication Plan |
| Version | 1.0 |
| Date | 2026-04-25 |

## 2. Purpose
Defines what information is communicated, to whom, by whom, how, and how often throughout the FreightFlex project. Ensures all stakeholders have the right information at the right time.

## 3. Communication Principles
1. Default to written communication (Slack / email) so there is a searchable record.
2. Decisions made verbally in meetings must be captured in meeting notes and shared within 24 hours.
3. Urgent issues (blockers, critical bugs, security incidents) use synchronous channels (Slack DM / call).
4. Sensitive information (contracts, financials, legal) communicated via email only — not Slack.

## 4. Communication Matrix

| Comm-ID | Communication | Purpose | Audience | Owner | Frequency | Channel | Format |
|---|---|---|---|---|---|---|---|
| COM-01 | Daily Stand-up | Sync team on progress, blockers | Dev Team, QA, DevOps | Scrum Master / PM | Daily (weekdays) | Google Meet / Slack Huddle | Verbal (15 min) |
| COM-02 | Sprint Planning | Plan upcoming sprint backlog | Dev Team, PO, QA | PO / PM | Every 2 weeks (Day 1 of sprint) | Google Meet | Workshop (2 hrs) |
| COM-03 | Sprint Review | Demo completed work to stakeholders | Dev Team, PO, Sponsor, Designers | Dev Lead / PO | Every 2 weeks (Day 14 of sprint) | Google Meet | Demo + Q&A (1 hr) |
| COM-04 | Sprint Retrospective | Improve team process | Dev Team, QA, PM | Scrum Master | Every 2 weeks (after review) | Google Meet | Facilitated discussion (45 min) |
| COM-05 | Weekly Status Report | Project health update to sponsors | Project Sponsor, CFO | PM | Weekly (Friday) | Email | 1-page report (PDF/email) |
| COM-06 | Risk Review | Review risk log | PM, Dev Lead, PO | PM | Bi-weekly (with sprint planning) | Slack / Google Meet | Risk log walkthrough |
| COM-07 | Design Review | Sign off wireframes and mockups | PO, Dev Lead, FE Dev, Mobile Dev | Designer | As needed (Weeks 1–4) | Figma link + Google Meet | Review session |
| COM-08 | Technical Architecture Review | Review and agree technical decisions | Dev Lead, Backend Dev, DevOps | Dev Lead | As needed | Google Meet | ADR (Architecture Decision Record) |
| COM-09 | Stakeholder Update (Haulier/Driver Pilots) | Keep pilot users engaged | Pilot hauliers and drivers | PO | Monthly (Weeks 4, 8, 12, 16) | Email | Plain-language update |
| COM-10 | UAT Briefing | Prepare UAT participants | Pilot users, PO, QA | QA Lead / PO | Once (Week 17) | Google Meet + email | Walkthrough doc |
| COM-11 | Go-Live Communication | Announce platform launch | All stakeholders, pilot users | PM / PO | Once (Week 20) | Email + push notification | Announcement email |
| COM-12 | Incident Notification | Alert team to production issues | Dev Team, DevOps, PO | DevOps / Dev Lead | Immediate on incident | Slack #incidents | Auto-alert (Sentry / Datadog) + manual note |
| COM-13 | Legal & Compliance Update | Share legal sign-offs | PM, PO, Sponsor | Legal Advisor | As milestones reached | Email | Formal memo |
| COM-14 | Budget Review | Financial status update | PM, Sponsor, CFO | PM / Finance | Monthly | Email + meeting | Financial report |

## 5. Meeting Cadence Summary
| Meeting | Day | Time | Duration |
|---|---|---|---|
| Daily Stand-up | Mon–Fri | 09:30 local | 15 min |
| Sprint Planning | Every other Monday | 10:00 local | 2 hours |
| Sprint Review | Every other Friday | 14:00 local | 1 hour |
| Sprint Retrospective | Every other Friday | 15:15 local | 45 min |
| Weekly Status Report | Friday | Sent by 17:00 | Async |
| Risk Review | Aligned with Sprint Planning | | 30 min |

## 6. Communication Tools
| Tool | Purpose |
|---|---|
| Slack | Day-to-day team communication, alerts |
| Google Meet | Video calls and screen sharing |
| Email | Formal communications, sponsor updates, legal matters |
| GitHub | Code reviews, PR comments, issue tracking |
| Jira / Linear | Sprint backlog, task status |
| Figma | Design reviews and comments |
| Confluence / Notion (optional) | Meeting notes, ADRs (if adopted) |
| Sentry / Datadog | Automated incident alerts |

## 7. Escalation Communication Protocol
| Severity | Response Time | Channel | Notify |
|---|---|---|---|
| P1 – Platform down (production) | Immediate | Slack #incidents + phone | Dev Lead, PM, PO |
| P2 – Critical bug (data loss / payment) | 2 hours | Slack + email | Dev Lead, QA Lead, PO |
| P3 – High bug (feature broken) | 4 hours | Slack | Dev Lead, QA Lead |
| P4 – Medium / Low bug | Next sprint | Jira ticket | QA Lead |

## 8. Information Distribution List
| Distribution | Content | Recipients |
|---|---|---|
| Weekly Status Report | Milestones, risks, budget, blockers | Sponsor, CFO, PO |
| Sprint Review Notes | Sprint summary, demo outcomes, decisions | All core team + Sponsor |
| Risk Log | Updated risk register | PM, Dev Lead, PO |
| Legal Sign-offs | T&C, Privacy Policy approvals | Sponsor, PM, Legal |
| UAT Reports | UAT results, defect list | PO, QA Lead, Sponsor |
