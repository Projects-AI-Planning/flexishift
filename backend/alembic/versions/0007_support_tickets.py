"""add support tickets table

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def _table_exists(table: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    return table in insp.get_table_names()


def upgrade() -> None:
    if _table_exists("support_tickets"):
        return  # already exists, skip

    op.create_table(
        "support_tickets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("requester_name", sa.String(200), nullable=False),
        sa.Column("requester_email", sa.String(320), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column(
            "priority",
            sa.Enum("LOW", "MEDIUM", "HIGH", "URGENT", name="supportticketpriority"),
            nullable=False,
            server_default="MEDIUM",
        ),
        sa.Column("subject", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.Enum("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", name="supportticketstatus"),
            nullable=False,
            server_default="OPEN",
        ),
        sa.Column("assigned_admin_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolution_notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.Column("resolved_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_support_tickets_status", "support_tickets", ["status"])
    op.create_index("ix_support_tickets_priority", "support_tickets", ["priority"])
    op.create_index("ix_support_tickets_created_at", "support_tickets", ["created_at"])


def downgrade() -> None:
    if not _table_exists("support_tickets"):
        return
    op.drop_index("ix_support_tickets_created_at", table_name="support_tickets")
    op.drop_index("ix_support_tickets_priority", table_name="support_tickets")
    op.drop_index("ix_support_tickets_status", table_name="support_tickets")
    op.drop_table("support_tickets")
