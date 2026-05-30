"""add stripe_receipt_url to payments

Revision ID: u1v2w3x4y5z6
Revises: t0u1v2w3x4y5
Create Date: 2026-05-30

"""
from alembic import op
import sqlalchemy as sa

revision = 'u1v2w3x4y5z6'
down_revision = 't0u1v2w3x4y5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('payments', sa.Column('stripe_receipt_url', sa.String(500), nullable=True))


def downgrade():
    op.drop_column('payments', 'stripe_receipt_url')
