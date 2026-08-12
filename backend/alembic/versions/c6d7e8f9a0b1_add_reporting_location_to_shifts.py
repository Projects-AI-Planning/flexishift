"""add reporting_location to shifts

Revision ID: c6d7e8f9a0b1
Revises: b5c6d7e8f9a0
Create Date: 2026-06-10

"""
from alembic import op
import sqlalchemy as sa

revision = 'c6d7e8f9a0b1'
down_revision = 'b5c6d7e8f9a0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('shifts', sa.Column('reporting_location', sa.Text(), nullable=True))
    op.add_column('shifts', sa.Column('reporting_lat', sa.DECIMAL(10, 7), nullable=True))
    op.add_column('shifts', sa.Column('reporting_lng', sa.DECIMAL(10, 7), nullable=True))


def downgrade():
    op.drop_column('shifts', 'reporting_lng')
    op.drop_column('shifts', 'reporting_lat')
    op.drop_column('shifts', 'reporting_location')
