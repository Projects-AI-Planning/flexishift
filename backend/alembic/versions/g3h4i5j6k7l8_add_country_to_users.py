"""add country to users

Revision ID: g3h4i5j6k7l8
Revises: f1a2b3c4d5e6
Create Date: 2026-05-26

"""
from alembic import op
import sqlalchemy as sa

revision = 'g3h4i5j6k7l8'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('country', sa.String(2), nullable=True, server_default='GB'))


def downgrade():
    op.drop_column('users', 'country')
