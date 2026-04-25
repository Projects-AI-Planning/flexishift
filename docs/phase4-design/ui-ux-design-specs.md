# UI/UX Design Specs – FreightFlex

## 1. Document Information
| Field | Detail |
|---|---|
| Project | FreightFlex |
| Document | UI/UX Design Specifications (Wireframes & Mockups) |
| Version | 1.0 |
| Date | 2026-04-25 |
| Author | UI/UX Designer |

## 2. Design Principles
1. **Clarity over cleverness** – Truck drivers and logistics managers need task-completion, not visual novelty.
2. **Mobile-first for Driver** – Every driver screen must be operable with one thumb on a 5-inch screen.
3. **Data density for Haulier** – Dashboard should show maximum useful information without scrolling.
4. **Step clarity for compliance** – Progress indicators on every multi-step flow. User always knows where they are.
5. **Trust signals** – Verification badges, star ratings, and payment-secured indicators are prominent.

## 3. Design System

### 3.1 Colour Palette
| Token | Hex | Usage |
|---|---|---|
| `color-primary` | `#1D4ED8` | CTAs, links, active states |
| `color-primary-dark` | `#1E3A8A` | Hover states |
| `color-success` | `#16A34A` | Verified badge, payment secured, completed status |
| `color-warning` | `#D97706` | Pending, delay alert, awaiting signature |
| `color-danger` | `#DC2626` | Errors, rejected, disputed status |
| `color-neutral-900` | `#111827` | Body text |
| `color-neutral-500` | `#6B7280` | Secondary text, placeholders |
| `color-neutral-100` | `#F3F4F6` | Page backgrounds |
| `color-white` | `#FFFFFF` | Card backgrounds |

### 3.2 Typography
| Style | Font | Size | Weight | Usage |
|---|---|---|---|---|
| H1 | Inter | 32px / 2rem | 700 | Page titles |
| H2 | Inter | 24px / 1.5rem | 600 | Section headings |
| H3 | Inter | 18px / 1.125rem | 600 | Card headings |
| Body | Inter | 16px / 1rem | 400 | General text |
| Small | Inter | 14px / 0.875rem | 400 | Labels, metadata |
| Micro | Inter | 12px / 0.75rem | 400 | Badges, timestamps |

### 3.3 Spacing Scale
4px base unit: 4, 8, 12, 16, 24, 32, 48, 64px

### 3.4 Component Library (Core)
| Component | Variants |
|---|---|
| Button | Primary, Secondary, Danger, Ghost; Sizes: SM, MD, LG |
| Input | Text, Email, Password, Number, Textarea, File upload |
| Select | Single, Multi |
| Badge | Success, Warning, Danger, Neutral |
| Card | Default, Highlighted (selected quote) |
| Modal | Small, Medium, Full-screen (mobile) |
| Toast | Success, Error, Warning, Info |
| Step indicator | Horizontal (web), Vertical (mobile) |
| Map widget | Google Maps embed with custom truck marker |
| Star rating | Interactive (input), Read-only (display) |
| Avatar | With verification badge overlay |

---

## 4. Screen Inventory & Wireframe Specs

### 4.1 Shared Screens (All Roles)

#### SCR-001: Registration
```
Layout: Single-column, centred card (max-width 480px)
Fields:
  - Full Name (text)
  - Email (email)
  - Phone (tel)
  - Password (password, show/hide toggle)
  - Confirm Password
  - Role selector: [Driver] [Haulier] [Firm] — segmented control
  - Submit CTA: "Create Account" (full-width Primary)
  - Login link: "Already registered? Log in"
Validation: Inline, on-blur
Success state: "Check your email" banner with email address shown
```

#### SCR-002: Email Verification
```
Full-screen message: Envelope icon + "Verify your email"
Body: "We've sent a link to [email]. Click it to activate your account."
Action: "Resend email" link (disabled for 60s after send)
Auto-redirect to dashboard if token verified in same browser
```

#### SCR-003: Login
```
Layout: Single-column centred card (max-width 480px)
Fields:
  - Email
  - Password (show/hide)
  - "Forgot password?" link (right-aligned under password field)
  - Submit CTA: "Sign In" (full-width Primary)
  - Register link: "New to FreightFlex? Create an account"
Error: Toast + red border on fields for wrong credentials
```

#### SCR-004: Forgot / Reset Password
```
Step 1 – Request: Email field + "Send Reset Link" CTA
Step 2 – Confirmation: "Reset link sent to [email]"
Step 3 – New Password form (opened from email link):
  - New Password + Confirm New Password
  - Submit CTA: "Reset Password"
  - On success → redirect to login with success toast
```

---

### 4.2 Driver Screens (Mobile – React Native)

