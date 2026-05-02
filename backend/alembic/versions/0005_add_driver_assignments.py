"""add driver assignments

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-01
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("driver_assignments", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("user_profiles", "driver_assignments")
