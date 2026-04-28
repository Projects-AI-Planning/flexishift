# FreightFlex – Admin & Haulier API Requests

---

## HAULIER APIs – Web Dashboard

---

### EPIC 1: Auth & Profile

---

### API 1 – Register (Haulier)

```
POST /api/v1/auth/register
Content-Type: application/json
```

**Request:**
```json
{
  "name": "FastMove Logistics",
  "email": "fastmove@example.com",
  "phone": "9812345670",
  "password": "Haulier@1234",
  "role": "haulier"
}
```

---

### API 2 – Verify Email (Haulier)

```
POST /api/v1/auth/verify-email
Content-Type: application/json
```

**Request:**
```json
{
  "email": "fastmove@example.com",
  "otp": "739201"
}
```

---

### API 3 – Resend Verification OTP (Haulier)

```
POST /api/v1/auth/resend-verification
Content-Type: application/json
```

**Request:**
```json
{
  "email": "fastmove@example.com"
}
```

---

### API 4 – Login (Haulier)

```
POST /api/v1/auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "email": "fastmove@example.com",
  "password": "Haulier@1234"
}
```

---

### API 5 – Logout (Haulier)

```
POST /api/v1/auth/logout
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

---

### API 6 – Refresh Token (Haulier)

```
POST /api/v1/auth/refresh-token
Content-Type: application/json
```

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

---

### API 7 – Forgot Password (Haulier)

```
POST /api/v1/auth/forgot-password
Content-Type: application/json
```

**Request:**
```json
{
  "email": "fastmove@example.com"
}
```

---

### API 8 – Reset Password (Haulier)

```
POST /api/v1/auth/reset-password
Content-Type: application/json
```

**Request:**
```json
{
  "resetToken": "haulier_reset_token_abc123xyz",
  "newPassword": "NewHaulier@5678",
  "confirmPassword": "NewHaulier@5678"
}
```

---

### API 9 – Change Password (Haulier)

```
PUT /api/v1/auth/change-password
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "currentPassword": "Haulier@1234",
  "newPassword": "NewHaulier@5678",
  "confirmPassword": "NewHaulier@5678"
}
```

---

### API 10 – Profile Setup (Haulier)

```
POST /api/v1/profile/setup
Authorization: Bearer <haulier-token>
Content-Type: multipart/form-data
```

**Request:**
```json
{
  "companyName": "FastMove Logistics Pvt Ltd",
  "address": "123 Industrial Area, Andheri East, Mumbai - 400069",
  "contactNumber": "9812345670",
  "gstNumber": "27AAPFU0939F1ZV",
  "companyRegistrationNumber": "CIN-U63090MH2020PTC123456",
  "logo": "<image file>"
}
```

---

### API 11 – Update Profile (Haulier)

```
PUT /api/v1/profile/update
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "address": "456 New Industrial Zone, Powai, Mumbai - 400076",
  "contactNumber": "9812345671",
  "gstNumber": "27AAPFU0939F1ZV"
}
```

---

### API 12 – Get Own Profile (Haulier)

```
GET /api/v1/profile/me
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 13 – Upload Company Logo (Haulier)

```
POST /api/v1/profile/photo/upload
Authorization: Bearer <haulier-token>
Content-Type: multipart/form-data
```

**Request:**
```
photo: <company logo image file>
```

---

### API 14 – Deactivate Account (Haulier)

```
PUT /api/v1/profile/deactivate
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "password": "Haulier@1234",
  "reason": "Switching to another platform"
}
```

---

### EPIC 2: Supplier Availability View

---

### API 15 – View Supplier Availability (Haulier)

```
GET /api/v1/supplier/availability/usr_01J8K2X9P
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### EPIC 3: Job Posting & Matching

---

### API 16 – Create Job (Haulier)

```
POST /api/v1/jobs/create
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "pickupLocation": {
    "address": "Sector 18, Noida, Uttar Pradesh - 201301",
    "latitude": 28.5707,
    "longitude": 77.3219
  },
  "dropLocation": {
    "address": "Connaught Place, New Delhi - 110001",
    "latitude": 28.6315,
    "longitude": 77.2167
  },
  "goodsType": "Electronics",
  "weight": 500,
  "weightUnit": "kg",
  "vehicleTypeRequired": "truck",
  "jobDate": "2024-01-20",
  "timeSlot": {
    "startTime": "09:00",
    "endTime": "12:00"
  },
  "specialInstructions": "Handle with care. Fragile items."
}
```

---

### API 17 – Get Job Details (Haulier)

```
GET /api/v1/jobs/job_4R8M2K9X
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 18 – List All Jobs (Haulier)

