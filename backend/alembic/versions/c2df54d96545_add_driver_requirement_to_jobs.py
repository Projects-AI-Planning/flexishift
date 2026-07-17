"""add driver_requirement to jobs

Revision ID: c2df54d96545
Revises: 0009
Create Date: 2026-05-17 20:35:25.933218+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c2df54d96545'
down_revision: Union[str, None] = '0009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('driver_requirement', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('jobs', 'driver_requirement')
