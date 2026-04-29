# FreightFlex – Mobile App (Driver) API Request & Response

---

## EPIC 1: Auth & Profile

---

### API 1 – Register (Driver)

```
POST /api/v1/auth/register
Content-Type: application/json
```

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "Driver@1234",
  "role": "driver"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 201,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "usr_01J8K2X9P",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "driver",
    "isVerified": false,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response – Duplicate Email:**
```json
{
  "status": false,
  "code": 409,
  "message": "Email already registered. Please login.",
  "data": null
}
```

**Response – Validation Error:**
```json
{
  "status": false,
  "code": 422,
  "message": "Validation failed.",
  "data": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

---

### API 2 – Verify Email (Driver)

```
POST /api/v1/auth/verify-email
Content-Type: application/json
```

**Request:**
```json
{
  "email": "john@example.com",
  "otp": "482910"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Email verified successfully.",
  "data": {
    "userId": "usr_01J8K2X9P",
    "isVerified": true,
    "verifiedAt": "2024-01-15T10:35:00Z"
  }
}
```

**Response – Invalid OTP:**
```json
{
  "status": false,
  "code": 400,
  "message": "Invalid or expired OTP. Please try again.",
  "data": null
}
```

**Response – OTP Expired:**
```json
{
  "status": false,
  "code": 400,
  "message": "OTP has expired. Please request a new one.",
  "data": null
}
```

---

### API 3 – Resend OTP (Driver)

```
POST /api/v1/auth/resend-verification
Content-Type: application/json
```

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "OTP sent successfully to john@example.com.",
  "data": {
    "email": "john@example.com",
    "otpExpiresAt": "2024-01-15T10:45:00Z"
  }
}
```

**Response – Already Verified:**
```json
{
  "status": false,
  "code": 400,
  "message": "Email is already verified.",
  "data": null
}
```

---

### API 4 – Login (Driver)

```
POST /api/v1/auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "email": "john@example.com",
  "password": "Driver@1234"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Login successful.",
  "data": {
    "userId": "usr_01J8K2X9P",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "driver",
    "isProfileComplete": true,
    "isVerified": true,
    "profilePhoto": "https://cdn.freightflex.com/photos/usr_01J8K2X9P.jpg",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expiresIn": 3600
  }
}
```

**Response – Wrong Credentials:**
```json
{
  "status": false,
  "code": 401,
  "message": "Invalid email or password.",
  "data": null
}
```

**Response – Account Suspended:**
```json
{
  "status": false,
  "code": 403,
  "message": "Your account has been suspended. Please contact support.",
  "data": {
    "suspendedUntil": "2024-02-20T10:00:00Z",
    "reason": "Multiple complaints received"
  }
}
```

**Response – Email Not Verified:**
```json
{
  "status": false,
  "code": 403,
  "message": "Please verify your email before logging in.",
  "data": null
}
```

---

### API 5 – Logout (Driver)

```
POST /api/v1/auth/logout
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Logged out successfully.",
  "data": null
}
```

---

### API 6 – Refresh Token (Driver)

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

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Token refreshed successfully.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Response – Invalid Token:**
```json
{
  "status": false,
  "code": 401,
  "message": "Invalid or expired refresh token. Please login again.",
  "data": null
}
```

---

### API 7 – Forgot Password (Driver)