```
GET /api/v1/jobs/list?page=1&limit=10&status=open&vehicleType=truck
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 19 – My Posted Jobs (Haulier)

```
GET /api/v1/jobs/my-jobs?page=1&limit=10&status=open
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 20 – Update Job (Haulier)

```
PUT /api/v1/jobs/update/job_4R8M2K9X
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobDate": "2024-01-22",
  "timeSlot": {
    "startTime": "10:00",
    "endTime": "13:00"
  },
  "specialInstructions": "Fragile items. Extra packaging required.",
  "weight": 480,
  "weightUnit": "kg"
}
```

---

### API 21 – Cancel Job (Haulier)

```
PUT /api/v1/jobs/cancel/job_4R8M2K9X
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "reason": "Goods shipment postponed due to supplier delay"
}
```

---

### API 22 – Close Job to New Quotes (Haulier)

```
PUT /api/v1/jobs/close/job_4R8M2K9X
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "reason": "Sufficient quotes received. Reviewing now."
}
```

---

### API 23 – Validate Address (Haulier)

```
POST /api/v1/maps/validate-address
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "address": "Sector 18, Noida, Uttar Pradesh"
}
```

---

### API 24 – Calculate Route (Haulier)

```
POST /api/v1/maps/calculate-route
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "origin": {
    "latitude": 28.5707,
    "longitude": 77.3219
  },
  "destination": {
    "latitude": 28.6315,
    "longitude": 77.2167
  }
}
```

---

### API 25 – Address Autocomplete (Haulier)

```
GET /api/v1/maps/autocomplete?query=Sector 18 Noi
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 26 – Match Suppliers for Job (Haulier)

```
GET /api/v1/jobs/match-suppliers/job_4R8M2K9X
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 27 – List All Quotes for Job (Haulier)

```
GET /api/v1/quotes/list/job_4R8M2K9X?page=1&limit=10&sortBy=amount&order=asc
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 28 – Get Single Quote (Haulier)

```
GET /api/v1/quotes/qte_2K9P7M3L
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### EPIC 4: Booking & Payment

---

### API 29 – Create Booking (Haulier)

```
POST /api/v1/bookings/create
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobId": "job_4R8M2K9X",
  "quoteId": "qte_2K9P7M3L",
  "supplierId": "usr_01J8K2X9P"
}
```

---

### API 30 – Get Booking Details (Haulier)

```
GET /api/v1/bookings/bkg_7X3K9P2M
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 31 – List All Bookings (Haulier)

```
GET /api/v1/bookings/list?page=1&limit=10&status=booked
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 32 – Cancel Booking (Haulier)

```
PUT /api/v1/bookings/cancel/bkg_7X3K9P2M
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "reason": "Change in delivery schedule due to customer request"
}
```

---

### API 33 – Initiate Payment (Haulier)

```
POST /api/v1/payments/initiate
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "bookingId": "bkg_7X3K9P2M",
  "amount": 3200,
  "currency": "INR",
  "paymentMethod": "upi",
  "paymentMethodId": "pm_UPI_9K2X3M7L"
}
```

---

### API 34 – Check Payment Status (Haulier)

```
GET /api/v1/payments/status/pay_5M8K3X9P
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 35 – Release Payment (Haulier)

```
POST /api/v1/payments/release/bkg_7X3K9P2M
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "approvalNote": "Delivery received in perfect condition. All items intact."
}
```

---

### API 36 – Payment History (Haulier)

```
GET /api/v1/payments/history?page=1&limit=10&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 37 – Add Payment Method (Haulier)

