"""
FreightFlex – Application Enums
Centralised enum definitions – Single Responsibility Principle
All enums used across models, schemas, and services defined here
"""

from enum import Enum


# ── User Enums ────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    """
    Defines the three user roles in the platform.
    str mixin allows direct use in SQLAlchemy ENUM and JSON serialization.
    """
    DRIVER  = "DRIVER"
    HAULIER = "HAULIER"
    FIRM    = "FIRM"
    ADMIN   = "ADMIN"


class UserStatus(str, Enum):
    """
    Lifecycle status of a user account.
    INACTIVE  – registered but email not verified
    ACTIVE    – verified and fully operational
    SUSPENDED – blocked by admin
    """
    INACTIVE  = "INACTIVE"
    ACTIVE    = "ACTIVE"
    SUSPENDED = "SUSPENDED"


# ── Document Enums ────────────────────────────────────────────────────────────

class DocumentType(str, Enum):
    """
    Types of documents a supplier can upload for verification.
    """
    DRIVING_LICENCE   = "DRIVING_LICENCE"
    VEHICLE_REG       = "VEHICLE_REG"
    VEHICLE_INSURANCE = "VEHICLE_INSURANCE"
    COMPANY_REG       = "COMPANY_REG"
    FLEET_INSURANCE   = "FLEET_INSURANCE"


class DocumentStatus(str, Enum):
    """
    Admin review status of an uploaded document.
    """
    PENDING  = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ── Job Enums ─────────────────────────────────────────────────────────────────

class JobStatus(str, Enum):
    """
    Full lifecycle status of a freight job (FSM).
    Transitions enforced in job_service.py.

    OPEN               – posted, accepting quotes
    BOOKED             – supplier selected
    PAYMENT_PENDING    – haulier initiated payment
    PAYMENT_SECURED    – escrow funded (webhook confirmed)
    IN_TRANSIT         – compliance step 2 complete, driving
    DELIVERY_SUBMITTED – driver submitted delivery report
    COMPLETED          – haulier approved, payment released
    DISPUTED           – haulier raised dispute
    CANCELLED          – cancelled at any pre-transit stage
    """
    OPEN               = "OPEN"
    BOOKED             = "BOOKED"
    PAYMENT_PENDING    = "PAYMENT_PENDING"
    PAYMENT_SECURED    = "PAYMENT_SECURED"
    IN_TRANSIT         = "IN_TRANSIT"
    DELIVERY_SUBMITTED = "DELIVERY_SUBMITTED"
    COMPLETED          = "COMPLETED"
    DISPUTED           = "DISPUTED"
    CANCELLED          = "CANCELLED"


class TimeSlot(str, Enum):
    """
    Available time slots for a freight job.
    """
    MORNING   = "MORNING"       # 06:00 – 12:00
    AFTERNOON = "AFTERNOON"     # 12:00 – 17:00
    EVENING   = "EVENING"       # 17:00 – 22:00
    FULL_DAY  = "FULL_DAY"      # 06:00 – 22:00


class VehicleType(str, Enum):
    """
    Types of vehicles available on the platform.
    """
    HGV         = "HGV"         # Heavy Goods Vehicle
    LGV         = "LGV"         # Light Goods Vehicle
    VAN         = "VAN"
    FLATBED     = "FLATBED"
    TANKER      = "TANKER"
    REFRIGERATED = "REFRIGERATED"


# ── Quote Enums ───────────────────────────────────────────────────────────────

class QuoteStatus(str, Enum):
    """
    Status of a supplier quote on a job.
    ACTIVE    – submitted, awaiting haulier decision
    SELECTED  – chosen by haulier
    REJECTED  – another supplier was selected
    WITHDRAWN – supplier withdrew their quote
    """
    ACTIVE    = "ACTIVE"
    SELECTED  = "SELECTED"
    REJECTED  = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


# ── Payment Enums ─────────────────────────────────────────────────────────────

class PaymentStatus(str, Enum):
    """
    Status of the escrow payment for a job.
    PENDING  – payment order created, awaiting completion
    ESCROWED – funds captured and held in nodal account
    RELEASED – payout sent to supplier bank account
    FAILED   – payment failed at gateway
    REFUNDED – funds returned to haulier
    """
    PENDING  = "PENDING"
    ESCROWED = "ESCROWED"
    RELEASED = "RELEASED"
    FAILED   = "FAILED"
    REFUNDED = "REFUNDED"


class PaymentMethod(str, Enum):
    """
    Supported payment methods.
    """
    UPI           = "UPI"
    CARD          = "CARD"
    BANK_TRANSFER = "BANK_TRANSFER"


class Currency(str, Enum):
    """
    Supported currencies.
    """
    INR = "INR"
    GBP = "GBP"
    USD = "USD"


# ── Compliance Enums ──────────────────────────────────────────────────────────

class ComplianceStep(str, Enum):
    """
    Three steps of the compliance workflow.
    """
    STEP_1_LOAD_CODE = "STEP_1_LOAD_CODE"
    STEP_2_HANDOVER  = "STEP_2_HANDOVER"
    STEP_3_DELIVERY  = "STEP_3_DELIVERY"


class DisputeOutcome(str, Enum):
    """
    Resolution outcome of a disputed job.
    SUPPLIER – resolved in supplier's favour (payment released)
    HAULIER  – resolved in haulier's favour (refund triggered)
    """
    SUPPLIER = "SUPPLIER"
    HAULIER  = "HAULIER"


# ── Notification Enums ────────────────────────────────────────────────────────

class NotificationType(str, Enum):
    """
    All notification event types in the platform.
    Maps to FR-NOT-01 through FR-NOT-10.
    """
    EMAIL_VERIFICATION        = "EMAIL_VERIFICATION"
    DOCUMENT_STATUS_UPDATE    = "DOCUMENT_STATUS_UPDATE"
    NEW_QUOTE_RECEIVED        = "NEW_QUOTE_RECEIVED"
    BOOKING_CONFIRMATION      = "BOOKING_CONFIRMATION"
    NOT_SELECTED              = "NOT_SELECTED"
    PAYMENT_SECURED           = "PAYMENT_SECURED"
    DELIVERY_APPROVAL_REQUIRED = "DELIVERY_APPROVAL_REQUIRED"
    PAYMENT_RELEASED          = "PAYMENT_RELEASED"
    DELAY_ALERT               = "DELAY_ALERT"
    RATING_PROMPT             = "RATING_PROMPT"
    DISPUTE_RAISED            = "DISPUTE_RAISED"
    DISPUTE_RESOLVED          = "DISPUTE_RESOLVED"


class NotificationChannel(str, Enum):
    """
    Delivery channels for notifications.
    """
    EMAIL  = "EMAIL"
    PUSH   = "PUSH"
    IN_APP = "IN_APP"


# ── Availability Enums ────────────────────────────────────────────────────────

class DayOfWeek(int, Enum):
    """
    Day of week mapping for availability slots.
    0 = Monday, 6 = Sunday (ISO standard).
    """
    MONDAY    = 0
    TUESDAY   = 1
    WEDNESDAY = 2
    THURSDAY  = 3
    FRIDAY    = 4
    SATURDAY  = 5
    SUNDAY    = 6


# ── WebSocket Enums ───────────────────────────────────────────────────────────

class WSEventType(str, Enum):
    """
    WebSocket event types for GPS tracking.
    Client → Server and Server → Client events.
    """
    # Client → Server
    JOIN_JOB_ROOM    = "join_job_room"
    LEAVE_JOB_ROOM   = "leave_job_room"
    LOCATION_UPDATE  = "location_update"

    # Server → Client
    LOCATION_UPDATED = "location_updated"
    ETA_UPDATED      = "eta_updated"
    DELAY_ALERT      = "delay_alert"
    JOB_STATUS_CHANGED = "job_status_changed"


# ── Admin Enums ───────────────────────────────────────────────────────────────

class AdminAction(str, Enum):
    """
    Actions an admin can perform on a document or user.
    """
    APPROVE   = "APPROVE"
    REJECT    = "REJECT"
    SUSPEND   = "SUSPEND"
    REINSTATE = "REINSTATE"
    VERIFY    = "VERIFY"


# ── Job FSM Allowed Transitions ───────────────────────────────────────────────

JOB_STATUS_TRANSITIONS: dict[JobStatus, list[JobStatus]] = {
    JobStatus.OPEN: [
        JobStatus.BOOKED,
        JobStatus.CANCELLED,
    ],
    JobStatus.BOOKED: [
        JobStatus.PAYMENT_PENDING,
        JobStatus.CANCELLED,
    ],
    JobStatus.PAYMENT_PENDING: [
        JobStatus.PAYMENT_SECURED,
        JobStatus.BOOKED,
    ],
    JobStatus.PAYMENT_SECURED: [
        JobStatus.IN_TRANSIT,
        JobStatus.CANCELLED,
    ],
    JobStatus.IN_TRANSIT: [
        JobStatus.DELIVERY_SUBMITTED,
    ],
    JobStatus.DELIVERY_SUBMITTED: [
        JobStatus.COMPLETED,
        JobStatus.DISPUTED,
    ],
    JobStatus.DISPUTED: [
        JobStatus.COMPLETED,
        JobStatus.CANCELLED,
    ],
    JobStatus.COMPLETED: [],
    JobStatus.CANCELLED: [],
}