"""add driver_amount and platform_fee to payments

Revision ID: s9t0u1v2w3x4
Revises: r8s9t0u1v2w3
Create Date: 2026-05-30

"""
from alembic import op
import sqlalchemy as sa

revision = 's9t0u1v2w3x4'
down_revision = 'r8s9t0u1v2w3'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('payments', sa.Column('driver_amount', sa.DECIMAL(12, 2), nullable=True))
    op.add_column('payments', sa.Column('platform_fee', sa.DECIMAL(12, 2), nullable=True))

    # Back-fill existing rows: derive driver_amount and platform_fee from total amount
    op.execute("""
        UPDATE payments
        SET
            driver_amount = ROUND(amount / 1.125, 2),
            platform_fee  = ROUND(amount - ROUND(amount / 1.125, 2), 2)
        WHERE driver_amount IS NULL
    """)


def downgrade():
    op.drop_column('payments', 'platform_fee')
    op.drop_column('payments', 'driver_amount')
