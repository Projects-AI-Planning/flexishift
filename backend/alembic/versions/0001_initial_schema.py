"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-25 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("password_hash", sa.String(60), nullable=False),
        sa.Column("role", sa.Enum("DRIVER", "HAULIER", "FIRM", "ADMIN", name="role"), nullable=False),
        sa.Column("status", sa.Enum("INACTIVE", "ACTIVE", "SUSPENDED", name="userstatus"), nullable=False, server_default="INACTIVE"),
        sa.Column("profile_complete", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("verified", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("avg_rating", sa.DECIMAL(3, 2), server_default="0.00"),
        sa.Column("completed_jobs", sa.Integer, server_default="0"),
        sa.Column("location_lat", sa.DECIMAL(10, 7), nullable=True),
        sa.Column("location_lng", sa.DECIMAL(10, 7), nullable=True),
        sa.Column("bank_account_id", sa.String(100), nullable=True),
        sa.Column("push_token", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role_status", "users", ["role", "status"])

    op.create_table(
        "user_profiles",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("photo_url", sa.String(500), nullable=True),
        sa.Column("licence_number", sa.String(50), nullable=True),
        sa.Column("vehicle_type", sa.String(50), nullable=True),
        sa.Column("vehicle_registration", sa.String(20), nullable=True),
        sa.Column("company_name", sa.String(200), nullable=True),
        sa.Column("company_address", sa.String(500), nullable=True),
        sa.Column("coverage_area", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "email_verifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime, nullable=False),
        sa.Column("used_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_email_verifications_token_hash", "email_verifications", ["token_hash"])

    op.create_table(
        "password_resets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime, nullable=False),
        sa.Column("used_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_password_resets_token_hash", "password_resets", ["token_hash"])

    op.create_table(
        "documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("doc_type", sa.Enum("DRIVING_LICENCE", "VEHICLE_REG", "VEHICLE_INSURANCE", "COMPANY_REG", "FLEET_INSURANCE", name="doctype"), nullable=False),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "APPROVED", "REJECTED", name="docstatus"), nullable=False, server_default="PENDING"),
        sa.Column("reviewed_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("reviewed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_documents_user_id", "documents", ["user_id"])
    op.create_index("ix_documents_status", "documents", ["status"])

    op.create_table(
        "availability_slots",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("driver_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("day_of_week", sa.SmallInteger, nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "availability_blocks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("driver_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("block_start", sa.Date, nullable=False),
        sa.Column("block_end", sa.Date, nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("haulier_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("job_ref", sa.String(20), nullable=False, unique=True),
        sa.Column("load_code", sa.String(10), nullable=False),
        sa.Column("pickup_address", sa.Text, nullable=False),
        sa.Column("pickup_lat", sa.DECIMAL(10, 7), nullable=False),
        sa.Column("pickup_lng", sa.DECIMAL(10, 7), nullable=False),
        sa.Column("drop_address", sa.Text, nullable=False),
        sa.Column("drop_lat", sa.DECIMAL(10, 7), nullable=False),
        sa.Column("drop_lng", sa.DECIMAL(10, 7), nullable=False),
        sa.Column("goods_type", sa.String(100), nullable=False),
        sa.Column("weight_kg", sa.DECIMAL(10, 2), nullable=False),
        sa.Column("vehicle_type", sa.String(50), nullable=False),
        sa.Column("job_date", sa.Date, nullable=False),
        sa.Column("time_slot", sa.Enum("MORNING", "AFTERNOON", "EVENING", "FULL_DAY", name="timeslot"), nullable=False),
        sa.Column("distance_km", sa.DECIMAL(10, 2), nullable=True),
        sa.Column("duration_min", sa.Integer, nullable=True),
        sa.Column("status", sa.Enum("OPEN", "BOOKED", "PAYMENT_PENDING", "PAYMENT_SECURED", "IN_TRANSIT",
                                    "DELIVERY_SUBMITTED", "COMPLETED", "DISPUTED", "CANCELLED", name="jobstatus"),
                  nullable=False, server_default="OPEN"),
        sa.Column("selected_supplier_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("original_eta", sa.DateTime, nullable=True),
        sa.Column("invoice_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.Column("deleted_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_jobs_haulier_id", "jobs", ["haulier_id"])
    op.create_index("ix_jobs_status", "jobs", ["status"])
    op.create_index("ix_jobs_job_date", "jobs", ["job_date"])

    op.create_table(
        "quotes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("supplier_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("price", sa.DECIMAL(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("status", sa.Enum("ACTIVE", "SELECTED", "REJECTED", "WITHDRAWN", name="quotestatus"),
                  nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_quotes_job_id", "quotes", ["job_id"])
    op.create_index("ix_quotes_supplier_id", "quotes", ["supplier_id"])

    op.create_table(
        "payments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id"), nullable=False, unique=True),
        sa.Column("gateway_order_id", sa.String(100), nullable=False),
        sa.Column("gateway_payment_id", sa.String(100), nullable=True),
        sa.Column("gateway_payout_id", sa.String(100), nullable=True),
        sa.Column("amount", sa.DECIMAL(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("status", sa.Enum("PENDING", "ESCROWED", "RELEASED", "FAILED", "REFUNDED", name="paymentstatus"),
                  nullable=False, server_default="PENDING"),
        sa.Column("escrowed_at", sa.DateTime, nullable=True),
        sa.Column("released_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "payment_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("gateway_event_id", sa.String(100), nullable=False, unique=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("processed_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "compliance_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id"), nullable=False, unique=True),
        sa.Column("step1_completed_at", sa.DateTime, nullable=True),
        sa.Column("checklist_data", sa.JSON, nullable=True),
        sa.Column("condition_photo_urls", sa.JSON, nullable=True),
        sa.Column("driver_signature_url", sa.String(500), nullable=True),
        sa.Column("driver_signed_at", sa.DateTime, nullable=True),
        sa.Column("haulier_signature_url", sa.String(500), nullable=True),
        sa.Column("haulier_signed_at", sa.DateTime, nullable=True),
        sa.Column("step2_completed_at", sa.DateTime, nullable=True),
        sa.Column("delivery_photo_url", sa.String(500), nullable=True),
        sa.Column("recipient_signature_url", sa.String(500), nullable=True),
        sa.Column("delivery_notes", sa.Text, nullable=True),
        sa.Column("delivery_submitted_at", sa.DateTime, nullable=True),
        sa.Column("step3_approved_at", sa.DateTime, nullable=True),
        sa.Column("dispute_reason", sa.Text, nullable=True),
        sa.Column("disputed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "tracking_points",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("lat", sa.DECIMAL(10, 7), nullable=False),
        sa.Column("lng", sa.DECIMAL(10, 7), nullable=False),
        sa.Column("recorded_at", sa.DateTime, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_tracking_points_job_id", "tracking_points", ["job_id"])
    op.create_index("ix_tracking_points_recorded_at", "tracking_points", ["recorded_at"])

    op.create_table(
        "ratings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("rater_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rated_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stars", sa.SmallInteger, nullable=False),
        sa.Column("review_text", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.CheckConstraint("stars BETWEEN 1 AND 5", name="ck_rating_stars"),
    )
    op.create_index("ix_ratings_rated_id", "ratings", ["rated_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("data", sa.JSON, nullable=True),
        sa.Column("read_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_read_at", "notifications", ["read_at"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("ratings")
    op.drop_table("tracking_points")
    op.drop_table("compliance_records")
    op.drop_table("payment_events")
    op.drop_table("payments")
    op.drop_table("quotes")
    op.drop_table("jobs")
    op.drop_table("availability_blocks")
    op.drop_table("availability_slots")
    op.drop_table("documents")
    op.drop_table("password_resets")
    op.drop_table("email_verifications")
    op.drop_table("user_profiles")
    op.drop_table("users")
