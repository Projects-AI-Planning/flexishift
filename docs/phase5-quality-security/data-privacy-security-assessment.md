# Data Privacy & Security Assessment – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Data Privacy & Security Assessment |
| Version | 1.0 |
| Date | 2026-04-25 |
| Author | Development Lead / Legal Advisor |
| Review Frequency | Before go-live; then annually |

## 2. Applicable Regulations
| Regulation | Jurisdiction | Relevance |
|---|---|---|
| General Data Protection Regulation (GDPR) | EU / UK | If platform serves EU/UK users |
| Digital Personal Data Protection Act (DPDPA) 2023 | India | If platform serves Indian users |
| Payment Card Industry DSS (PCI DSS) | Global | Card payment processing |
| RBI Payment Aggregator Guidelines | India | Escrow / payment aggregator licensing |
| Information Technology Act 2000 + Rules | India | Data localisation and e-signatures |
| eIDAS Regulation | EU | Electronic signatures (if EU market) |

---

## 3. Data Inventory (Personal Data Processed)

| Data Category | Data Elements | Subjects | Sensitivity | Legal Basis |
|---|---|---|---|---|
| Identity | Full name, email, phone, profile photo | All users | Standard personal data | Contract performance |
| Authentication | Password hash, JWT tokens, refresh tokens | All users | Standard | Contract |
| Driver credentials | Driving licence number, vehicle registration, insurance | Drivers | Sensitive (ID document) | Legal obligation / Contract |
| Company data | Company name, registered address | Hauliers / Firms | Standard | Contract |
| Location data | GPS coordinates (tracked during active trip) | Drivers | Sensitive (real-time location) | Consent + Contract |
| Financial data | Payment amounts, invoice data, bank account ID | All | Highly sensitive | Contract / Legal obligation |
| Behavioural data | Job history, earnings, ratings | Suppliers | Standard | Legitimate interest |
| Communication data | Notification content | All | Standard | Contract |
| Device data | FCM push token, device type | Mobile users | Standard | Contract |

---

## 4. Privacy by Design Measures

### 4.1 Data Minimisation
- Only collect data strictly necessary for platform operation.
- GPS tracking active **only** during IN_TRANSIT status — not when driver is offline.
- Location history retained for 90 days only, then purged.

### 4.2 Purpose Limitation
- Driver documents stored only for verification purposes and not shared with any third party.
- GPS data used only for live tracking and ETA — not for profiling or marketing.

### 4.3 Storage Limitation
- Job records: 7 years (financial regulatory requirement).
- GPS location history: 90 days.
- Verification documents: duration of active account + 1 year post-closure.
- User accounts: until deletion request, then 30-day grace period before hard delete.

### 4.4 Data Subject Rights
| Right | Implementation |
|---|---|
| Right of Access (SAR) | User can download their data via account settings |
| Right to Rectification | User can edit profile information at any time |
| Right to Erasure | Account deletion request; personal data purged within 30 days |
| Right to Portability | Export of job history and earnings in JSON/CSV |
| Right to Object (profiling) | No automated profiling in Phase 1; N/A |
| Right to Restrict Processing | Account suspension preserves data without active processing |

### 4.5 Consent Management
- Explicit consent collected at registration for:
  1. GPS tracking during active trips (separate toggle)
  2. Marketing communications (optional, off by default)
- Consent records stored with timestamp and version of Privacy Policy accepted.
- Users can withdraw GPS consent, which blocks them from accepting new jobs (disclosed in UX).

---

## 5. Security Controls

### 5.1 Authentication & Access
| Control | Implementation |
|---|---|
| Password hashing | bcrypt with cost factor ≥ 12 |
| JWT signing | RS256 (asymmetric); private key in Secrets Manager |
| Access token expiry | 24 hours |
| Refresh token expiry | 30 days; stored as hash in Redis |
| Failed login lockout | 10 attempts in 15 min → 15-min cooldown |
| MFA (Phase 2) | TOTP / SMS OTP for Admin accounts |
| Role-based access control | Enforced at API middleware; all endpoints require explicit role list |

### 5.2 Data in Transit
| Control | Implementation |
|---|---|
| TLS | TLS 1.2 minimum; TLS 1.3 preferred |
| HSTS | Strict-Transport-Security header (max-age 1 year, includeSubDomains) |
| Certificate | Wildcard cert via Azure App Service Certificates / Let's Encrypt |
| WebSocket | WSS (TLS-encrypted WebSocket) |

### 5.3 Data at Rest
| Control | Implementation |
|---|---|
| Database encryption | Azure Database for MySQL encryption at rest (AES-256) |
| Azure Blob encryption | Server-side encryption (Azure SSE (AES-256)) |
| Secrets management | Azure Key Vault; no secrets in code or env files in repos |
| Backup encryption | RDS automated backups inherit encryption |

