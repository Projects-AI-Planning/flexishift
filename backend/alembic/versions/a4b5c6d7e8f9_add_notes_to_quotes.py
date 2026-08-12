"""add notes to quotes

Revision ID: a4b5c6d7e8f9
Revises: z3a4b5c6d7e8
Create Date: 2026-06-10

"""
from alembic import op
import sqlalchemy as sa

revision = 'a4b5c6d7e8f9'
down_revision = 'aa1bb2cc3dd4'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('quotes', sa.Column('notes', sa.String(1000), nullable=True))


def downgrade():
    op.drop_column('quotes', 'notes')
