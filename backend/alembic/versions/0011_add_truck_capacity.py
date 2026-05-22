"""add truck_capacity to user_profiles

Revision ID: 0011
Revises: b0b31321fd47, 0010
Create Date: 2026-05-21 00:00:00.000000+00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = ("b0b31321fd47", "0010")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("truck_capacity", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("user_profiles", "truck_capacity")
