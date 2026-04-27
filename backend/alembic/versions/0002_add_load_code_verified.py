"""add load_code_verified_at to compliance_records

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "compliance_records",
        sa.Column("load_code_verified_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("compliance_records", "load_code_verified_at")
