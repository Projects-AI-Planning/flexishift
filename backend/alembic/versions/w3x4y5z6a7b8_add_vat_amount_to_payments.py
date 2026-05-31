"""add vat_amount to payments

Revision ID: w3x4y5z6a7b8
Revises: v2w3x4y5z6a7
Create Date: 2026-05-31

"""
from alembic import op
import sqlalchemy as sa

revision = 'w3x4y5z6a7b8'
down_revision = 'v2w3x4y5z6a7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'payments',
        sa.Column('vat_amount', sa.DECIMAL(12, 2), nullable=True),
    )


def downgrade():
    op.drop_column('payments', 'vat_amount')
