"""add job stops column, make weight_kg and vehicle_type nullable

Revision ID: 0012
Revises: 0011
Create Date: 2026-05-21
"""

from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("jobs", sa.Column("stops", sa.JSON(), nullable=True))
    op.alter_column("jobs", "weight_kg", existing_type=sa.DECIMAL(10, 2), nullable=True)
    op.alter_column("jobs", "vehicle_type", existing_type=sa.String(50), nullable=True)


def downgrade():
    op.drop_column("jobs", "stops")
    op.alter_column("jobs", "weight_kg", existing_type=sa.DECIMAL(10, 2), nullable=False)
    op.alter_column("jobs", "vehicle_type", existing_type=sa.String(50), nullable=False)