```
POST /api/v1/auth/forgot-password
Content-Type: application/json
```

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Password reset link sent to john@example.com.",
  "data": {
    "email": "john@example.com",
    "resetLinkExpiresAt": "2024-01-15T11:30:00Z"
  }
}
```

**Response – Email Not Found:**
```json
{
  "status": false,
  "code": 404,
  "message": "No account found with this email.",
  "data": null
}
```

---

### API 8 – Reset Password (Driver)

```
POST /api/v1/auth/reset-password
Content-Type: application/json
```

**Request:**
```json
{
  "resetToken": "driver_reset_token_abc123xyz",
  "newPassword": "NewDriver@5678",
  "confirmPassword": "NewDriver@5678"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Password reset successfully. Please login.",
  "data": null
}
```

**Response – Token Expired:**
```json
{
  "status": false,
  "code": 400,
  "message": "Reset token is invalid or expired.",
  "data": null
}
```

**Response – Password Mismatch:**
```json
{
  "status": false,
  "code": 400,
  "message": "Passwords do not match.",
  "data": null
}
```

---

### API 9 – Change Password (Driver)

```
PUT /api/v1/auth/change-password
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "currentPassword": "Driver@1234",
  "newPassword": "NewDriver@5678",
  "confirmPassword": "NewDriver@5678"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Password changed successfully.",
  "data": null
}
```

**Response – Wrong Current Password:**
```json
{
  "status": false,
  "code": 400,
  "message": "Current password is incorrect.",
  "data": null
}
```

---

### API 10 – Profile Setup (Driver)

```
POST /api/v1/profile/setup
Authorization: Bearer <driver-token>
Content-Type: multipart/form-data
```

**Request:**
```json
{
  "name": "John Doe",
  "photo": "<image file>",
  "licenseNumber": "DL1420110012345",
  "licenseExpiry": "2028-06-30",
  "vehicleType": "truck",
  "vehicleNumber": "MH12AB1234",
  "vehicleModel": "Tata 407",
  "vehicleYear": "2020"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Profile setup completed successfully.",
  "data": {
    "userId": "usr_01J8K2X9P",
    "isProfileComplete": true,
    "role": "driver",
    "profileData": {
      "name": "John Doe",
      "photo": "https://cdn.freightflex.com/photos/usr_01J8K2X9P.jpg",
      "licenseNumber": "DL1420110012345",
      "licenseExpiry": "2028-06-30",
      "vehicleType": "truck",
      "vehicleNumber": "MH12AB1234",
      "vehicleModel": "Tata 407",
      "vehicleYear": "2020"
    }
  }
}
```

**Response – Incomplete Fields:**
```json
{
  "status": false,
  "code": 422,
  "message": "Validation failed.",
  "data": {
    "errors": [
      {
        "field": "licenseNumber",
        "message": "License number is required"
      }
    ]
  }
}
```

---

### API 11 – Update Profile (Driver)

```
PUT /api/v1/profile/update
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "phone": "9123456780",
  "vehicleType": "mini-truck",
  "vehicleNumber": "MH14CD5678",
  "vehicleModel": "Mahindra Bolero",
  "vehicleYear": "2022"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Profile updated successfully.",
  "data": {
    "userId": "usr_01J8K2X9P",
    "updatedFields": [
      "phone",
      "vehicleType",
      "vehicleNumber",
      "vehicleModel",
      "vehicleYear"
    ],
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

---

### API 12 – Get Own Profile (Driver)

```
GET /api/v1/profile/me
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Profile fetched successfully.",
  "data": {
    "userId": "usr_01J8K2X9P",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "role": "driver",
    "isVerified": true,
    "isProfileComplete": true,
    "profileData": {
      "photo": "https://cdn.freightflex.com/photos/usr_01J8K2X9P.jpg",
      "licenseNumber": "DL1420110012345",
      "licenseExpiry": "2028-06-30",
      "vehicleType": "truck",
      "vehicleNumber": "MH12AB1234",
      "vehicleModel": "Tata 407",
      "vehicleYear": "2020"
    },
    "verificationStatus": "verified",
    "rating": 4.5,
    "totalJobs": 28,
    "totalEarnings": 145800,
    "currency": "INR",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### API 13 – Upload Profile Photo (Driver)

```
POST /api/v1/profile/photo/upload
Authorization: Bearer <driver-token>
Content-Type: multipart/form-data
```

**Request:**
```
photo: <image file>
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Profile photo uploaded successfully.",
  "data": {
    "photoUrl": "https://cdn.freightflex.com/photos/usr_01J8K2X9P.jpg",
    "uploadedAt": "2024-01-15T12:10:00Z"
  }
}
```

**Response – Invalid File Type:**
```json
{
  "status": false,
  "code": 400,
  "message": "Invalid file type. Only JPG and PNG allowed.",
  "data": null
}
```

---

## EPIC 2: Documents & Availability

---

### API 14 – Upload Document (Driver)

```
POST /api/v1/supplier/documents/upload
Authorization: Bearer <driver-token>
Content-Type: multipart/form-data
```

**Request:**
```
documentType: "driving_license"
documentFile: <pdf or image file>
expiryDate: "2028-06-30"
```

**Response – Success:**
```json
{
  "status": true,
  "code": 201,
  "message": "Document uploaded successfully. Pending admin review.",
  "data": {
    "documentId": "doc_9X2K8P1L",
    "documentType": "driving_license",
    "fileUrl": "https://cdn.freightflex.com/docs/doc_9X2K8P1L.pdf",
    "status": "pending",
    "expiryDate": "2028-06-30",
    "uploadedAt": "2024-01-15T13:00:00Z"
  }
}
```

**Response – Already Uploaded:**
```json
{
  "status": false,
  "code": 409,
  "message": "Document already uploaded. Please delete existing document to re-upload.",
  "data": null
}
```

---

### API 15 – List My Documents (Driver)

```
GET /api/v1/supplier/documents/list
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Documents fetched successfully.",
  "data": {
    "documents": [
      {
        "documentId": "doc_9X2K8P1L",
        "documentType": "driving_license",
        "fileUrl": "https://cdn.freightflex.com/docs/doc_9X2K8P1L.pdf",
        "status": "approved",
        "expiryDate": "2028-06-30",
        "uploadedAt": "2024-01-15T13:00:00Z"
      },
      {
        "documentId": "doc_3M7N5Q2R",
        "documentType": "vehicle_registration",
        "fileUrl": "https://cdn.freightflex.com/docs/doc_3M7N5Q2R.pdf",
        "status": "pending",
        "expiryDate": "2026-06-30",
        "uploadedAt": "2024-01-15T13:05:00Z"
      },
      {
        "documentId": "doc_8K2P3N7X",
        "documentType": "insurance",
        "fileUrl": "https://cdn.freightflex.com/docs/doc_8K2P3N7X.pdf",
        "status": "rejected",
        "rejectionReason": "Document is expired",
        "expiryDate": "2023-12-31",
        "uploadedAt": "2024-01-15T13:10:00Z"
      }
    ],
    "totalDocuments": 3
  }
}
```

---

### API 16 – View Single Document (Driver)

```
GET /api/v1/supplier/documents/doc_9X2K8P1L
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Document fetched successfully.",
  "data": {
    "documentId": "doc_9X2K8P1L",
    "documentType": "driving_license",
    "fileUrl": "https://cdn.freightflex.com/docs/doc_9X2K8P1L.pdf",
    "status": "approved",
    "expiryDate": "2028-06-30",
    "reviewedBy": "admin_01",
    "reviewedAt": "2024-01-15T14:00:00Z",
    "uploadedAt": "2024-01-15T13:00:00Z"
  }
}
```

---

### API 17 – Delete Document (Driver)

```
DELETE /api/v1/supplier/documents/delete/doc_8K2P3N7X
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Document deleted successfully. You can now re-upload.",
  "data": {
    "documentId": "doc_8K2P3N7X",
    "deletedAt": "2024-01-15T14:10:00Z"
  }
}
```

**Response – Cannot Delete Approved:**
```json
{
  "status": false,
  "code": 400,
  "message": "Approved documents cannot be deleted. Contact support.",
  "data": null
}
```

---

### API 18 – Check Verification Status (Driver)

```
GET /api/v1/supplier/documents/status
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Verification status fetched successfully.",
  "data": {
    "overallStatus": "partial",
    "isVerified": false,
    "canAcceptJobs": false,
    "documents": [
      {
        "documentType": "driving_license",
        "status": "approved"
      },
      {
        "documentType": "vehicle_registration",
        "status": "pending"
      },
      {
        "documentType": "insurance",
        "status": "rejected",
        "rejectionReason": "Document is expired"
      }
    ],
    "message": "Please re-upload your insurance document to complete verification."
  }
}
```

---

### API 19 – Set Availability (Driver)

```
POST /api/v1/supplier/availability/set
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "availableDays": [
    "monday",
    "tuesday",
    "wednesday",
    "friday",
    "saturday"
  ],
  "timeSlots": [
    {
      "day": "monday",
      "startTime": "08:00",
      "endTime": "18:00"
    },
    {
      "day": "tuesday",
      "startTime": "08:00",
      "endTime": "18:00"
    },
    {
      "day": "wednesday",
      "startTime": "08:00",
      "endTime": "18:00"
    },
    {
      "day": "friday",
      "startTime": "08:00",
      "endTime": "18:00"
    },
    {
      "day": "saturday",
      "startTime": "09:00",
      "endTime": "15:00"
    }
  ],
  "timezone": "Asia/Kolkata"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 201,
  "message": "Availability set successfully.",
  "data": {
    "availabilityId": "avl_7T3P9K1X",
    "availableDays": [
      "monday",
      "tuesday",
      "wednesday",
      "friday",
      "saturday"
    ],
    "isAvailable": true,
    "timezone": "Asia/Kolkata",
    "createdAt": "2024-01-15T16:00:00Z"
  }
}
```

---

### API 20 – Update Availability (Driver)

```
PUT /api/v1/supplier/availability/update
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "availableDays": [
    "monday",
    "wednesday",
    "friday"
  ],
  "timeSlots": [
    {
      "day": "monday",
      "startTime": "09:00",
      "endTime": "17:00"
    },
    {
      "day": "wednesday",
      "startTime": "09:00",
      "endTime": "17:00"
    },
    {
      "day": "friday",
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Availability updated successfully.",
  "data": {
    "availabilityId": "avl_7T3P9K1X",
    "updatedAt": "2024-01-15T16:30:00Z"
  }
}
```

---

### API 21 – Toggle Availability (Driver)

```
PUT /api/v1/supplier/availability/toggle
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request (Turn OFF):**
```json
{
  "isAvailable": false,
  "reason": "Vehicle under maintenance"
}
```

**Request (Turn ON):**
```json
{
  "isAvailable": true,
  "reason": ""
}
```

**Response – Success (OFF):**
```json
{
  "status": true,
  "code": 200,
  "message": "You are now marked as Unavailable.",
  "data": {
    "isAvailable": false,
    "reason": "Vehicle under maintenance",
    "updatedAt": "2024-01-15T17:00:00Z"
  }
}
```

**Response – Success (ON):**
```json
{
  "status": true,
  "code": 200,
  "message": "You are now marked as Available.",
  "data": {
    "isAvailable": true,
    "updatedAt": "2024-01-15T17:00:00Z"
  }
}
```

---

### API 22 – Get My Availability (Driver)

```
GET /api/v1/supplier/availability/me
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Availability fetched successfully.",
  "data": {
    "availabilityId": "avl_7T3P9K1X",
    "isAvailable": true,
    "availableDays": [
      "monday",
      "tuesday",
      "wednesday",
      "friday",
      "saturday"
    ],
    "timeSlots": [
      {
        "day": "monday",
        "startTime": "08:00",
        "endTime": "18:00"
      },
      {
        "day": "saturday",
        "startTime": "09:00",
        "endTime": "15:00"
      }
    ],
    "timezone": "Asia/Kolkata",
    "updatedAt": "2024-01-15T16:00:00Z"
  }
}
```

---

## EPIC 3: Jobs & Quotes

---

### API 23 – View Available Jobs (Driver)

```
GET /api/v1/jobs/list?page=1&limit=10&status=open&vehicleType=truck
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Available jobs fetched successfully.",
  "data": {
    "jobs": [
      {
        "jobId": "job_4R8M2K9X",
        "jobReference": "FF-2024-00142",
        "status": "open",
        "pickupLocation": {
          "address": "Sector 18, Noida, UP",
          "latitude": 28.5707,
          "longitude": 77.3219
        },
        "dropLocation": {
          "address": "Connaught Place, New Delhi",
          "latitude": 28.6315,
          "longitude": 77.2167
        },
        "distance": "22.4 km",
        "estimatedDuration": "45 mins",
        "goodsType": "Electronics",
        "weight": "500 kg",
        "vehicleTypeRequired": "truck",
        "jobDate": "2024-01-20",
        "timeSlot": {
          "startTime": "09:00",
          "endTime": "12:00"
        },
        "haulier": {
          "name": "FastMove Logistics",
          "rating": 4.2
        },
        "totalQuotes": 2,
        "distanceFromDriver": "3.2 km",
        "createdAt": "2024-01-15T18:00:00Z"
      }
    ],
    "totalJobs": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**Response – No Jobs Found:**
```json
{
  "status": true,
  "code": 200,
  "message": "No available jobs found matching your criteria.",
  "data": {
    "jobs": [],
    "totalJobs": 0
  }
}
```

---

### API 24 – View Job Details (Driver)

```
GET /api/v1/jobs/job_4R8M2K9X
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Job details fetched successfully.",
  "data": {
    "jobId": "job_4R8M2K9X",
    "jobReference": "FF-2024-00142",
    "status": "open",
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
    "distance": "22.4 km",
    "estimatedDuration": "45 mins",
    "goodsType": "Electronics",
    "weight": "500 kg",
    "vehicleTypeRequired": "truck",
    "jobDate": "2024-01-20",
    "timeSlot": {
      "startTime": "09:00",
      "endTime": "12:00"
    },
    "specialInstructions": "Handle with care. Fragile items.",
    "haulier": {
      "name": "FastMove Logistics",
      "rating": 4.2,
      "totalJobs": 89
    },
    "totalQuotes": 2,
    "hasQuoted": false,
    "createdAt": "2024-01-15T18:00:00Z"
  }
}
```

---

### API 25 – Submit Quote (Driver)

```
POST /api/v1/quotes/submit
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobId": "job_4R8M2K9X",
  "quoteAmount": 3500,
  "currency": "INR",
  "notes": "Including fuel and toll charges. On time guaranteed."
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 201,
  "message": "Quote submitted successfully.",
  "data": {
    "quoteId": "qte_2K9P7M3L",
    "jobId": "job_4R8M2K9X",
    "jobReference": "FF-2024-00142",
    "quoteAmount": 3500,
    "currency": "INR",
    "notes": "Including fuel and toll charges. On time guaranteed.",
    "status": "submitted",
    "submittedAt": "2024-01-15T20:30:00Z"
  }
}
```

**Response – Not Verified:**
```json
{
  "status": false,
  "code": 403,
  "message": "Your account is not verified. Please upload all required documents.",
  "data": null
}
```

**Response – Already Quoted:**
```json
{
  "status": false,
  "code": 409,
  "message": "You have already submitted a quote for this job.",
  "data": null
}
```

---

### API 26 – Edit Quote (Driver)

```
PUT /api/v1/quotes/edit/qte_2K9P7M3L
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "quoteAmount": 3200,
  "notes": "Revised quote. All charges included."
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Quote updated successfully.",
  "data": {
    "quoteId": "qte_2K9P7M3L",
    "jobId": "job_4R8M2K9X",
    "quoteAmount": 3200,
    "notes": "Revised quote. All charges included.",
    "status": "submitted",
    "updatedAt": "2024-01-15T21:00:00Z"
  }
}
```

**Response – Cannot Edit:**
```json
{
  "status": false,
  "code": 400,
  "message": "Quote cannot be edited after haulier has made a selection.",
  "data": null
}
```

---

### API 27 – Withdraw Quote (Driver)

```
DELETE /api/v1/quotes/withdraw/qte_2K9P7M3L
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Quote withdrawn successfully.",
  "data": {
    "quoteId": "qte_2K9P7M3L",
    "status": "withdrawn",
    "withdrawnAt": "2024-01-16T08:00:00Z"
  }
}
```

---

### API 28 – My Submitted Quotes (Driver)

```
GET /api/v1/quotes/my-quotes?page=1&limit=10&status=submitted
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Your quotes fetched successfully.",
  "data": {
    "quotes": [
      {
        "quoteId": "qte_2K9P7M3L",
        "job": {
          "jobId": "job_4R8M2K9X",
          "jobReference": "FF-2024-00142",
          "pickupLocation": "Sector 18, Noida, UP",
          "dropLocation": "Connaught Place, New Delhi",
          "jobDate": "2024-01-20",
          "status": "open"
        },
        "quoteAmount": 3200,
        "currency": "INR",
        "status": "submitted",
        "submittedAt": "2024-01-15T20:30:00Z"
      }
    ],
    "totalQuotes": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

## EPIC 4: Bookings & Payments

---

### API 29 – View Booking Details (Driver)

```
GET /api/v1/bookings/bkg_7X3K9P2M
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Booking details fetched successfully.",
  "data": {
    "bookingId": "bkg_7X3K9P2M",
    "jobId": "job_4R8M2K9X",
    "jobReference": "FF-2024-00142",
    "status": "booked",
    "haulier": {
      "name": "FastMove Logistics",
      "phone": "9812345670",
      "address": "123 Industrial Area, Mumbai"
    },
    "pickupLocation": {
      "address": "Sector 18, Noida, UP",
      "latitude": 28.5707,
      "longitude": 77.3219
    },
    "dropLocation": {
      "address": "Connaught Place, New Delhi",
      "latitude": 28.6315,
      "longitude": 77.2167
    },
    "distance": "22.4 km",
    "goodsType": "Electronics",
    "weight": "500 kg",
    "jobDate": "2024-01-20",
    "timeSlot": {
      "startTime": "09:00",
      "endTime": "12:00"
    },
    "agreedAmount": 3200,
    "currency": "INR",
    "paymentStatus": "held_in_escrow",
    "isPaymentSecured": true,
    "complianceStatus": {
      "loadCode": "pending",
      "handover": "pending",
      "delivery": "pending"
    },
    "bookedAt": "2024-01-16T09:00:00Z"
  }
}
```

---

### API 30 – View My Bookings (Driver)

```
GET /api/v1/bookings/list?page=1&limit=10&status=booked
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Bookings fetched successfully.",
  "data": {
    "bookings": [
      {
        "bookingId": "bkg_7X3K9P2M",
        "jobReference": "FF-2024-00142",
        "status": "booked",
        "haulierName": "FastMove Logistics",
        "pickupLocation": "Sector 18, Noida, UP",
        "dropLocation": "Connaught Place, New Delhi",
        "jobDate": "2024-01-20",
        "agreedAmount": 3200,
        "currency": "INR",
        "paymentStatus": "held_in_escrow",
        "isPaymentSecured": true,
        "bookedAt": "2024-01-16T09:00:00Z"
      }
    ],
    "totalBookings": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### API 31 – Check Payment Status (Driver)

```
GET /api/v1/payments/status/pay_5M8K3X9P
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Payment status fetched successfully.",
  "data": {
    "paymentId": "pay_5M8K3X9P",
    "bookingId": "bkg_7X3K9P2M",
    "jobReference": "FF-2024-00142",
    "amount": 3200,
    "currency": "INR",
    "status": "held_in_escrow",
    "isSecured": true,
    "message": "Payment is secured in escrow. Will be released after delivery approval.",
    "initiatedAt": "2024-01-16T10:00:00Z"
  }
}
```

---

### API 32 – Payment History (Driver)

```
GET /api/v1/payments/history?page=1&limit=10&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Payment history fetched successfully.",
  "data": {
    "payments": [
      {
        "paymentId": "pay_5M8K3X9P",
        "jobReference": "FF-2024-00142",
        "amount": 3200,
        "currency": "INR",
        "status": "released",
        "releasedAt": "2024-01-20T15:00:00Z"
      }
    ],
    "totalPayments": 1,
    "totalEarned": 3200,
    "currency": "INR",
    "page": 1,
    "limit": 10
  }
}
```

---

### API 33 – View My Invoices (Driver)

```
GET /api/v1/invoices/list?page=1&limit=10
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Invoices fetched successfully.",
  "data": {
    "invoices": [
      {
        "invoiceId": "inv_3K9M2X7P",
        "invoiceNumber": "FF-INV-2024-00089",
        "jobReference": "FF-2024-00142",
        "totalAmount": 3200,
        "currency": "INR",
        "paymentStatus": "paid",
        "generatedAt": "2024-01-20T15:30:00Z"
      }
    ],
    "totalInvoices": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### API 34 – View Invoice Details (Driver)

```
GET /api/v1/invoices/inv_3K9M2X7P
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Invoice fetched successfully.",
  "data": {
    "invoiceId": "inv_3K9M2X7P",
    "invoiceNumber": "FF-INV-2024-00089",
    "jobReference": "FF-2024-00142",
    "serviceDetails": {
      "pickupLocation": "Sector 18, Noida, UP",
      "dropLocation": "Connaught Place, New Delhi",
      "distance": "22.4 km",
      "jobDate": "2024-01-20",
      "goodsType": "Electronics"
    },
    "breakdown": {
      "baseAmount": 2711.86,
      "taxRate": "18%",
      "taxAmount": 488.14,
      "totalAmount": 3200.00
    },
    "currency": "INR",
    "paymentStatus": "paid",
    "generatedAt": "2024-01-20T15:30:00Z"
  }
}
```

---

### API 35 – Download Invoice PDF (Driver)

```
GET /api/v1/invoices/download/inv_3K9M2X7P
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Invoice download link generated.",
  "data": {
    "invoiceId": "inv_3K9M2X7P",
    "invoiceNumber": "FF-INV-2024-00089",
    "downloadUrl": "https://cdn.freightflex.com/invoices/FF-INV-2024-00089.pdf",
    "urlExpiresAt": "2024-01-20T16:30:00Z"
  }
}
```

---

## EPIC 5: Compliance Workflow

---

### API 36 – Verify Load Code (Driver)

```
POST /api/v1/compliance/load-code/verify
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobId": "job_4R8M2K9X",
  "bookingId": "bkg_7X3K9P2M",
  "loadCode": "LC-FF-20240120-4829"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Load code verified. Step 1 complete.",
  "data": {
    "jobId": "job_4R8M2K9X",
    "step": "load_code_confirmation",
    "stepStatus": "completed",
    "nextStep": "vehicle_handover_check",
    "nextStepMessage": "Please complete vehicle checklist and upload condition photos.",
    "verifiedAt": "2024-01-20T08:30:00Z"
  }
}
```

**Response – Wrong Load Code:**
```json
{
  "status": false,
  "code": 400,
  "message": "Invalid load code. Please check and try again.",
  "data": {
    "canRetry": true,
    "attemptsRemaining": 2
  }
}
```

---

### API 37 – Get Load Code Status (Driver)

```
GET /api/v1/compliance/load-code/status/job_4R8M2K9X
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Load code status fetched successfully.",
  "data": {
    "jobId": "job_4R8M2K9X",
    "step": "load_code_confirmation",
    "stepStatus": "completed",
    "verifiedAt": "2024-01-20T08:30:00Z"
  }
}
```

---

### API 38 – Submit Vehicle Checklist (Driver)

```
POST /api/v1/compliance/handover/checklist/submit
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobId": "job_4R8M2K9X",
  "bookingId": "bkg_7X3K9P2M",
  "checklist": {
    "fuelLevel": "full",
    "tyrePressure": "good",
    "brakes": "good",
    "lights": "good",
    "bodyCondition": "minor_scratches_on_left_side",
    "windshield": "good",
    "loadingArea": "clean_and_dry",
    "documents": "present"
  },
  "additionalNotes": "Minor dent on rear bumper. Pre-existing damage."
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 201,
  "message": "Vehicle checklist submitted successfully.",
  "data": {
    "checklistId": "chk_8P3K2M9X",
    "jobId": "job_4R8M2K9X",
    "submittedAt": "2024-01-20T08:45:00Z",
    "nextAction": "Upload vehicle condition photos"
  }
}
```

---

### API 39 – Upload Handover Photos (Driver)

```
POST /api/v1/compliance/handover/photos/upload
Authorization: Bearer <driver-token>
Content-Type: multipart/form-data
```

**Request:**
```
jobId: job_4R8M2K9X
bookingId: bkg_7X3K9P2M
photos: [<file1>, <file2>, <file3>, <file4>]
photoLabels: ["front_view", "rear_view", "left_side", "right_side"]
```

**Response – Success:**
```json
{
  "status": true,
  "code": 201,
  "message": "Handover photos uploaded successfully.",
  "data": {
    "jobId": "job_4R8M2K9X",
    "uploadedPhotos": [
      {
        "photoId": "ph_K2M9X3P7",
        "label": "front_view",
        "url": "https://cdn.freightflex.com/handover/ph_K2M9X3P7.jpg"
      },
      {
        "photoId": "ph_P7X3K9M2",
        "label": "rear_view",
        "url": "https://cdn.freightflex.com/handover/ph_P7X3K9M2.jpg"
      },
      {
        "photoId": "ph_M3X7P2K9",
        "label": "left_side",
        "url": "https://cdn.freightflex.com/handover/ph_M3X7P2K9.jpg"
      },
      {
        "photoId": "ph_X9K3M7P2",
        "label": "right_side",
        "url": "https://cdn.freightflex.com/handover/ph_X9K3M7P2.jpg"
      }
    ],
    "totalPhotos": 4,
    "uploadedAt": "2024-01-20T08:50:00Z",
    "nextAction": "Sign vehicle handover digitally"
  }
}
```

---

### API 40 – Driver Digital Signature (Driver)

```
POST /api/v1/compliance/handover/sign/driver
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobId": "job_4R8M2K9X",
  "bookingId": "bkg_7X3K9P2M",
  "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "acknowledgement": "I confirm the vehicle condition is as documented above."
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Signature captured. Waiting for haulier signature.",
  "data": {
    "signatureId": "sig_D9K3M7X2",
    "jobId": "job_4R8M2K9X",
    "signedBy": "driver",
    "signatureUrl": "https://cdn.freightflex.com/signatures/sig_D9K3M7X2.png",
    "signedAt": "2024-01-20T09:00:00Z",
    "waitingFor": "haulier_signature"
  }
}
```

---

### API 41 – Get Handover Status (Driver)

```
GET /api/v1/compliance/handover/status/job_4R8M2K9X
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Handover status fetched successfully.",
  "data": {
    "jobId": "job_4R8M2K9X",
    "step": "vehicle_handover_check",
    "stepStatus": "in_progress",
    "checklist": "submitted",
    "photos": "uploaded",
    "driverSignature": {
      "signed": true,
      "signedAt": "2024-01-20T09:00:00Z"
    },
    "haulierSignature": {
      "signed": false,
      "message": "Waiting for haulier to sign"
    }
  }
}
```

---

### API 42 – Submit Delivery Proof (Driver)

```
POST /api/v1/compliance/delivery/submit
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobId": "job_4R8M2K9X",
  "bookingId": "bkg_7X3K9P2M",
  "recipientName": "Rajesh Kumar",
  "recipientSignature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "deliveryNotes": "Delivered successfully. All items intact and accounted for.",
  "deliveredAt": "2024-01-20T14:30:00Z"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 201,
  "message": "Delivery proof submitted. Awaiting haulier approval.",
  "data": {
    "deliveryId": "dlv_3X9P7M2K",
    "jobId": "job_4R8M2K9X",
    "recipientName": "Rajesh Kumar",
    "status": "pending_approval",
    "message": "Haulier will review and approve your delivery.",
    "submittedAt": "2024-01-20T14:35:00Z"
  }
}
```

---

### API 43 – Upload Delivery Photos (Driver)

```
POST /api/v1/compliance/delivery/photos/upload
Authorization: Bearer <driver-token>
Content-Type: multipart/form-data
```

**Request:**
```
jobId: job_4R8M2K9X
bookingId: bkg_7X3K9P2M
photos: [<file1>, <file2>]
photoLabels: ["goods_delivered", "drop_location"]
```

**Response – Success:**
```json
{
  "status": true,
  "code": 201,
  "message": "Delivery photos uploaded successfully.",
  "data": {
    "jobId": "job_4R8M2K9X",
    "uploadedPhotos": [
      {
        "photoId": "ph_DL7K3M9X",
        "label": "goods_delivered",
        "url": "https://cdn.freightflex.com/delivery/ph_DL7K3M9X.jpg"
      },
      {
        "photoId": "ph_DL2P9K7M",
        "label": "drop_location",
        "url": "https://cdn.freightflex.com/delivery/ph_DL2P9K7M.jpg"
      }
    ],
    "totalPhotos": 2,
    "uploadedAt": "2024-01-20T14:32:00Z"
  }
}
```

---

### API 44 – Get Delivery Status (Driver)

```
GET /api/v1/compliance/delivery/status/job_4R8M2K9X
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Delivery status fetched successfully.",
  "data": {
    "jobId": "job_4R8M2K9X",
    "step": "delivery_report",
    "stepStatus": "pending_approval",
    "submittedAt": "2024-01-20T14:35:00Z",
    "approvalStatus": "awaiting",
    "message": "Waiting for haulier to approve your delivery."
  }
}
```

---

### API 45 – Get Full Compliance Status (Driver)

```
GET /api/v1/compliance/full-status/job_4R8M2K9X
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Compliance status fetched successfully.",
  "data": {
    "jobId": "job_4R8M2K9X",
    "jobReference": "FF-2024-00142",
    "overallStatus": "in_progress",
    "steps": {
      "step1": {
        "name": "Load Code Confirmation",
        "status": "completed",
        "completedAt": "2024-01-20T08:30:00Z"
      },
      "step2": {
        "name": "Vehicle Handover Check",
        "status": "completed",
        "driverSigned": true,
        "haulierSigned": true,
        "completedAt": "2024-01-20T09:10:00Z"
      },
      "step3": {
        "name": "Delivery Report & Approval",
        "status": "pending_approval",
        "submittedAt": "2024-01-20T14:35:00Z"
      }
    },
    "tripStatus": "in_transit"
  }
}
```

---

## EPIC 6: Live Tracking

---

### API 46 – Start Tracking (Driver)

```
POST /api/v1/tracking/start/job_4R8M2K9X
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "bookingId": "bkg_7X3K9P2M",
  "initialLocation": {
    "latitude": 28.5707,
    "longitude": 77.3219
  }
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Tracking started successfully.",
  "data": {
    "trackingId": "trk_9M3K7X2P",
    "jobId": "job_4R8M2K9X",
    "status": "active",
    "destination": {
      "latitude": 28.6315,
      "longitude": 77.2167,
      "address": "Connaught Place, New Delhi"
    },
    "updateInterval": "10 seconds",
    "startedAt": "2024-01-20T09:15:00Z"
  }
}
```

---

### API 47 – Update Live Location (Driver)

```
POST /api/v1/tracking/update-location
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobId": "job_4R8M2K9X",
  "trackingId": "trk_9M3K7X2P",
  "latitude": 28.5850,
  "longitude": 77.3100,
  "speed": 45.5,
  "heading": 320,
  "accuracy": 5.2,
  "timestamp": "2024-01-20T09:25:00Z"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Location updated.",
  "data": {
    "trackingId": "trk_9M3K7X2P",
    "distanceCovered": "1.6 km",
    "distanceRemaining": "20.8 km",
    "estimatedArrival": "2024-01-20T10:05:00Z",
    "updatedAt": "2024-01-20T09:25:00Z"
  }
}
```

---

### API 48 – Stop Tracking (Driver)

```
POST /api/v1/tracking/stop/job_4R8M2K9X
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "bookingId": "bkg_7X3K9P2M",
  "finalLocation": {
    "latitude": 28.6315,
    "longitude": 77.2167
  }
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Tracking stopped successfully.",
  "data": {
    "trackingId": "trk_9M3K7X2P",
    "status": "completed",
    "totalDistance": "22.4 km",
    "tripDuration": "48 mins",
    "startedAt": "2024-01-20T09:15:00Z",
    "stoppedAt": "2024-01-20T10:03:00Z"
  }
}
```

---

### API 49 – Get ETA (Driver)

```
GET /api/v1/tracking/eta/job_4R8M2K9X
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "ETA fetched successfully.",
  "data": {
    "jobId": "job_4R8M2K9X",
    "destination": {
      "address": "Connaught Place, New Delhi",
      "latitude": 28.6315,
      "longitude": 77.2167
    },
    "distanceRemaining": "20.8 km",
    "estimatedArrival": "2024-01-20T10:05:00Z",
    "estimatedDuration": "40 mins",
    "isDelayed": false,
    "lastCalculatedAt": "2024-01-20T09:25:00Z"
  }
}
```

---

## EPIC 7: Driver Dashboard

---

### API 50 – Driver Dashboard Overview

```
GET /api/v1/dashboard/driver/overview
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Dashboard fetched successfully.",
  "data": {
    "driverId": "usr_01J8K2X9P",
    "name": "John Doe",
    "photo": "https://cdn.freightflex.com/photos/usr_01J8K2X9P.jpg",
    "isAvailable": true,
    "isVerified": true,
    "rating": 4.5,
    "activeJob": {
      "jobId": "job_4R8M2K9X",
      "jobReference": "FF-2024-00142",
      "status": "in_transit",
      "pickupLocation": "Sector 18, Noida, UP",
      "dropLocation": "Connaught Place, New Delhi",
      "eta": "2024-01-20T10:05:00Z",
      "currentComplianceStep": "delivery_report",
      "quickActions": [
        "start_navigation",
        "upload_delivery_proof",
        "update_status"
      ]
    },
    "todaySummary": {
      "jobsCompleted": 1,
      "todayEarnings": 3200,
      "currency": "INR"
    },
    "upcomingJobs": 2,
    "pendingActions": [
      {
        "action": "Submit delivery proof",
        "jobReference": "FF-2024-00142"
      }
    ],
    "unreadNotifications": 3,
    "lastUpdatedAt": "2024-01-20T09:30:00Z"
  }
}
```

---

### API 51 – Driver Earnings

```
GET /api/v1/dashboard/driver/earnings?period=monthly&month=01&year=2024
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Earnings fetched successfully.",
  "data": {
    "period": "January 2024",
    "summary": {
      "totalEarnings": 28500,
      "totalJobs": 9,
      "averagePerJob": 3166,
      "currency": "INR"
    },
    "breakdown": [
      {
        "week": "Week 1 (Jan 1–7)",
        "earnings": 9600,
        "jobs": 3
      },
      {
        "week": "Week 2 (Jan 8–14)",
        "earnings": 6400,
        "jobs": 2
      },
      {
        "week": "Week 3 (Jan 15–21)",
        "earnings": 12500,
        "jobs": 4
      }
    ],
    "recentPayments": [
      {
        "paymentId": "pay_5M8K3X9P",
        "jobReference": "FF-2024-00142",
        "amount": 3200,
        "paidAt": "2024-01-20T15:00:00Z"
      }
    ],
    "allTimeEarnings": 145800,
    "allTimeJobs": 46,
    "currency": "INR"
  }
}
```

---

### API 52 – Upcoming Jobs (Driver)

```
GET /api/v1/dashboard/driver/jobs/upcoming?page=1&limit=10
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Upcoming jobs fetched successfully.",
  "data": {
    "jobs": [
      {
        "jobId": "job_9M2K7X3P",
        "jobReference": "FF-2024-00158",
        "status": "booked",
        "pickupLocation": {
          "address": "Gurgaon Sector 29, Haryana",
          "latitude": 28.4089,
          "longitude": 77.0422
        },
        "dropLocation": {
          "address": "Faridabad Industrial Area, Haryana",
          "latitude": 28.4082,
          "longitude": 77.3136
        },
        "distance": "18.5 km",
        "goodsType": "Machinery Parts",
        "weight": "800 kg",
        "jobDate": "2024-01-22",
        "timeSlot": {
          "startTime": "10:00",
          "endTime": "14:00"
        },
        "agreedAmount": 2800,
        "currency": "INR",
        "haulier": {
          "name": "ProLogix Ltd",
          "phone": "9811223344"
        },
        "paymentSecured": true,
        "bookedAt": "2024-01-16T11:00:00Z"
      }
    ],
    "totalUpcoming": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### API 53 – Job History (Driver)

```
GET /api/v1/dashboard/driver/jobs/history?page=1&limit=10&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Job history fetched successfully.",
  "data": {
    "jobs": [
      {
        "jobId": "job_4R8M2K9X",
        "jobReference": "FF-2024-00142",
        "status": "completed",
        "pickupLocation": "Sector 18, Noida, UP",
        "dropLocation": "Connaught Place, New Delhi",
        "distance": "22.4 km",
        "goodsType": "Electronics",
        "jobDate": "2024-01-20",
        "agreedAmount": 3200,
        "currency": "INR",
        "haulierName": "FastMove Logistics",
        "rating": {
          "givenToHaulier": 4,
          "receivedFromHaulier": 5
        },
        "completedAt": "2024-01-20T15:00:00Z"
      }
    ],
    "totalJobs": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## EPIC 8: Ratings & Reviews

---

### API 54 – Submit Rating (Driver rates Haulier)

```
POST /api/v1/ratings/submit
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "jobId": "job_4R8M2K9X",
  "bookingId": "bkg_7X3K9P2M",
  "ratedUserId": "usr_H7K2L9P1",
  "starRating": 4,
  "review": "Good experience overall. Clear instructions and prompt payment.",
  "tags": [
    "clear_instructions",
    "prompt_payment",
    "professional"
  ]
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 201,
  "message": "Rating submitted successfully. Thank you for your feedback.",
  "data": {
    "ratingId": "rat_7P2M9K3X",
    "jobId": "job_4R8M2K9X",
    "ratedUserId": "usr_H7K2L9P1",
    "starRating": 4,
    "review": "Good experience overall.",
    "submittedAt": "2024-01-20T15:45:00Z"
  }
}
```

**Response – Job Not Completed:**
```json
{
  "status": false,
  "code": 400,
  "message": "You can only rate after job is completed.",
  "data": null
}
```

**Response – Already Rated:**
```json
{
  "status": false,
  "code": 409,
  "message": "You have already submitted a rating for this job.",
  "data": null
}
```

---

### API 55 – View My Ratings (Driver)

```
GET /api/v1/ratings/user/usr_01J8K2X9P?page=1&limit=10
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Ratings fetched successfully.",
  "data": {
    "userId": "usr_01J8K2X9P",
    "name": "John Doe",
    "averageRating": 4.5,
    "totalRatings": 28,
    "ratingBreakdown": {
      "5_star": 16,
      "4_star": 8,
      "3_star": 3,
      "2_star": 1,
      "1_star": 0
    },
    "topTags": [
      "on_time",
      "professional",
      "careful_with_goods"
    ],
    "ratings": [
      {
        "ratingId": "rat_3K9M7X2P",
        "jobReference": "FF-2024-00142",
        "ratedBy": {
          "name": "FastMove Logistics",
          "role": "haulier"
        },
        "starRating": 5,
        "review": "Excellent driver. Very professional.",
        "tags": ["on_time", "professional"],
        "submittedAt": "2024-01-20T15:30:00Z"
      }
    ],
    "page": 1,
    "limit": 10
  }
}
```

---

### API 56 – Get Rating Summary (Driver)

```
GET /api/v1/ratings/summary/usr_01J8K2X9P
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Rating summary fetched successfully.",
  "data": {
    "userId": "usr_01J8K2X9P",
    "averageRating": 4.5,
    "totalRatings": 28,
    "ratingBreakdown": {
      "5_star": 16,
      "4_star": 8,
      "3_star": 3,
      "2_star": 1,
      "1_star": 0
    },
    "topTags": [
      "on_time",
      "professional",
      "careful_with_goods"
    ],
    "recentTrend": "improving",
    "last5RatingsAverage": 4.8
  }
}
```

---

## Notifications (Driver)

---

### API 57 – Get All Notifications (Driver)

```
GET /api/v1/notifications/list?page=1&limit=20
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Notifications fetched successfully.",
  "data": {
    "notifications": [
      {
        "notificationId": "ntf_7K2M9X3P",
        "type": "job_update",
        "title": "Quote Selected!",
        "message": "FastMove Logistics selected your quote for job FF-2024-00158. Payment is secured.",
        "isRead": false,
        "data": {
          "jobId": "job_9M2K7X3P",
          "jobReference": "FF-2024-00158"
        },
        "createdAt": "2024-01-20T17:30:00Z"
      },
      {
        "notificationId": "ntf_3P9X7K2M",
        "type": "payment",
        "title": "Payment Released",
        "message": "INR 3,200 has been released to your account for job FF-2024-00142.",
        "isRead": true,
        "data": {
          "paymentId": "pay_5M8K3X9P",
          "amount": 3200
        },
        "createdAt": "2024-01-20T15:01:00Z"
      },
      {
        "notificationId": "ntf_9M2K3X7P",
        "type": "compliance",
        "title": "Haulier Signed",
        "message": "FastMove Logistics has signed the vehicle handover. Trip is now In Transit.",
        "isRead": true,
        "data": {
          "jobId": "job_4R8M2K9X",
          "jobReference": "FF-2024-00142"
        },
        "createdAt": "2024-01-20T09:10:00Z"
      }
    ],
    "totalNotifications": 3,
    "unreadCount": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

### API 58 – Unread Count (Driver)

```
GET /api/v1/notifications/unread-count
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Unread count fetched successfully.",
  "data": {
    "unreadCount": 3,
    "breakdown": {
      "job_update": 2,
      "payment": 1,
      "compliance": 0,
      "system": 0
    }
  }
}
```

---

### API 59 – Mark Single Notification Read (Driver)

```
PUT /api/v1/notifications/mark-read/ntf_7K2M9X3P
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Notification marked as read.",
  "data": {
    "notificationId": "ntf_7K2M9X3P",
    "isRead": true,
    "readAt": "2024-01-20T18:00:00Z"
  }
}
```

---

### API 60 – Mark All Notifications Read (Driver)

```
PUT /api/v1/notifications/mark-all-read
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "All notifications marked as read.",
  "data": {
    "totalMarked": 3,
    "markedAt": "2024-01-20T18:05:00Z"
  }
}
```

---

### API 61 – Update Notification Preferences (Driver)

```
PUT /api/v1/notifications/preferences/update
Authorization: Bearer <driver-token>
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
  "smsNotifications": {
    "enabled": true,
    "job_updates": true,
    "payment_updates": true
  }
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Notification preferences updated successfully.",
  "data": {
    "userId": "usr_01J8K2X9P",
    "updatedAt": "2024-01-20T18:10:00Z"
  }
}
```

---

### API 62 – Register FCM Token (Driver)

```
POST /api/v1/notifications/fcm-token/register
Authorization: Bearer <driver-token>
Content-Type: application/json
```

**Request:**
```json
{
  "fcmToken": "dGhpcyBpcyBhbiBGQ00gdG9rZW4gZm9yIHB1c2ggbm90aWZpY2F0aW9ucw...",
  "deviceType": "android",
  "deviceId": "device_9K2M3X7P"
}
```

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "FCM token registered successfully.",
  "data": {
    "userId": "usr_01J8K2X9P",
    "deviceId": "device_9K2M3X7P",
    "deviceType": "android",
    "registeredAt": "2024-01-20T18:15:00Z"
  }
}
```

