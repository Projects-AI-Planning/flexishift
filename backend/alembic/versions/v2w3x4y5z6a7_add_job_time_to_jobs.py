"""add job_time to jobs

Revision ID: v2w3x4y5z6a7
Revises: u1v2w3x4y5z6
Create Date: 2026-05-31

"""
from alembic import op
import sqlalchemy as sa

revision = 'v2w3x4y5z6a7'
down_revision = 'u1v2w3x4y5z6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('jobs', sa.Column('job_time', sa.String(10), nullable=True))


def downgrade():
    op.drop_column('jobs', 'job_time')
