"""add deliver_by_dt to jobs

Revision ID: b5c6d7e8f9a0
Revises: a4b5c6d7e8f9
Create Date: 2026-06-10

"""
from alembic import op
import sqlalchemy as sa

revision = 'b5c6d7e8f9a0'
down_revision = 'a4b5c6d7e8f9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('jobs', sa.Column('deliver_by_dt', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('jobs', 'deliver_by_dt')
