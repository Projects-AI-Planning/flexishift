# FreightFlex – Shift Booking Module
## Logic Documentation · Timeline · Costing
**Prepared for: 1:30 PM Meeting — 19 May 2026**

---

## 1. What Is a Shift Booking?

A **Shift** is a multi-day, time-bound work booking where a haulier arranges a driver, a truck, or both, for a defined number of days and working hours per day. Unlike a single job (point-to-point freight delivery), a shift is a repeating daily engagement that:

- Spans one or more consecutive calendar days
- Has a defined number of working hours per day
- Pays the driver at the end of each completed day
- Can be cancelled mid-run by either the haulier or the driver

---

## 2. Core Concepts

### 2.1 Trip Priority

| Type | Description | Use Case |
|------|-------------|----------|
| **Urgent** | Needs to start same day or next day | Last-minute cover, breakdowns, sudden demand |
| **Scheduled** | Fixed future start date | Planned project work, recurring routes |

An `is_urgent` flag is set on creation. Urgent shifts appear at the top of the driver's available shift feed with a visual badge.

### 2.2 Requirement Type

What the haulier needs the supplier to provide:

| Type | Haulier Provides | Driver Provides | Typical Use |
|------|-----------------|-----------------|-------------|
| `DRIVER_ONLY` | Truck | Themselves + licence | Haulier owns fleet, needs a driver |
| `TRUCK_WITH_DRIVER` | Nothing | Truck + themselves | Full service, haulier has neither |
| `TRUCK_ONLY` | Driver | Truck | Haulier has driver, needs vehicle |

### 2.3 Multi-Day Booking

- `start_date` and `end_date` define the full engagement window
- `total_days = (end_date - start_date).days + 1`
- `hours_per_day` sets the daily shift length (e.g. 8, 10, 12 hours)
- `days_completed` tracks progress — incremented after each day is signed off
- Payment fires once per day, immediately after sign-off

### 2.4 Daily Payment Model

```
Daily Rate × 1 day = Payment released to driver after that day's sign-off
Total Contract Value = Daily Rate × Total Days
```

Payments are held in escrow for the entire engagement. Each day, the haulier marks the day complete, and that day's payment is released to the driver's wallet. Remaining days stay in escrow until completed or the shift is cancelled.

---

## 3. Shift Status State Machine

```
OPEN
  │
  │  Haulier accepts a driver's quote
  ▼
BOOKED
  │
  │  First day begins (haulier marks Day 1 complete)
  ▼
IN_PROGRESS
  │                        │
  │  All days completed    │  Haulier or driver cancels
  ▼                        ▼
COMPLETED              CANCELLED
```

| Status | Meaning |
|--------|---------|
| `OPEN` | Posted, accepting driver quotes |
| `BOOKED` | Driver selected, awaiting first day |
| `IN_PROGRESS` | At least one day completed, engagement ongoing |
| `COMPLETED` | All days finished, full payment released |
| `CANCELLED` | Terminated early by haulier or driver |

---

## 4. Full Booking Lifecycle

### Step 1 — Haulier Posts a Shift

Haulier fills in:
- Requirement type (Driver Only / Truck with Driver / Truck Only)
- Priority (Urgent / Scheduled)
- Start date, end date
- Hours per day
- Pickup and drop address
- Daily rate (optional — can leave open for driver bidding)
- Notes / special instructions

System calculates `total_days` automatically.

### Step 2 — Drivers Browse & Quote

Drivers see open shifts filtered by requirement type and location. Each driver submits:
- Amount per day
- Optional notes

System calculates `total_amount = amount_per_day × total_days` and shows it to the haulier.

### Step 3 — Haulier Accepts a Quote

Haulier reviews all quotes for their shift and accepts one. All other pending quotes are automatically rejected. Shift moves to `BOOKED`.

### Step 4 — Daily Operations

Each day:
1. Driver completes their hours
2. Haulier marks the day as complete via `POST /shifts/{id}/days/complete`
3. System increments `days_completed`
4. Payment for that day is released to the driver's wallet
5. If `days_completed < total_days` → status stays `IN_PROGRESS`
6. If `days_completed == total_days` → status moves to `COMPLETED`

### Step 5 — Cancellation (Mid-Engagement)

Either party can cancel at any point before `COMPLETED`:

**Haulier cancels:**
- Days already completed → payment already released, non-refundable
- Remaining days → escrow refunded to haulier

**Driver cancels:**
- Days already completed → payment retained by driver
- Remaining days → haulier's escrow refunded, shift re-posted or haulier compensated per policy

---

## 5. Cancellation Policy

