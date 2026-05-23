# FlexiShift – Shift Booking Module
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

---

## 13. Edge Cases & Frequently Asked Questions

---

### SECTION A — Driver Cancellation Mid-Shift

---

**Q1. The driver cancels in the middle of the shift. What happens to the job?**

The shift is marked `CANCELLED`. Days already completed and paid are final — those payments are not reversed. The remaining days are removed from the schedule and the escrow for those remaining days is refunded to the haulier's account within 1–2 business days.

The haulier is then free to:
- Re-post the shift for the remaining days as a new shorter shift
- Find a replacement driver directly and book them manually
- Absorb the disruption if the remaining days are few

The system does NOT automatically reassign the driver. The haulier must take action.

---

**Q2. What happens to the money already paid to the driver when they cancel mid-shift?**

| Payment | Outcome |
|---------|---------|
| Days already completed and signed off | Driver keeps the money — fully earned, non-refundable |
| Current day (in progress, not yet signed off) | Not released — stays in escrow and is refunded to haulier |
| Future days not yet started | Fully refunded to haulier from escrow |

**Example:** Driver is booked for 5 days at £180/day. They cancel after Day 3 is complete but Day 4 has not started.

```
Driver keeps:       3 × £180 = £540 (Days 1–3 already released)
Refunded to haulier: 2 × £180 = £360 (Days 4–5 from escrow)
```

---

**Q3. What if the driver cancels with less than 24 hours notice?**

A late cancellation penalty applies. The platform deducts a penalty fee from the driver's next payout or wallet balance. The penalty amount is platform-configurable (default: 50% of one day's rate).

| Notice Given | Penalty |
|-------------|---------|
| > 24 hours | No penalty |
| 12–24 hours | 25% of one day's rate |
| < 12 hours | 50% of one day's rate |
| No-show (day already started) | 100% of one day's rate |

The penalty goes to the haulier as partial compensation, not to the platform. The driver is notified via push and email at the time of cancellation showing the exact penalty amount deducted.

---

**Q4. What if the driver simply stops showing up without cancelling?**

This is a no-show. After a configurable grace period (default: 2 hours past the expected start time), the haulier can raise a no-show report. The system then:

1. Automatically cancels the shift
2. Applies the maximum penalty (100% of one day's rate) to the driver
3. Refunds all remaining escrow to the haulier
4. Flags the driver's account with a reliability mark (3 flags = temporary suspension)
5. Opens an escalation ticket (see Section C)

---

**Q5. Can a driver cancel after the shift has started on the same day?**

Yes, but the day's payment is not released because the haulier has not signed off. The current day is treated as incomplete:
- No payment released for the current day
- Penalty applied as a no-show (100% of one day's rate)
- Remaining days refunded to haulier

---

**Q6. What happens to any cargo or goods if the driver cancels mid-route on a day?**

This is an operational emergency. The platform escalates immediately (see Section C — Escalation). The haulier is notified via push, SMS, and email with the driver's last known GPS location from the tracking module. The haulier is responsible for arranging recovery of goods. The platform's role is notification and documentation only — liability for goods is governed by the haulier's freight insurance.

---

### SECTION B — Haulier Cancellation

---

**Q7. The haulier cancels mid-shift. Does the driver get any compensation?**

Yes. The driver keeps all payments for days already completed. Additionally, if the haulier cancels after Day 1 has started, a haulier-side cancellation notice period applies:

| Notice Given by Haulier | Driver Compensation |
|------------------------|---------------------|
| > 48 hours before next day | No additional compensation |
| 24–48 hours | 50% of next day's rate as compensation |
| < 24 hours | 100% of next day's rate as compensation |

Compensation is paid from the haulier's escrow before the remainder is refunded.

---

**Q8. Can the haulier cancel after accepting a quote but before Day 1 starts?**

Yes. Full escrow is refunded to the haulier. The driver receives no payment since no work was done. However, if the cancellation is within 24 hours of the scheduled start date, the driver receives a cancellation compensation of 50% of one day's rate.

---

**Q9. What if the haulier refuses to mark a day as complete even though the driver worked?**

The driver can raise a **day completion dispute** from the mobile app. This opens an escalation ticket (see Section C). During a dispute:
- The day's payment is held in escrow — not released to driver, not refunded to haulier
- Platform admin reviews evidence (GPS tracking data, check-in timestamps, any uploaded proof)
- Admin makes the final ruling within 48 hours
- If ruled in driver's favour: payment released to driver
- If ruled in haulier's favour: payment returned to haulier's escrow

---

### SECTION C — Escalations & Dispute Resolution

---

**Q10. What types of issues can be escalated?**

| Issue Type | Who Can Raise | Priority |
|-----------|--------------|----------|
| Driver no-show | Haulier | High |
| Day completion disputed | Driver | Medium |
| Payment not received | Driver | High |
| Cargo abandoned mid-route | Haulier | Critical |
| Driver behaviour complaint | Haulier | Medium |
| Haulier non-payment or fraud | Driver | High |
| Incorrect cancellation penalty applied | Driver | Medium |
| Shift details misrepresented | Driver | Medium |

---

**Q11. How does the escalation process work step by step?**

```
Step 1 — Raise a ticket
  Either party raises a dispute from the app (Shift → Report Issue).
  They select the issue type, describe the problem, and attach evidence
  (photos, screenshots, GPS data).

Step 2 — Automatic hold
  If money is involved, the relevant payment is frozen immediately.
  Neither party can withdraw disputed funds during review.

Step 3 — Notification
  Both parties are notified that an escalation is open.
  The other party has 24 hours to submit their response.

Step 4 — Platform admin review
  Admin reviews both sides, GPS tracking history, sign-off logs,
  and any uploaded evidence.
  Target resolution time: 48 hours from ticket creation.

Step 5 — Decision
  Admin rules in favour of one party (or splits if warranted).
  Decision is final and executed automatically (payment released/refunded).
  Both parties are notified with the outcome and reasoning.

Step 6 — Appeal (optional)
  Either party can appeal within 72 hours of the decision.
  Appeals are reviewed by a senior admin.
  Appeal decision is final.
```

---

**Q12. What evidence does the platform use to resolve disputes?**

| Evidence Type | Source | Used For |
|--------------|--------|----------|
| GPS tracking history | Tracking module (tracking_points table) | Proving driver was on site |
| Check-in / check-out timestamps | Compliance module | Proving hours worked |
| Day sign-off logs | shift_day_payments table | Proving haulier acknowledged work |
| Photo proof of delivery | Compliance / delivery module | Cargo condition |
| In-app messages | Support ticket thread | Communications record |
| Driver rating history | Ratings module | Pattern of behaviour |
| Cancellation timestamps | shifts.updated_at | Late cancellation verification |

---

**Q13. What happens if a driver abandons cargo mid-route and the haulier incurs losses?**

The platform is not liable for goods in transit — this is covered by the haulier's freight insurance. However, the platform will:

1. Provide a full GPS tracking export for the incident (last known location, route history)
2. Open a critical escalation ticket immediately
3. Apply the maximum driver penalty (100% of day rate)
4. Flag the driver's account for review — repeated incidents result in permanent suspension
5. Provide a signed incident report PDF for insurance claim purposes

---

**Q14. What if the driver claims they were not paid for a completed day?**

The driver can raise a **Payment Dispute** from the app. The platform checks:

1. Was the day marked complete by the haulier? (shift.days_completed)
2. Was a `shift_day_payments` record created?
3. Did the payment gateway confirm the transfer?

If the payment was processed correctly but not received in the driver's bank, the issue is with the payment gateway. The platform opens a payment gateway dispute on the driver's behalf. Target resolution: 3–5 business days.

If the day was marked complete but payment was not triggered (system error), the platform manually releases the payment and logs a bug report.

---

**Q15. Can a dispute result in a driver being banned from the platform?**

Yes. Escalation outcomes can include account actions:

| Severity | Action |
|----------|--------|
| First no-show or late cancellation | Warning + reliability flag |
| Second incident within 30 days | 7-day suspension from new shifts |
| Third incident or cargo abandonment | Permanent suspension, pending appeal |
| Fraud (false dispute, fake GPS) | Immediate permanent ban, legal referral |

Hauliers are held to the same standards — repeated bad-faith dispute filings or refusal to pay result in account suspension.

---

**Q16. What if both the haulier and driver agree to cancel the shift without penalty?**

A **mutual cancellation** can be initiated by either party. If the other party agrees within 24 hours:
- No penalties applied to either side
- Driver keeps all payments for completed days
- Haulier receives full escrow refund for remaining days
- Shift status set to `CANCELLED` with reason `MUTUAL_AGREEMENT`

If the other party does not respond within 24 hours, the standard cancellation policy applies.

---

**Q17. What happens to the shift data after it is cancelled or completed?**

All shift data is permanently retained for audit and legal purposes. Cancelled and completed shifts remain visible in the haulier's and driver's history dashboards. Payment records, GPS logs, sign-off timestamps, and escalation tickets are stored indefinitely. Drivers and hauliers can request an export of their shift history at any time.

---

**Q18. Can the haulier re-post remaining days after a driver cancels?**

Yes. The haulier can create a new shift for the remaining days immediately after cancellation. The system pre-fills the form with the original shift's details (requirement type, location, hours per day, rate) to speed up re-posting. The new shift gets a fresh `SH-` reference number and enters the `OPEN` state for new driver quotes.

---

**Q19. Is there a minimum shift length or maximum shift length?**

| Constraint | Value | Reason |
|-----------|-------|--------|
| Minimum shift | 1 day | Single-day engagements are valid |
| Maximum shift | 90 days | Prevents indefinite open-ended bookings |
| Minimum hours per day | 4 hours | Below this is not a meaningful shift |
| Maximum hours per day | 14 hours | Legal driving hour limits |

---

**Q20. What if there is a dispute about the hours actually worked on a given day?**

Hours worked are validated against the driver's check-in and check-out timestamps from the compliance module. If a driver checks in at 08:00 and checks out at 14:00, the system records 6 hours. If the shift required 8 hours, the haulier can:

1. Accept the day as complete (sign off despite short hours)
2. Not sign off and request the driver to complete the remaining hours
3. Raise an escalation if the driver refuses and demands payment

Partial-day payment (e.g. 6 of 8 hours = 75% of daily rate) can be agreed between parties and is supported by the platform as a custom settlement in the escalation process.

---

*FlexiShift Shift Module — Prepared 19 May 2026*