### 5.4 Application Security (OWASP Top 10 Mapping)
| OWASP Risk | Mitigation |
|---|---|
| A01 – Broken Access Control | RBAC on every endpoint; ownership checks (haulier can only access own jobs) |
| A02 – Cryptographic Failures | TLS everywhere; bcrypt; AES-256 at rest; no sensitive data in logs |
| A03 – Injection | Parameterised queries (ORM); input validation via class-validator; no raw SQL |
| A04 – Insecure Design | Threat modelling review pre-sprint; secure design principles in LLD |
| A05 – Security Misconfiguration | Hardened Docker images; minimal permissions; no default credentials |
| A06 – Vulnerable Components | Snyk in CI pipeline; weekly dependency audit; npm audit on PR |
| A07 – Auth Failures | Rate limiting on auth endpoints; token rotation; session invalidation on logout |
| A08 – Software Integrity | GitHub branch protection; signed commits; code review required |
| A09 – Logging Failures | Structured JSON logs; sensitive fields masked; Sentry for errors |
| A10 – SSRF | URL validation for any user-provided URLs; no internal metadata fetch |

### 5.5 File Upload Security
- Allowed types: PDF, JPG, PNG only (MIME type + magic bytes check).
- Maximum file size: 10 MB.
- Files scanned for malware (ClamAV or cloud-native scanning) before storage.
- Files served via Azure SAS token URLs (time-limited, no public access).
- Files stored in separate Azure Blob container with no public-read ACL.

### 5.6 Payment Security
- No card data stored on FreightFlex servers (PCI DSS scope minimisation).
- All card processing handled by PCI DSS compliant gateway (Razorpay/Stripe).
- Webhook signature verified (HMAC-SHA256) before processing any payment event.
- Idempotency key used on all payment API calls to prevent double-processing.

### 5.7 Infrastructure Security
| Control | Detail |
|---|---|
| VPC | All services in private subnets; only ALB in public subnet |
| Security groups | Minimal open ports; no 0.0.0.0/0 on DB or internal services |
| IAM | Least-privilege IAM roles; no root account used |
| Container scanning | ECR image scanning on push |
| DDoS protection | Azure DDoS Protection Standard (Phase 1); WAF rules for rate limiting |

---

## 6. Incident Response Plan

### 6.1 Severity Levels
| Severity | Description | Response Time |
|---|---|---|
| P1 – Critical | Confirmed data breach, platform-wide data loss | 1 hour (24/7) |
| P2 – High | Suspected breach, payment system compromise | 4 hours |
| P3 – Medium | Single-user data exposure, minor vulnerability | 24 hours |
| P4 – Low | Security misconfiguration, no data exposed | 72 hours |

### 6.2 Breach Notification Timeline
- GDPR: Notify supervisory authority within **72 hours** of becoming aware.
- DPDPA: Notify Data Protection Board **as soon as possible** (within 72 hours guidance).
- Affected users notified without undue delay if high risk to their rights.

### 6.3 Incident Response Steps
1. **Detect** – Monitor alerts (Sentry, Datadog, CloudTrail).
2. **Contain** – Isolate affected service; revoke compromised credentials.
3. **Assess** – Determine scope of breach; what data, how many users.
4. **Notify** – Legal team notified immediately; regulatory notification if required.
5. **Remediate** – Patch vulnerability; re-deploy clean image.
6. **Review** – Post-incident report within 5 business days.

---

## 7. Privacy Policy Requirements
The Privacy Policy (to be drafted by Legal) must cover:
- Identity of the Data Controller (FreightFlex / Company Name)
- What personal data is collected and why
- Legal basis for each processing activity
- Third-party data sharing (Google Maps, payment gateway, FCM, SendGrid)
- Data retention periods (per section 3 above)
- User rights and how to exercise them
- Cookie policy (web app)
- Contact details for DPO / privacy inquiries

---

## 8. Action Items Before Go-Live
| Item | Owner | Deadline |
|---|---|---|
| Privacy Policy finalised and published | Legal Advisor | Week 16 |
| Terms of Service finalised and published | Legal Advisor | Week 16 |
| DPO appointed (if required) | CEO / Legal | Week 8 |
| Consent flows implemented (GPS + marketing) | Dev Team | Sprint 2 |
| Cookie consent banner implemented (web) | FE Dev | Sprint 5 |
| Snyk in CI pipeline configured | DevOps | Sprint 0 |
| OWASP ZAP scan run and all Critical/High resolved | QA | Sprint 6 |
| Payment gateway escrow agreement signed | PM / Legal | Week 4 |
| Data Processing Agreements (DPA) with Google, Razorpay, SendGrid | Legal | Week 8 |
| RDS encryption at rest confirmed | DevOps | Sprint 0 |
| Azure Blob container policy: no public access confirmed | DevOps | Sprint 0 |
