"""add fleet equipment details

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not _column_exists("user_profiles", "equipment_details"):
        op.add_column("user_profiles", sa.Column("equipment_details", sa.JSON(), nullable=True))


def downgrade() -> None:
    if _column_exists("user_profiles", "equipment_details"):
        op.drop_column("user_profiles", "equipment_details")
