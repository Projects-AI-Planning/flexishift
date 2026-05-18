"""add_pickup_drop_to_shifts

Revision ID: 7db758afc6bd
Revises: e44726cf5a8a
Create Date: 2026-05-18 17:50:19.703948+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '7db758afc6bd'
down_revision: Union[str, None] = 'e44726cf5a8a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('shifts', sa.Column('pickup_address', sa.Text(), nullable=True))
    op.add_column('shifts', sa.Column('drop_address', sa.Text(), nullable=True))
    op.alter_column('shifts', 'location', existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.drop_column('shifts', 'drop_address')
    op.drop_column('shifts', 'pickup_address')
    op.alter_column('shifts', 'location', existing_type=sa.Text(), nullable=False)
