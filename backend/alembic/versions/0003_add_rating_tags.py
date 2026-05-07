"""add tags column to ratings

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not _column_exists("ratings", "tags"):
        op.add_column("ratings", sa.Column("tags", sa.JSON(), nullable=True))


def downgrade() -> None:
    if _column_exists("ratings", "tags"):
        op.drop_column("ratings", "tags")