```
POST /api/v1/payments/methods/add
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request (UPI):**
```json
{
  "type": "upi",
  "upiId": "fastmove@okaxis",
  "isDefault": true
}
```

**Request (Card):**
```json
{
  "type": "card",
  "cardToken": "tok_visa_card_9K2X3M",
  "cardLast4": "4242",
  "cardBrand": "visa",
  "expiryMonth": "12",
  "expiryYear": "2027",
  "isDefault": false
}
```

**Request (Bank Transfer):**
```json
{
  "type": "bank_transfer",
  "accountHolderName": "FastMove Logistics Pvt Ltd",
  "accountNumber": "1234567890",
  "ifscCode": "HDFC0001234",
  "bankName": "HDFC Bank",
  "isDefault": false
}
```

---

### API 38 – List Payment Methods (Haulier)

```
GET /api/v1/payments/methods/list
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 39 – Delete Payment Method (Haulier)

```
DELETE /api/v1/payments/methods/delete/pm_CARD_3M7K9X2P
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 40 – Get Invoice Details (Haulier)

```
GET /api/v1/invoices/inv_3K9M2X7P
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 41 – List Invoices (Haulier)

```
GET /api/v1/invoices/list?page=1&limit=10&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 42 – Download Invoice PDF (Haulier)

```
GET /api/v1/invoices/download/inv_3K9M2X7P
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### EPIC 5: Compliance Workflow

---

### API 43 – Get Load Code Status (Haulier)

```
GET /api/v1/compliance/load-code/status/job_4R8M2K9X
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 44 – Resend Load Code to Driver (Haulier)

```
POST /api/v1/compliance/load-code/resend
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobId": "job_4R8M2K9X",
  "bookingId": "bkg_7X3K9P2M"
}
```

---

### API 45 – View Handover Photos (Haulier)

```
GET /api/v1/compliance/handover/photos/list/job_4R8M2K9X
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 46 – Haulier Digital Signature (Haulier)

```
POST /api/v1/compliance/handover/sign/haulier
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobId": "job_4R8M2K9X",
  "bookingId": "bkg_7X3K9P2M",
  "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "acknowledgement": "I confirm the vehicle handover and condition as documented."
}
```

---

### API 47 – Get Handover Status (Haulier)

```
GET /api/v1/compliance/handover/status/job_4R8M2K9X
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 48 – Approve Delivery (Haulier)

```
POST /api/v1/compliance/delivery/approve/job_4R8M2K9X
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "bookingId": "bkg_7X3K9P2M",
  "approvalNote": "Goods received in perfect condition. Delivery confirmed."
}
```

---

### API 49 – Dispute Delivery (Haulier)

```
POST /api/v1/compliance/delivery/dispute/job_4R8M2K9X
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "bookingId": "bkg_7X3K9P2M",
  "disputeReason": "goods_damaged",
  "description": "Three boxes were damaged. Items broken inside packaging.",
  "evidencePhotos": [
    "https://cdn.freightflex.com/dispute/ph_EV9K2M3X.jpg",
    "https://cdn.freightflex.com/dispute/ph_EV3M7K9X.jpg"
  ]
}
```

---

### API 50 – Get Delivery Status (Haulier)

```
GET /api/v1/compliance/delivery/status/job_4R8M2K9X
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 51 – Get Full Compliance Status (Haulier)

```
GET /api/v1/compliance/full-status/job_4R8M2K9X
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### EPIC 6: Live Tracking & ETA

---

### API 52 – Get Live Driver Location (Haulier)

```
GET /api/v1/tracking/live/job_4R8M2K9X
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 53 – Get Tracking History (Haulier)

```
GET /api/v1/tracking/history/job_4R8M2K9X?page=1&limit=50
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 54 – Get ETA (Haulier)

```
GET /api/v1/tracking/eta/job_4R8M2K9X
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### EPIC 7: Haulier Dashboard

---

### API 55 – Haulier Dashboard Overview

```
GET /api/v1/dashboard/haulier/overview
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 56 – Active Jobs with Live Status

```
GET /api/v1/dashboard/haulier/jobs/active?page=1&limit=10
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 57 – Jobs Pending Approval

```
GET /api/v1/dashboard/haulier/jobs/pending-approval?page=1&limit=10
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 58 – Spend Summary (Haulier)

```
GET /api/v1/dashboard/haulier/spend-summary?period=monthly&month=01&year=2024
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 59 – Active Map Data (Haulier)