#### SCR-D01: Driver Profile Setup
```
Progress bar: Step 1 of 3 (Profile → Documents → Availability)
Fields:
  - Photo upload (avatar circle with camera icon)
  - Full Name (pre-filled from registration)
  - Driving Licence Number
  - Vehicle Type (dropdown: HGV, LGV, Van, Flatbed, Tanker, Refrigerated)
  - Vehicle Registration Number
CTA: "Save & Continue" → Documents
```

#### SCR-D02: Document Upload (Driver)
```
Progress bar: Step 2 of 3
Three upload cards, each with:
  - Document name + icon
  - Status badge: Not Uploaded / Pending / Approved / Rejected
  - "Upload" button → opens device file picker (PDF/JPG/PNG, max 10MB)
  - If Rejected: red card + rejection reason + "Re-upload" button
CTA: "Submit for Verification" (enabled when all 3 uploaded)
Info text: "Verification usually takes 1 business day."
```

#### SCR-D03: Availability Setup
```
Progress bar: Step 3 of 3
Day toggles: Mon Tue Wed Thu Fri Sat Sun (toggle chips)
For each active day: time range picker (start time – end time)
"Block a date range" section: date picker for From / To
CTA: "Save Availability" → Driver Dashboard
```

#### SCR-D04: Driver Dashboard (Home)
```
Header: Avatar + "Hi, [Name]" + notification bell
Active Job Card (if exists):
  - Job Ref + status badge (IN_TRANSIT / PAYMENT_SECURED)
  - Pickup → Drop (truncated addresses)
  - Quick action buttons: [Navigate] [Update Status] [Upload Proof]
Upcoming Jobs section: scrollable list of booked jobs
Earnings Summary: "This week: £XXX | This month: £XXX"
Bottom nav: Home | Jobs | Earnings | Profile
```

#### SCR-D05: Job List (Browse Open Jobs)
```
Filter bar: Vehicle type | Date | Distance radius
Job card (per job):
  - Job Ref + posted time
  - Pickup city → Drop city + distance
  - Vehicle type badge + goods type
  - "View & Quote" CTA
Pull-to-refresh
```

#### SCR-D06: Job Detail & Quote Submission
```
Full job details:
  - Map snippet showing route
  - Pickup + drop full address
  - Goods type, weight, date, time slot
  - Distance + estimated duration
Quote section (bottom sheet):
  - Price input (number, currency symbol prefix)
  - "Submit Quote" CTA
  - If already quoted: show current quote + "Edit Quote" option
```

#### SCR-D07: Compliance – Step 1 (Load Code)
```
Header: "Step 1 of 3 – Load Confirmation"
Progress bar: 1/3
Instruction: "Enter the load code shown in your job details."
Load code input: large text field, monospace font, uppercase auto
[Confirm Code] button
Error state: red input border + "Code does not match. Check and try again."
```

#### SCR-D08: Compliance – Step 2 (Handover Check)
```
Header: "Step 2 of 3 – Vehicle Handover"
Checklist (toggle items):
  - Tyres inflated ✓
  - Lights working ✓
  - Body no new damage ✓
  - Cargo secured ✓
  - Documents present ✓
Photo upload: "Add condition photos (min 1)" — grid of thumbnails
Signature pad: "Your signature" — canvas component
[Submit & Request Haulier Signature] CTA
After driver signs: "Waiting for haulier to sign..." state + animated indicator
```

#### SCR-D09: Compliance – Step 3 (Delivery Report)
```
Header: "Step 3 of 3 – Delivery Report"
Progress bar: 3/3
Photo upload: "Delivery photo" (required)
Signature pad: "Recipient signature" (required)
Notes: optional textarea
[Submit Delivery Report] CTA → success screen → await haulier approval
```

#### SCR-D10: Earnings & Job History
```
Tabs: This Week | This Month | All Time
Summary card: Total earned | Jobs completed | Avg rating
Job history list: job ref + date + amount + status badge
Tap job → Job Detail (read-only)
```

---

### 4.3 Haulier Screens (Web)

#### SCR-H01: Haulier Profile Setup
```
Two-column layout (desktop), single-column (mobile)
Fields: Company Name, Registered Address, Contact Number, Contact Email
Profile photo upload (optional for company)
CTA: "Save Profile" → Haulier Dashboard
```

#### SCR-H02: Post a Job
```
Multi-step form with horizontal step indicator:
Step 1 – Locations:
  - Pickup address (Google Places Autocomplete)
  - Drop address (Google Places Autocomplete)
  - After validation: route map preview + distance + duration shown
Step 2 – Cargo Details:
  - Goods type (text)
  - Weight (kg)
  - Vehicle type required (dropdown)
Step 3 – Schedule:
  - Job date (date picker, future dates only)
  - Time slot (dropdown: Morning 06–12, Afternoon 12–17, Evening 17–22, Full Day)
Step 4 – Review & Post:
  - Summary of all details
  - [Post Job] CTA → success toast with job ref
```

