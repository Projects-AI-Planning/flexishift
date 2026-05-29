"""add deliver_by and stop_etas to quotes

Revision ID: o5p6q7r8s9t0
Revises: n4o5p6q7r8s9
Create Date: 2026-05-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'o5p6q7r8s9t0'
down_revision = 'n4o5p6q7r8s9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('quotes', sa.Column('deliver_by', sa.DateTime(), nullable=True))
    op.add_column('quotes', sa.Column('stop_etas', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('quotes', 'stop_etas')
    op.drop_column('quotes', 'deliver_by')
