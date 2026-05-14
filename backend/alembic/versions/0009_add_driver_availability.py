"""add driver_availability to user_profiles

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-15
"""

from alembic import op
import sqlalchemy as sa


revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_profiles",
        sa.Column("driver_availability", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_profiles", "driver_availability")
