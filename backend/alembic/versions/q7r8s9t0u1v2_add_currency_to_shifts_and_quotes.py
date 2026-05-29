"""add currency to shifts and shift_quotes

Revision ID: q7r8s9t0u1v2
Revises: p6q7r8s9t0u1
Create Date: 2026-05-29

"""
from alembic import op
import sqlalchemy as sa

revision = 'q7r8s9t0u1v2'
down_revision = 'p6q7r8s9t0u1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('shifts',
        sa.Column('currency', sa.String(3), nullable=True, server_default='GBP'))
    op.add_column('shift_quotes',
        sa.Column('currency', sa.String(3), nullable=True, server_default='GBP'))


def downgrade() -> None:
    op.drop_column('shifts', 'currency')
    op.drop_column('shift_quotes', 'currency')
