"""add tags column to ratings

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ratings", sa.Column("tags", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("ratings", "tags")