---

## File Management (Driver)

---

### API 63 – Upload Single File (Driver)

```
POST /api/v1/files/upload
Authorization: Bearer <driver-token>
Content-Type: multipart/form-data
```

**Request:**
```
file: <file>
fileType: "document"
folder: "driver_docs"
```

**Response – Success:**
```json
{
  "status": true,
  "code": 201,
  "message": "File uploaded successfully.",
  "data": {
    "fileId": "fil_9K3M7X2P",
    "fileName": "insurance_document.pdf",
    "fileType": "document",
    "mimeType": "application/pdf",
    "fileSize": "1.8 MB",
    "fileUrl": "https://cdn.freightflex.com/driver_docs/fil_9K3M7X2P.pdf",
    "uploadedAt": "2024-01-20T18:20:00Z"
  }
}
```

**Response – File Too Large:**
```json
{
  "status": false,
  "code": 400,
  "message": "File size exceeds 10MB limit.",
  "data": null
}
```

---

### API 64 – Upload Multiple Files (Driver)

```
POST /api/v1/files/upload-multiple
Authorization: Bearer <driver-token>
Content-Type: multipart/form-data
```

**Request:**
```
files: [<file1>, <file2>, <file3>]
fileType: "image"
folder: "handover_photos"
```

**Response – Success:**
```json
{
  "status": true,
  "code": 201,
  "message": "Files uploaded successfully.",
  "data": {
    "uploadedFiles": [
      {
        "fileId": "fil_2P9K7M3X",
        "fileName": "front_view.jpg",
        "fileUrl": "https://cdn.freightflex.com/handover_photos/fil_2P9K7M3X.jpg",
        "fileSize": "1.2 MB"
      },
      {
        "fileId": "fil_7M3X9K2P",
        "fileName": "rear_view.jpg",
        "fileUrl": "https://cdn.freightflex.com/handover_photos/fil_7M3X9K2P.jpg",
        "fileSize": "1.1 MB"
      },
      {
        "fileId": "fil_3X2P9M7K",
        "fileName": "left_side.jpg",
        "fileUrl": "https://cdn.freightflex.com/handover_photos/fil_3X2P9M7K.jpg",
        "fileSize": "0.9 MB"
      }
    ],
    "totalUploaded": 3,
    "uploadedAt": "2024-01-20T18:25:00Z"
  }
}
```

