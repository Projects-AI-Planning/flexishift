# Database Design Document (DDD) – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | Database Design Document (DDD) |
| Version | 1.0 |
| Date | 2026-04-25 |
| Author | Development Lead / Backend Developer |

## 2. Database Overview
| Attribute | Value |
|---|---|
| DBMS | PostgreSQL 15+ |
| Extensions | uuid-ossp, pgcrypto, PostGIS (optional for spatial queries) |
| Character Encoding | UTF-8 |
| Timezone | UTC stored in DB; converted to local in application layer |
| Primary Keys | UUID v4 (all tables) |
| Soft Delete | `deleted_at TIMESTAMPTZ NULL` — records are never hard deleted |
| Audit Columns | `created_at`, `updated_at` on all tables |

---

## 3. Entity-Relationship Overview

```
users (1) ──< (N) documents
users (1) ──< (N) availability_slots        [Driver only]
users (1) ──< (N) jobs                      [Haulier only]
users (1) ──< (N) quotes                    [Supplier only]
jobs  (1) ──< (N) quotes
jobs  (1) ──  (1) bookings
jobs  (1) ──  (1) payments
jobs  (1) ──  (1) compliance_records
jobs  (1) ──< (N) tracking_points
jobs  (1) ──< (N) ratings
users (1) ──< (N) notifications
```

---

## 4. Table Definitions

### 4.1 users
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| full_name | VARCHAR(200) | NOT NULL | User's full name |
| email | VARCHAR(320) | NOT NULL, UNIQUE | Login email |
| phone | VARCHAR(20) | NOT NULL | Contact phone |
| password_hash | VARCHAR(60) | NOT NULL | bcrypt hash |
| role | ENUM('DRIVER','HAULIER','FIRM','ADMIN') | NOT NULL | User role |
| status | ENUM('INACTIVE','ACTIVE','SUSPENDED') | NOT NULL, DEFAULT 'INACTIVE' | Account status |
| profile_complete | BOOLEAN | NOT NULL, DEFAULT false | Profile completeness flag |
| verified | BOOLEAN | NOT NULL, DEFAULT false | Supplier verification flag |
| avg_rating | NUMERIC(3,2) | DEFAULT 0.00 | Cached average rating |
| completed_jobs | INT | DEFAULT 0 | Cached job count |
| location_lat | NUMERIC(10,7) | | Driver/Firm base location |
| location_lng | NUMERIC(10,7) | | Driver/Firm base location |
| bank_account_id | VARCHAR(100) | | Gateway payout recipient ID |
| push_token | VARCHAR(500) | | FCM device token |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | Soft delete |

**Indexes:** `email` (UNIQUE), `role`, `verified`, `location_lat+location_lng`

---

### 4.2 email_verifications
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | |
| token_hash | VARCHAR(64) | NOT NULL | SHA-256 hash of the token |
| expires_at | TIMESTAMPTZ | NOT NULL | 24h from creation |
| used_at | TIMESTAMPTZ | | Set when token consumed |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

### 4.3 password_resets
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | |
| token_hash | VARCHAR(64) | NOT NULL | |
| expires_at | TIMESTAMPTZ | NOT NULL | 24h from creation |
| used_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

### 4.4 user_profiles
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL, UNIQUE | |
| photo_url | VARCHAR(500) | | Profile photo S3 URL |
| licence_number | VARCHAR(50) | | Driver only |
| vehicle_type | VARCHAR(50) | | Driver only |
| vehicle_registration | VARCHAR(20) | | Driver only |
| company_name | VARCHAR(200) | | Haulier / Firm |
| company_address | TEXT | | Haulier / Firm |
| fleet_details | JSONB | | Firm only |
| coverage_area | TEXT | | Firm only |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

### 4.5 documents
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | |
| doc_type | ENUM('DRIVING_LICENCE','VEHICLE_REG','VEHICLE_INSURANCE','COMPANY_REG','FLEET_INSURANCE') | NOT NULL | |
| file_url | VARCHAR(500) | NOT NULL | S3 URL |
| status | ENUM('PENDING','APPROVED','REJECTED') | NOT NULL, DEFAULT 'PENDING' | |
| reviewed_by | UUID | FK → users.id | Admin who reviewed |
| rejection_reason | TEXT | | Set on rejection |
| reviewed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

### 4.6 availability_slots
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| driver_id | UUID | FK → users.id, NOT NULL | |
| day_of_week | SMALLINT | 0–6 (0=Mon) | Recurring weekly slot |
| start_time | TIME | | |
| end_time | TIME | | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

### 4.7 availability_blocks
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| driver_id | UUID | FK → users.id, NOT NULL | |
| block_start | DATE | NOT NULL | Start of unavailable period |
| block_end | DATE | NOT NULL | End of unavailable period |
| reason | TEXT | | Optional |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