```
GET /api/v1/dashboard/haulier/active-map
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### EPIC 8: Ratings

---

### API 60 – Submit Rating (Haulier rates Driver)

```
POST /api/v1/ratings/submit
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobId": "job_4R8M2K9X",
  "bookingId": "bkg_7X3K9P2M",
  "ratedUserId": "usr_01J8K2X9P",
  "starRating": 5,
  "review": "Excellent driver. Very punctual and professional. Goods delivered safely.",
  "tags": [
    "on_time",
    "professional",
    "careful_with_goods",
    "good_communication"
  ]
}
```

---

### API 61 – View Driver Ratings (Haulier)

```
GET /api/v1/ratings/user/usr_01J8K2X9P?page=1&limit=10&sortBy=latest
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 62 – Get Job Ratings (Haulier)

```
GET /api/v1/ratings/job/job_4R8M2K9X
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 63 – Driver Rating Summary (Haulier)

```
GET /api/v1/ratings/summary/usr_01J8K2X9P
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 64 – Report Abusive Review (Haulier)

```
POST /api/v1/ratings/report/rat_3K9M7X2P
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "reportReason": "false_information",
  "description": "This review contains completely false information about the delivery."
}
```

---

### Notifications (Haulier)

---

### API 65 – Get All Notifications (Haulier)

```
GET /api/v1/notifications/list?page=1&limit=20&type=job_update
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 66 – Unread Count (Haulier)

```
GET /api/v1/notifications/unread-count
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 67 – Mark Single Notification Read (Haulier)

```
PUT /api/v1/notifications/mark-read/ntf_7K2M9X3P
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 68 – Mark All Notifications Read (Haulier)

```
PUT /api/v1/notifications/mark-all-read
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 69 – Delete Notification (Haulier)

```
DELETE /api/v1/notifications/delete/ntf_7K2M9X3P
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 70 – Get Notification Preferences (Haulier)

```
GET /api/v1/notifications/preferences
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 71 – Update Notification Preferences (Haulier)

```
PUT /api/v1/notifications/preferences/update
Authorization: Bearer <haulier-token>
Content-Type: application/json
```

**Request:**
```json
{
  "pushNotifications": {
    "enabled": true,
    "job_updates": true,
    "payment_updates": true,
    "compliance_alerts": true,
    "new_job_matches": true,
    "system_alerts": false
  },
  "emailNotifications": {
    "enabled": true,
    "job_updates": true,
    "payment_updates": true,
    "invoices": true,
    "marketing": false
  },
  "smsNotifications": {
    "enabled": true,
    "job_updates": true,
    "payment_updates": true
  }
}
```

---

### File Management (Haulier)

---

### API 72 – Upload File (Haulier)

```
POST /api/v1/files/upload
Authorization: Bearer <haulier-token>
Content-Type: multipart/form-data
```

**Request:**
```
file: <file>
fileType: "document"
folder: "haulier_docs"
```

---

### API 73 – Delete File (Haulier)

```
DELETE /api/v1/files/delete/fil_9K3M7X2P
Authorization: Bearer <haulier-token>
```

**Request:** No body

---

### API 74 – Get Signed File URL (Haulier)

```
GET /api/v1/files/get/fil_9K3M7X2P
Authorization: Bearer <haulier-token>
```

**Request:** No body

---
---

## ADMIN APIs – Admin Panel

---

### EPIC 1: Auth & Profile

---

### API 75 – Admin Login

```
POST /api/v1/auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "email": "admin@freightflex.com",
  "password": "Admin@Secure9876"
}
```

---

### API 76 – Admin Logout

```
POST /api/v1/auth/logout
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "refreshToken": "YWRtaW5fcmVmcmVzaF90b2tlbl9oZXJl..."
}
```

---

### API 77 – Admin Refresh Token

```
POST /api/v1/auth/refresh-token
Content-Type: application/json
```

**Request:**
```json
{
  "refreshToken": "YWRtaW5fcmVmcmVzaF90b2tlbl9oZXJl..."
}
```

---

### API 78 – Admin Change Password

```
PUT /api/v1/auth/change-password
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "currentPassword": "Admin@Secure9876",
  "newPassword": "Admin@NewSecure2024",
  "confirmPassword": "Admin@NewSecure2024"
}
```

---

### API 79 – Admin Get Own Profile

