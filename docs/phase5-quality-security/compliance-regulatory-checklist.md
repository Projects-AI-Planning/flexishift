# Compliance & Regulatory Checklist – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Compliance / Regulatory Checklist |
| Version | 1.0 |
| Date | 2026-04-25 |
| Author | Legal Advisor / Development Lead |
| Review | Before go-live; then bi-annually |

## 2. How to Use This Checklist
Each item must be marked **Done**, **In Progress**, or **Not Applicable** before go-live sign-off. Items marked Not Applicable must have a written justification. All Done items require evidence (document reference, screenshot, or sign-off name).

---

## 3. Legal & Corporate Compliance

| # | Requirement | Status | Evidence / Notes | Owner |
|---|---|---|---|---|
| L-01 | Company is legally registered to operate a freight marketplace | ☐ | Certificate of Incorporation | CEO |
| L-02 | Terms of Service drafted, reviewed by legal counsel, and published | ☐ | URL: TBD | Legal |
| L-03 | Privacy Policy drafted, reviewed by legal counsel, and published | ☐ | URL: TBD | Legal |
| L-04 | Cookie Policy published on web app | ☐ | URL: TBD | Legal / FE Dev |
| L-05 | Supplier onboarding T&C (driver / firm agreement) finalised | ☐ | Document: TBD | Legal |
| L-06 | Haulier onboarding T&C finalised | ☐ | Document: TBD | Legal |
| L-07 | Refund and dispute resolution policy published | ☐ | URL: TBD | Legal |

---

## 4. Data Privacy Compliance

| # | Requirement | Regulation | Status | Evidence | Owner |
|---|---|---|---|---|---|
| DP-01 | Data Protection Officer (DPO) appointed (if required by GDPR/DPDPA) | GDPR Art. 37 / DPDPA | ☐ | DPO appointment letter | CEO / Legal |
| DP-02 | Records of Processing Activities (RoPA) documented | GDPR Art. 30 | ☐ | RoPA document | DPO |
| DP-03 | Data Processing Agreements (DPA) signed with all sub-processors: Google Maps, Razorpay/Stripe, SendGrid, Firebase, Azure | GDPR Art. 28 | ☐ | Signed DPAs | Legal |
| DP-04 | Lawful basis for each processing activity documented | GDPR Art. 6 / DPDPA | ☐ | Privacy Assessment doc | DPO |
| DP-05 | Explicit consent collected for GPS tracking at registration | GDPR Art. 7 | ☐ | Dev sign-off: consent screen in app | Dev Team |
| DP-06 | Consent withdrawal mechanism implemented (disable GPS tracking) | GDPR Art. 7 | ☐ | Dev sign-off | Dev Team |
| DP-07 | Cookie consent banner implemented (web app) | ePrivacy Directive | ☐ | Dev sign-off | FE Dev |
| DP-08 | Right of Access (SAR) mechanism implemented | GDPR Art. 15 | ☐ | Dev sign-off: data export feature | Dev Team |
| DP-09 | Right to Erasure (account deletion) implemented | GDPR Art. 17 | ☐ | Dev sign-off: deletion flow | Dev Team |
| DP-10 | Data retention periods implemented and documented | GDPR Art. 5(e) | ☐ | Automated purge jobs scheduled | Dev / DevOps |
| DP-11 | Personal data not transferred outside approved jurisdictions without adequate safeguards | GDPR Ch. V | ☐ | Infrastructure region confirmed | DevOps |
| DP-12 | Privacy impact assessment (DPIA) completed for GPS tracking feature | GDPR Art. 35 | ☐ | DPIA document | DPO |

---

## 5. Payment & Financial Compliance

| # | Requirement | Regulation | Status | Evidence | Owner |
|---|---|---|---|---|---|
| FN-01 | Payment aggregator with valid licence contracted (nodal/escrow account) | RBI PA Guidelines (India) / FCA (UK) | ☐ | Signed contract with Razorpay/Stripe | Legal / PM |
| FN-02 | No card data stored on FreightFlex servers (PCI DSS scope minimisation) | PCI DSS | ☐ | Architecture review confirming tokenisation only | Dev Lead |
| FN-03 | Payment gateway webhook signatures verified (HMAC) | PCI DSS / Best Practice | ☐ | Code review sign-off | Dev Lead |
| FN-04 | Invoice includes required tax fields (GST/VAT number, tax breakdown) | GST Act / VAT Act | ☐ | Invoice template review | Legal / Dev |
| FN-05 | GST / VAT registration obtained (if applicable) | Tax law | ☐ | Registration certificate | Finance / Legal |
| FN-06 | Refund policy compliant with applicable consumer protection law | Consumer Protection Act | ☐ | Legal review | Legal |
| FN-07 | Anti-money laundering (AML) obligations assessed; KYC process for high-value transactions considered | PMLA / AML regulations | ☐ | Legal memo | Legal |