| Scenario | Completed Days Payment | Remaining Days Escrow |
|----------|----------------------|----------------------|
| Haulier cancels (any time) | Driver keeps | Refunded to haulier |
| Driver cancels before Day 1 | N/A | Refunded to haulier |
| Driver cancels mid-engagement | Driver keeps | Refunded to haulier |
| Driver cancels with < 24h notice | Driver keeps earned + penalty deducted | Refunded to haulier |

> Penalty logic (< 24h cancellation by driver) is configurable per platform policy.

---

## 6. API Endpoints (Already Built)

| Method | Endpoint | Who | Purpose |
|--------|----------|-----|---------|
| `POST` | `/shifts/create` | Haulier | Post a new shift |
| `GET` | `/shifts/list` | Haulier / Driver | List own shifts |
| `GET` | `/shifts/available` | Driver | Browse open shifts |
| `GET` | `/shifts/{id}` | Any | Get shift detail |
| `POST` | `/shifts/{id}/quote` | Driver | Submit a quote |
| `DELETE` | `/shifts/{id}/quote` | Driver | Withdraw quote |
| `GET` | `/shifts/{id}/quotes` | Haulier | View all quotes |
| `POST` | `/shifts/{id}/quotes/{qid}/accept` | Haulier | Accept a quote |
| `POST` | `/shifts/{id}/days/complete` | Haulier | Mark a day done + trigger payment |
| `PUT` | `/shifts/cancel/{id}` | Haulier or Driver | Cancel shift |

---

## 7. Database Schema (Current)

### `shifts` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `haulier_id` | UUID → users | Who posted |
| `shift_ref` | `SH-XXXXXXXX` | Human-readable reference |
| `requirement_type` | ENUM | `DRIVER_ONLY` / `TRUCK_WITH_DRIVER` / `TRUCK_ONLY` |
| `start_date` | DATE | First day |
| `end_date` | DATE | Last day |
| `total_days` | INT | Calculated on create |
| `hours_per_day` | INT | Daily working hours |
| `pickup_address` | TEXT | Where driver reports |
| `drop_address` | TEXT | Delivery/end point |
| `location` | TEXT | Display string |
| `daily_rate` | DECIMAL | Haulier's offered rate (optional) |
| `status` | ENUM | Current lifecycle state |
| `selected_driver_id` | UUID → users | Set after quote accepted |
| `days_completed` | INT | Running counter |
| `notes` | TEXT | Instructions |
| `created_at` / `updated_at` | DATETIME | Audit |

### `shift_quotes` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `shift_id` | UUID → shifts | Parent shift |
| `driver_id` | UUID → users | Who quoted |
| `amount_per_day` | DECIMAL | Driver's daily rate |
| `total_amount` | DECIMAL | `amount_per_day × total_days` |
| `status` | ENUM | `PENDING` / `ACCEPTED` / `REJECTED` / `WITHDRAWN` |
| `notes` | TEXT | Driver's message |

---

## 8. What Needs to Be Added

The core shift engine is built. The following items are **pending implementation**:

### 8.1 Urgency Flag (Small — 0.5 days)

**Backend:** Add `is_urgent: bool` column to `shifts` table + migration. Include in `ShiftCreateRequest` and `ShiftOut`. Add optional ordering: urgent shifts sort above scheduled in `list_available_shifts()`.

**Frontend:** Toggle switch on the "Post Shift" form. Badge on shift cards.

**Mobile:** Filter chip on driver's shift feed.

### 8.2 Per-Day Payment Trigger (Medium — 1.5 days)

The `complete_shift_day` endpoint exists but currently only increments the counter. Payment logic needs to be wired:

1. On `POST /shifts/{id}/days/complete`:
   - Look up accepted quote's `amount_per_day`
   - Call payment service: `release_escrow(amount=daily_rate, to=driver_id, from=haulier_id, ref=shift_ref_day_N)`
   - Create a `ShiftDayPayment` record for auditability
   - Send notification to driver: "Day N payment of £X released"

2. **New table needed:** `shift_day_payments`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `shift_id` | UUID | Parent shift |
| `day_number` | INT | Which day (1, 2, 3...) |
| `driver_id` | UUID | Recipient |
| `amount` | DECIMAL | Amount paid |
| `paid_at` | DATETIME | When released |
| `payment_ref` | STRING | Gateway reference |

### 8.3 Escrow on Booking (Medium — 1 day)

When haulier accepts a quote:
- Full contract value (`amount_per_day × total_days`) is locked in escrow
- Escrow is consumed day by day as `complete_shift_day` is called
- On cancellation: consumed portion = `days_completed × amount_per_day`, remainder refunded

### 8.4 Cancellation Penalty (Small — 0.5 days)

Add logic in `cancel_shift()`:
- Calculate hours to next shift start
- If driver cancels with < 24h notice → flag for penalty review or auto-deduct platform fee