```
GET /api/v1/profile/me
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 80 – Admin Update Profile

```
PUT /api/v1/profile/update
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Super Admin",
  "phone": "9900112233"
}
```

---

### API 81 – Admin View Any User Profile

```
GET /api/v1/profile/usr_01J8K2X9P
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### EPIC 2: Supplier Document Verification

---

### API 82 – List Pending Documents (Admin)

```
GET /api/v1/admin/documents/pending?page=1&limit=10&documentType=driving_license
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 83 – Approve Document (Admin)

```
PUT /api/v1/admin/documents/approve/doc_3M7N5Q2R
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "remarks": "Document is clear and valid. Approved successfully."
}
```

---

### API 84 – Reject Document (Admin)

```
PUT /api/v1/admin/documents/reject/doc_3M7N5Q2R
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "rejectionReason": "Document image is blurry and unreadable. Please re-upload a clear copy."
}
```

---

### EPIC 4: Payment & Invoices

---

### API 85 – Process Refund (Admin)

```
POST /api/v1/payments/refund/bkg_7X3K9P2M
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "refundAmount": 3200,
  "reason": "Job cancelled before trip started. Full refund approved.",
  "refundTo": "original_payment_method"
}
```

---

### API 86 – View Payment History (Admin)

```
GET /api/v1/payments/history?page=1&limit=10&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 87 – View Invoice Details (Admin)

```
GET /api/v1/invoices/inv_3K9M2X7P
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 88 – List All Invoices (Admin)

```
GET /api/v1/invoices/list?page=1&limit=10
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### EPIC 5: Compliance & Disputes

---

### API 89 – Get Full Compliance Status (Admin)

```
GET /api/v1/compliance/full-status/job_4R8M2K9X
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 90 – List All Disputes (Admin)

```
GET /api/v1/compliance/dispute/list?page=1&limit=10&status=under_review
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 91 – Resolve Dispute (Admin)

```
PUT /api/v1/compliance/dispute/resolve/dsp_2K9X7M3P
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "resolution": "partial_refund",
  "refundAmount": 800,
  "releaseAmount": 2400,
  "adminNote": "Evidence reviewed. Partial damage confirmed on 2 boxes. Partial refund approved to haulier.",
  "notifyBothParties": true
}
```

**Request (Full Refund):**
```json
{
  "resolution": "full_refund",
  "refundAmount": 3200,
  "releaseAmount": 0,
  "adminNote": "Severe damage confirmed. Full refund approved to haulier.",
  "notifyBothParties": true
}
```

**Request (Release Full Payment):**
```json
{
  "resolution": "release_full_payment",
  "refundAmount": 0,
  "releaseAmount": 3200,
  "adminNote": "No evidence of damage found. Full payment released to driver.",
  "notifyBothParties": true
}
```

---

### EPIC 6: Tracking (Admin)

---

### API 92 – Get Live Location (Admin)

```
GET /api/v1/tracking/live/job_4R8M2K9X
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 93 – Get Tracking History (Admin)

```
GET /api/v1/tracking/history/job_4R8M2K9X?page=1&limit=50
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### EPIC 7: Admin Dashboard

---

### API 94 – Admin Dashboard Overview

```
GET /api/v1/dashboard/admin/overview
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 95 – Admin User List

```
GET /api/v1/dashboard/admin/users/list?page=1&limit=10&role=driver&status=active&search=John
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 96 – Suspend User (Admin)

```
PUT /api/v1/dashboard/admin/users/suspend/usr_01J8K2X9P
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "reason": "Multiple complaints received from hauliers. Unprofessional behaviour reported.",
  "suspensionDuration": "30_days",
  "notifyUser": true
}
```

---

### API 97 – Activate User (Admin)

```
PUT /api/v1/dashboard/admin/users/activate/usr_01J8K2X9P
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "reason": "Suspension period completed. Account reinstated.",
  "notifyUser": true
}
```

---

### API 98 – Pending Verifications (Admin)

```
GET /api/v1/dashboard/admin/verifications/pending?page=1&limit=10&role=driver
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 99 – Jobs Monitor (Admin)

```
GET /api/v1/dashboard/admin/jobs/monitor?page=1&limit=10&status=in_transit
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 100 – Revenue Report (Admin)

```
GET /api/v1/dashboard/admin/revenue?period=monthly&month=01&year=2024
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 101 – Disputes Overview (Admin)

```
GET /api/v1/dashboard/admin/disputes?page=1&limit=10&status=under_review
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### EPIC 8: Ratings

