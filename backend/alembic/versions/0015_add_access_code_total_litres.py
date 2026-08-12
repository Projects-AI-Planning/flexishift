"""add access_code and total_litres to jobs

Revision ID: 0015
Revises: 0014
Create Date: 2026-05-25 00:00:00.000000+00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("access_code", sa.String(20), nullable=True))
    op.add_column("jobs", sa.Column("total_litres", sa.DECIMAL(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "access_code")
    op.drop_column("jobs", "total_litres")