---

### API 65 – Get Signed File URL (Driver)

```
GET /api/v1/files/get/fil_9K3M7X2P
Authorization: Bearer <driver-token>
```

**Request:** No body

**Response – Success:**
```json
{
  "status": true,
  "code": 200,
  "message": "Signed file URL generated.",
  "data": {
    "fileId": "fil_9K3M7X2P",
    "fileName": "insurance_document.pdf",
    "signedUrl": "https://cdn.freightflex.com/driver_docs/fil_9K3M7X2P.pdf?signature=abc123&expires=1705766400",
    "urlExpiresAt": "2024-01-20T19:20:00Z",
    "mimeType": "application/pdf",
    "fileSize": "1.8 MB"
  }
}
```

---

### API 66 – WebSocket Live Notifications (Driver)

```
ws://api/v1/notifications/live
Authorization: Bearer <driver-token>
```

**Connect:**
```json
{
  "event": "connect_notifications",
  "userId": "usr_01J8K2X9P"
}
```

**New Notification (Server → Driver App):**
```json
{
  "event": "new_notification",
  "data": {
    "notificationId": "ntf_7K2M9X3P",
    "type": "job_update",
    "title": "Quote Selected!",
    "message": "FastMove Logistics selected your quote. Payment secured.",
    "data": {
      "jobId": "job_9M2K7X3P",
      "jobReference": "FF-2024-00158"
    },
    "unreadCount": 1,
    "createdAt": "2024-01-20T17:30:00Z"
  }
}
```