---

### API 102 – View User Ratings (Admin)

```
GET /api/v1/ratings/user/usr_01J8K2X9P?page=1&limit=10
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 103 – Remove Abusive Review (Admin)

```
DELETE /api/v1/admin/ratings/remove/rat_3K9M7X2P
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "reason": "Review contains abusive language and false information. Violates platform policy.",
  "notifyReporter": true,
  "notifyReviewer": true
}
```

---

### Notifications (Admin)

---

### API 104 – Get All Notifications (Admin)

```
GET /api/v1/notifications/list?page=1&limit=20
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 105 – Mark All Read (Admin)

```
PUT /api/v1/notifications/mark-all-read
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### System & Health (Admin)

---

### API 106 – Server Health Check

```
GET /api/v1/health
```

**Request:** No body – No Auth Required

---

### API 107 – Database Health Check

```
GET /api/v1/health/db
```

**Request:** No body – No Auth Required

---

### API 108 – Get System Config (Admin)

```
GET /api/v1/system/config
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 109 – Update System Config (Admin)

```
PUT /api/v1/system/config/update
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "commissionRate": "5.5%",
  "otpExpiryMinutes": 15,
  "jwtExpiryHours": 2,
  "disputeResolutionHours": 48,
  "maxFileUploadSize": "15MB",
  "trackingUpdateInterval": "10 seconds",
  "maintenanceMode": false
}
```

---

### API 110 – View System Logs (Admin)

```
GET /api/v1/system/logs?page=1&limit=20&level=error&startDate=2024-01-20
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### File Management (Admin)

---

### API 111 – Upload File (Admin)

```
POST /api/v1/files/upload
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data
```

**Request:**
```
file: <file>
fileType: "document"
folder: "admin_docs"
```

---

### API 112 – Delete File (Admin)

```
DELETE /api/v1/files/delete/fil_9K3M7X2P
Authorization: Bearer <admin-token>
```

**Request:** No body

---

### API 113 – Get Signed File URL (Admin)

```
GET /api/v1/files/get/fil_9K3M7X2P
Authorization: Bearer <admin-token>
```

**Request:** No body

---

## Complete Summary

```
┌──────────────────────────────────────────────────────┐
│         HAULIER & ADMIN API REQUEST SUMMARY          │
├─────────────────────────┬────────────────────────────┤
│  PLATFORM               │  TOTAL API REQUESTS        │
├─────────────────────────┼────────────────────────────┤
│  🚛 Haulier             │  74 API Requests           │
│  🔧 Admin               │  39 API Requests           │
├─────────────────────────┼────────────────────────────┤
│  GRAND TOTAL            │  113 API Requests          │
└─────────────────────────┴────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│              HAULIER API BREAKDOWN                   │
├─────────────────────────┬────────────────────────────┤
│  Auth & Profile         │  14 APIs                   │
│  Supplier View          │   1 API                    │
│  Job Posting & Matching │  13 APIs                   │
│  Booking & Payment      │  14 APIs                   │
│  Compliance Workflow    │   9 APIs                   │
│  Live Tracking & ETA    │   3 APIs                   │
│  Haulier Dashboard      │   5 APIs                   │
│  Ratings & Reviews      │   5 APIs                   │
│  Notifications          │   7 APIs                   │
│  File Management        │   3 APIs                   │
├─────────────────────────┼────────────────────────────┤
│  TOTAL                  │  74 APIs                   │
└─────────────────────────┴────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│               ADMIN API BREAKDOWN                    │
├─────────────────────────┬────────────────────────────┤
│  Auth & Profile         │   7 APIs                   │
│  Document Verification  │   3 APIs                   │
│  Payment & Invoices     │   4 APIs                   │
│  Compliance & Disputes  │   3 APIs                   │
│  Tracking               │   2 APIs                   │
│  Admin Dashboard        │   8 APIs                   │
│  Ratings                │   2 APIs                   │
│  Notifications          │   2 APIs                   │
│  System & Health        │   5 APIs                   │
│  File Management        │   3 APIs                   │
├─────────────────────────┼────────────────────────────┤
│  TOTAL                  │  39 APIs                   │
└─────────────────────────┴────────────────────────────┘
```