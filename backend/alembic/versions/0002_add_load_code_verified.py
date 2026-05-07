"""add load_code_verified_at to compliance_records

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not _column_exists("compliance_records", "load_code_verified_at"):
        op.add_column(
            "compliance_records",
            sa.Column("load_code_verified_at", sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    if _column_exists("compliance_records", "load_code_verified_at"):
        op.drop_column("compliance_records", "load_code_verified_at")