---

## 6. Transport & Industry Compliance

| # | Requirement | Regulation | Status | Evidence | Owner |
|---|---|---|---|---|---|
| TR-01 | Platform verifies driver holds valid commercial driving licence | Motor Vehicles Act / Road Traffic Act | ☐ | Document upload + admin verification flow | Dev Team |
| TR-02 | Platform verifies vehicle insurance is valid | Motor Vehicles Act | ☐ | As above | Dev Team |
| TR-03 | Platform verifies vehicle registration | Motor Vehicles Act | ☐ | As above | Dev Team |
| TR-04 | Firm document verification includes fleet insurance | Industry requirement | ☐ | As above | Dev Team |
| TR-05 | Platform does not employ drivers (supplier relationship clearly defined as independent contractor) | Employment law | ☐ | Legal review of supplier T&C | Legal |

---

## 7. Security & Technical Compliance

| # | Requirement | Standard | Status | Evidence | Owner |
|---|---|---|---|---|---|
| SEC-01 | All data in transit encrypted with TLS 1.2+ | OWASP / PCI DSS | ☐ | SSL Labs A rating on go-live domain | DevOps |
| SEC-02 | HSTS header configured | OWASP | ☐ | Security headers scan | DevOps |
| SEC-03 | All passwords hashed with bcrypt (cost ≥ 12) | OWASP | ☐ | Code review sign-off | Dev Lead |
| SEC-04 | OWASP Top 10 assessment completed; Critical/High findings remediated | OWASP | ☐ | ZAP scan report | QA / Dev |
| SEC-05 | Dependency vulnerability scan clean (Snyk / npm audit) | OWASP A06 | ☐ | Snyk report | DevOps |
| SEC-06 | Secrets stored in Secrets Manager (no secrets in code) | Best practice | ☐ | Code review + Secrets Manager config | Dev Lead |
| SEC-07 | Azure Blob containers: no public access enabled | Azure best practice | ☐ | Azure Blob Storage Block Public Access config | DevOps |
| SEC-08 | Database: encryption at rest enabled | PCI DSS / GDPR | ☐ | RDS encryption config | DevOps |
| SEC-09 | IAM: least privilege roles; no root account used for app | Azure best practice | ☐ | IAM policy review | DevOps |
| SEC-10 | File uploads: type and size validation + malware scan | Best practice | ☐ | Code review sign-off | Dev Lead |
| SEC-11 | Rate limiting on auth and sensitive endpoints | OWASP | ☐ | Load test confirms limits applied | Dev / QA |
| SEC-12 | Logging: sensitive fields masked (password, token, card) | GDPR / Best practice | ☐ | Log review in staging | Dev Lead |
| SEC-13 | CORS restricted to approved origins | OWASP | ☐ | Code review sign-off | Dev Lead |

---

## 8. Accessibility Compliance

| # | Requirement | Standard | Status | Evidence | Owner |
|---|---|---|---|---|---|
| ACC-01 | Web app meets WCAG 2.1 AA for colour contrast (4.5:1 minimum) | WCAG 2.1 AA | ☐ | Axe / Lighthouse audit | FE Dev |
| ACC-02 | All interactive elements have accessible labels | WCAG 2.1 AA | ☐ | Axe audit | FE Dev |
| ACC-03 | Keyboard navigation works for all core haulier and admin flows | WCAG 2.1 AA | ☐ | Manual keyboard test | QA |
| ACC-04 | Focus states visible on all interactive elements | WCAG 2.1 AA | ☐ | Visual review | Designer / FE Dev |

---

## 9. Go-Live Compliance Sign-Off

All items in sections 3–8 must be resolved before production deployment.

| Sign-Off | Role | Status | Date |
|---|---|---|---|
| Legal sign-off (T&C, Privacy Policy, DPAs) | Legal Advisor | ☐ | |
| Security sign-off (OWASP, pen test clean) | Dev Lead | ☐ | |
| Privacy sign-off (GDPR/DPDPA, DPO) | DPO | ☐ | |
| Payment compliance sign-off (PCI scope, aggregator contract) | Finance / Legal | ☐ | |
| Product Owner final sign-off | Product Owner | ☐ | |
| Project Sponsor go-live approval | Project Sponsor | ☐ | |

---

## 10. Revision History
| Version | Date | Author | Change Summary |
|---|---|---|---|
| 1.0 | 2026-04-25 | Legal / Dev Lead | Initial checklist — pre-development |
