"""add currency to users

Revision ID: f1a2b3c4d5e6
Revises: c2df54d96545
Create Date: 2026-05-24 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = '0014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('currency', sa.String(length=3), nullable=True, server_default='GBP'))


def downgrade() -> None:
    op.drop_column('users', 'currency')