#### SCR-H03: Supplier Matching Results
```
Left panel: Job summary card (ref, route, date)
Right panel: Matched supplier list
  Per supplier card:
    - Avatar + verification badge
    - Name + vehicle type + registration
    - Star rating (display) + completed jobs count
    - Distance from pickup
    - If quote submitted: price badge
  Filter bar: Sort by (Distance | Rating | Price)
[Select Supplier] CTA on each card (only shown if quote exists)
```

#### SCR-H04: Quote Comparison & Booking
```
Job details header
Quote table:
  Columns: Supplier | Vehicle | Rating | Price | Action
  [Select & Book] button per row
Confirmation modal:
  "Confirm booking with [Name] for £XXX?"
  [Cancel] [Confirm Booking]
Post-confirm → Payment screen (SCR-H05)
```

#### SCR-H05: Escrow Payment
```
Order summary card:
  - Job ref + route
  - Supplier name
  - Agreed price + VAT/GST + Total
Payment method tabs: [UPI] [Card] [Bank Transfer]
Payment form (varies by method)
[Pay & Secure Funds] CTA
Success state: "Payment secured. Supplier has been notified."
```

#### SCR-H06: Haulier Dashboard
```
Top stats row: [Active Jobs] [Awaiting Approval] [This Month Spend]
Active Jobs table:
  Columns: Job Ref | Route | Supplier | Status | Actions
  Status badges: BOOKED / PAYMENT_SECURED / IN_TRANSIT / DELIVERY_SUBMITTED
  Actions: [Track] [View] [Approve]
Live Map widget (right side / below on mobile): all IN_TRANSIT deliveries
[Post New Job] button (top right, always visible)
```

#### SCR-H07: Live Tracking View
```
Full-screen map
Truck marker with animated pulse
Route polyline (blue)
Origin pin (green) + Destination pin (red)
Info panel (bottom sheet / sidebar):
  - Driver name + vehicle
  - Current ETA
  - Last updated timestamp
  - Delay alert banner (if applicable): "Running ~45 min late"
```

#### SCR-H08: Delivery Approval
```
Delivery report review:
  - Delivery photo (full-width preview)
  - Recipient signature image
  - Driver notes
  - Timestamp
Action buttons: [Approve Delivery] [Raise Dispute]
Approve modal: "Confirm delivery and release payment to [Supplier]?"
Dispute modal: text area for dispute reason + [Submit Dispute]
```

#### SCR-H09: Invoice Download
```
Invoice preview (HTML / PDF embed)
[Download PDF] button
Invoice fields shown: Job Ref, Haulier, Supplier, Job Date, Agreed Price, Tax, Total
```

---

### 4.4 Admin Screens (Web)

#### SCR-A01: Admin Dashboard
```
KPI cards row: Total Users | Active Jobs | Revenue (MTD) | Pending Verifications
Pending Verifications table:
  Columns: Supplier Name | Role | Documents | Submitted | Action
  Per row: [View Documents] [Approve] [Reject]
Jobs Monitor table (filterable by status)
Recent activity feed (right panel)
```

#### SCR-A02: User Management
```
Search bar + filter: Role | Status
User table:
  Columns: Name | Email | Role | Status | Verified | Joined | Actions
  Actions: [View] [Verify] [Suspend] [Reinstate]
User detail modal:
  - Profile info
  - Document history
  - Job history
  - Rating summary
  - Action buttons: Suspend / Reinstate
```

---

## 5. Responsive Breakpoints
| Breakpoint | Min Width | Layout |
|---|---|---|
| Mobile | 0px | Single column, bottom nav |
| Tablet | 768px | Two columns, side nav collapses |
| Desktop | 1280px | Full sidebar nav, multi-column layouts |

## 6. Accessibility Requirements
- All interactive elements have `aria-label` or visible text labels.
- Colour is not the sole means of conveying status (icon + text always paired with colour).
- Focus states visible for all keyboard-navigable elements.
- Minimum contrast ratio 4.5:1 (WCAG 2.1 AA) for all text.
- Map widget has text-based ETA alternative for screen readers.

## 7. Figma Deliverables
| Deliverable | Status |
|---|---|
| Design system / component library | To be created in Figma |
| Wireframes (all screens above) | To be created in Figma |
| High-fidelity mockups (all screens) | To be created in Figma |
| Prototype (happy-path flows) | To be created in Figma |
| Developer handoff (with inspect panel) | To be created in Figma |
