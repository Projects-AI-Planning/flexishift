"""add stripe_account_id to users

Revision ID: 0013
Revises: 0012
Create Date: 2026-05-23
"""

from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("stripe_account_id", sa.String(100), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("stripe_onboarding_complete", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade():
    op.drop_column("users", "stripe_onboarding_complete")
    op.drop_column("users", "stripe_account_id")
