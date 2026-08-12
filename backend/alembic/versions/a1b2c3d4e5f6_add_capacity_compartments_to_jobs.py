"""add total_capacity and compartments to jobs

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-05-25 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('total_capacity', sa.DECIMAL(10, 2), nullable=True))
    op.add_column('jobs', sa.Column('compartments', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('jobs', 'compartments')
    op.drop_column('jobs', 'total_capacity')