### 4.8 jobs
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| haulier_id | UUID | FK → users.id, NOT NULL | Job owner |
| job_ref | VARCHAR(20) | NOT NULL, UNIQUE | e.g. FF-A1B2C3D4 |
| load_code | VARCHAR(10) | NOT NULL | Pickup verification code |
| pickup_address | TEXT | NOT NULL | |
| pickup_lat | NUMERIC(10,7) | NOT NULL | |
| pickup_lng | NUMERIC(10,7) | NOT NULL | |
| drop_address | TEXT | NOT NULL | |
| drop_lat | NUMERIC(10,7) | NOT NULL | |
| drop_lng | NUMERIC(10,7) | NOT NULL | |
| goods_type | VARCHAR(100) | NOT NULL | |
| weight_kg | NUMERIC(10,2) | NOT NULL | |
| vehicle_type | VARCHAR(50) | NOT NULL | |
| job_date | DATE | NOT NULL | |
| time_slot | VARCHAR(50) | NOT NULL | e.g. "09:00–12:00" |
| distance_km | NUMERIC(10,2) | | Calculated |
| duration_min | INT | | Calculated |
| status | ENUM('OPEN','BOOKED','PAYMENT_PENDING','PAYMENT_SECURED','IN_TRANSIT','DELIVERY_SUBMITTED','COMPLETED','DISPUTED','CANCELLED') | NOT NULL, DEFAULT 'OPEN' | |
| selected_supplier_id | UUID | FK → users.id | Set on booking |
| original_eta | TIMESTAMPTZ | | Set on IN_TRANSIT |
| invoice_url | VARCHAR(500) | | Set on payment release |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | |

**Indexes:** `haulier_id`, `status`, `job_date`, `pickup_lat+pickup_lng`

---

### 4.9 quotes
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK → jobs.id, NOT NULL | |
| supplier_id | UUID | FK → users.id, NOT NULL | |
| price | NUMERIC(12,2) | NOT NULL | Quoted price |
| currency | VARCHAR(3) | NOT NULL, DEFAULT 'INR' | ISO 4217 |
| status | ENUM('ACTIVE','SELECTED','REJECTED','WITHDRAWN') | NOT NULL, DEFAULT 'ACTIVE' | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints:** UNIQUE (job_id, supplier_id) — one quote per supplier per job

---

### 4.10 payments
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK → jobs.id, NOT NULL, UNIQUE | |
| gateway_order_id | VARCHAR(100) | NOT NULL | Gateway reference |
| gateway_payment_id | VARCHAR(100) | | Set on capture |
| gateway_payout_id | VARCHAR(100) | | Set on release |
| amount | NUMERIC(12,2) | NOT NULL | |
| currency | VARCHAR(3) | NOT NULL | |
| status | ENUM('PENDING','ESCROWED','RELEASED','FAILED','REFUNDED') | NOT NULL, DEFAULT 'PENDING' | |
| escrowed_at | TIMESTAMPTZ | | |
| released_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

### 4.11 compliance_records
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK → jobs.id, NOT NULL, UNIQUE | |
| step1_completed_at | TIMESTAMPTZ | | Load code verified |
| checklist_data | JSONB | | Vehicle checklist answers |
| condition_photo_urls | TEXT[] | | Array of S3 URLs |
| driver_signature_url | VARCHAR(500) | | S3 URL of signature image |
| driver_signed_at | TIMESTAMPTZ | | |
| haulier_signature_url | VARCHAR(500) | | |
| haulier_signed_at | TIMESTAMPTZ | | |
| step2_completed_at | TIMESTAMPTZ | | Both signed |
| delivery_photo_url | VARCHAR(500) | | |
| recipient_signature_url | VARCHAR(500) | | |
| delivery_notes | TEXT | | |
| delivery_submitted_at | TIMESTAMPTZ | | |
| step3_approved_at | TIMESTAMPTZ | | Haulier approves |
| dispute_reason | TEXT | | Set if disputed |
| disputed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

### 4.12 tracking_points
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK → jobs.id, NOT NULL | |
| lat | NUMERIC(10,7) | NOT NULL | |
| lng | NUMERIC(10,7) | NOT NULL | |
| recorded_at | TIMESTAMPTZ | NOT NULL | Client timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Server receipt time |

**Indexes:** `job_id`, `recorded_at DESC`
**Partition:** Consider range partitioning by month for large datasets

---

### 4.13 ratings
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| job_id | UUID | FK → jobs.id, NOT NULL | |
| rater_id | UUID | FK → users.id, NOT NULL | Who is rating |
| rated_id | UUID | FK → users.id, NOT NULL | Who is being rated |
| stars | SMALLINT | NOT NULL, CHECK (stars BETWEEN 1 AND 5) | |
| review_text | TEXT | | Optional |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints:** UNIQUE (job_id, rater_id) — one rating per user per job

---

### 4.14 notifications
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → users.id, NOT NULL | |
| type | VARCHAR(50) | NOT NULL | e.g. BOOKING_CONFIRMED |
| title | VARCHAR(200) | NOT NULL | |
| body | TEXT | NOT NULL | |
| data | JSONB | | Additional payload |
| read_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

### 4.15 payment_events (Webhook Idempotency Log)
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| gateway_event_id | VARCHAR(100) | NOT NULL, UNIQUE | Gateway's event ID |
| event_type | VARCHAR(100) | NOT NULL | |
| processed_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

## 5. Naming Conventions
| Element | Convention | Example |
|---|---|---|
| Tables | snake_case, plural | `tracking_points` |
| Columns | snake_case | `created_at` |
| ENUMs | UPPER_SNAKE_CASE values | `'IN_TRANSIT'` |
| Indexes | `idx_{table}_{columns}` | `idx_jobs_status` |
| Foreign Keys | `fk_{table}_{referenced}` | `fk_quotes_jobs` |

## 6. Migration Strategy
- All schema changes managed via migration tool (Flyway or Knex migrations).
- Migrations are additive in Phase 1 (no destructive ALTER on production tables).
- Each migration file named: `V{number}__{description}.sql`.
- Rollback scripts required for all Phase 1 migrations.