**Payment Notification (Server → Driver App):**
```json
{
  "event": "new_notification",
  "data": {
    "notificationId": "ntf_3P9X7K2M",
    "type": "payment",
    "title": "Payment Released",
    "message": "INR 3,200 released to your account.",
    "data": {
      "paymentId": "pay_5M8K3X9P",
      "amount": 3200,
      "currency": "INR"
    },
    "unreadCount": 2,
    "createdAt": "2024-01-20T15:01:00Z"
  }
}
```

---

## Complete Mobile API Summary

```
┌──────────────────────────────────────────────────────────────┐
│         MOBILE APP (DRIVER) – COMPLETE API SUMMARY          │
├─────────────────────────────┬────────────────────────────────┤
│  MODULE                     │  APIs                          │
├─────────────────────────────┼────────────────────────────────┤
│  Auth & Profile             │  13 APIs  (1  – 13)           │
│  Documents & Availability   │   9 APIs  (14 – 22)           │
│  Jobs & Quotes              │   6 APIs  (23 – 28)           │
│  Bookings & Payments        │   7 APIs  (29 – 35)           │
│  Compliance Workflow        │  10 APIs  (36 – 45)           │
│  Live Tracking              │   4 APIs  (46 – 49)           │
│  Driver Dashboard           │   4 APIs  (50 – 53)           │
│  Ratings & Reviews          │   3 APIs  (54 – 56)           │
│  Notifications              │   6 APIs  (57 – 62)           │
│  File Management            │   3 APIs  (63 – 65)           │
├─────────────────────────────┼────────────────────────────────┤
│  TOTAL REST APIs            │  65 APIs                       │
│  WebSocket                  │   1 WSS   (API 66)            │
│  GRAND TOTAL                │  66 Endpoints                  │
└─────────────────────────────┴────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              STANDARD RESPONSE FORMAT                        │
├──────────────────────────────────────────────────────────────┤
│  {                                                           │
│    "status":  true / false                                   │
│    "code":    HTTP Status Code                               │
│    "message": Human readable message                         │
│    "data":    Response payload / null                        │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              HTTP STATUS CODES USED                          │
├────────────┬─────────────────────────────────────────────────┤
│  200       │  Success                                        │
│  201       │  Created Successfully                           │
│  400       │  Bad Request / Validation Error                 │
│  401       │  Unauthorized / Invalid Token                   │
│  403       │  Forbidden / Account Suspended                  │
│  404       │  Not Found                                      │
│  409       │  Conflict / Duplicate                           │
│  422       │  Unprocessable Entity                           │
│  503       │  Service Unavailable                            │
└────────────┴─────────────────────────────────────────────────┘
```