---

## 9. Implementation Timeline

| Phase | Work Items | Owner | Duration | Target Date |
|-------|-----------|-------|----------|-------------|
| **Phase 1** | Urgency flag (DB + API + frontend toggle + mobile badge) | Backend + Frontend | 0.5 days | Day 1 |
| **Phase 2** | Escrow lock on quote acceptance | Backend | 1 day | Day 1–2 |
| **Phase 3** | Per-day payment trigger on `complete_shift_day` + `shift_day_payments` table | Backend | 1.5 days | Day 2–3 |
| **Phase 4** | Cancellation escrow refund logic + penalty hook | Backend | 0.5 days | Day 3 |
| **Phase 5** | Driver mobile UI — shift card, quote form, day status, payment history | Mobile | 2 days | Day 3–5 |
| **Phase 6** | Haulier web UI — post shift form, quote review, day sign-off button | Frontend | 2 days | Day 3–5 |
| **Phase 7** | Email/push notifications per event (booked, day complete, cancelled, paid) | Backend | 1 day | Day 5 |
| **Phase 8** | QA + end-to-end testing | All | 1 day | Day 6 |

**Total estimate: 6 working days** from start to production-ready.

> Phase 1 backend (urgency flag) can go live in < 4 hours. Core shift posting, quoting, and cancellation are already live.

---

## 10. Costing Model

### 10.1 Platform Fee Options

| Model | How It Works | Recommended For |
|-------|-------------|-----------------|
| **Percentage per day** | Platform takes X% of each daily payment at release | Scales with usage |
| **Flat per shift** | Fixed fee when shift is booked | Predictable revenue |
| **Subscription** | Hauliers pay monthly, unlimited shifts | High-volume hauliers |

**Recommended:** Percentage per day (e.g. 5–8%) — aligns platform revenue with actual work done and is easy to explain to both parties.

### 10.2 Example Costing (Percentage Model)

```
Shift: 5 days × £180/day = £900 total contract value
Platform fee: 6% = £54 (£10.80 per day)
Driver receives per day: £180 − £10.80 = £169.20
Driver total: £846 over 5 days
Platform earns: £54 over the shift lifecycle
```

### 10.3 Escrow Flow

```
Day 0 (booking):   Haulier's account: −£900 → Escrow: +£900

Day 1 sign-off:    Escrow: −£180 → Driver wallet: +£169.20 + Platform: +£10.80
Day 2 sign-off:    Escrow: −£180 → Driver wallet: +£169.20 + Platform: +£10.80
Day 3 sign-off:    Escrow: −£180 → Driver wallet: +£169.20 + Platform: +£10.80
...

Day 5 sign-off:    Escrow: £0    → All settled
```

### 10.4 Cancellation Refund

```
Shift cancelled after Day 2 of 5:

Earned by driver:     2 × £169.20 = £338.40 (already released, non-refundable)
Platform earned:      2 × £10.80  = £21.60  (already taken)
Refunded to haulier:  3 × £180    = £540.00 (from remaining escrow)
```

---

## 11. Notifications (Per Event)

| Event | Notify | Channel |
|-------|--------|---------|
| Shift posted (urgent) | Nearby qualified drivers | Push + in-app |
| Driver submits quote | Haulier | Push + in-app |
| Haulier accepts quote | Winning driver + rejected drivers | Push + email |
| Day marked complete | Driver | Push + in-app ("Day N payment released") |
| Shift completed | Both | Push + email |
| Shift cancelled by haulier | Driver | Push + email |
| Shift cancelled by driver | Haulier | Push + email |

---

## 12. Summary — What's Live vs. What's Pending

| Feature | Status |
|---------|--------|
| Post a shift (requirement type, dates, hours, rate) | ✅ Live |
| Driver browse & quote | ✅ Live |
| Haulier accept quote | ✅ Live |
| Day-by-day completion counter | ✅ Live |
| Cancellation (haulier & driver) | ✅ Live |
| Quote withdrawal | ✅ Live |
| **Urgency flag (urgent vs scheduled)** | 🔲 Pending — 0.5 days |
| **Escrow lock on booking** | 🔲 Pending — 1 day |
| **Per-day payment release** | 🔲 Pending — 1.5 days |
| **Cancellation refund from escrow** | 🔲 Pending — 0.5 days |
| **Cancellation penalty (< 24h)** | 🔲 Pending — 0.5 days |
| **Notifications per event** | 🔲 Pending — 1 day |

**Total remaining backend work: ~5 days**
**Total remaining frontend/mobile work: ~4 days**
**Full feature launch: 6 working days from today**

---

*FreightFlex Shift Module — Prepared 19 May 2026*
