"""add access_code to jobs

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-25 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    cols = [r[0] for r in conn.execute(sa.text("SHOW COLUMNS FROM jobs LIKE 'access_code'"))]
    if not cols:
        op.add_column('jobs', sa.Column('access_code', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('jobs', 'access_code')
