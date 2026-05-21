"""add payment audit columns: failed_at, refunded_at, raw_payload

Revision ID: 0010
Revises: c2df54d96545
Create Date: 2026-05-20 00:00:00.000000+00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "c2df54d96545"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("failed_at", sa.DateTime, nullable=True))
    op.add_column("payments", sa.Column("refunded_at", sa.DateTime, nullable=True))
    op.add_column("payment_events", sa.Column("raw_payload", sa.Text, nullable=True))


def downgrade() -> None:
    op.drop_column("payments", "failed_at")
    op.drop_column("payments", "refunded_at")
    op.drop_column("payment_events", "raw_payload")
