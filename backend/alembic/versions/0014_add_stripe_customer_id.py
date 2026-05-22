"""add stripe_customer_id to users

Revision ID: 0014
Revises: 0013
Create Date: 2026-05-23
"""

from alembic import op
import sqlalchemy as sa

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("stripe_customer_id", sa.String(100), nullable=True),
    )


def downgrade():
    op.drop_column("users", "stripe_customer_id")
