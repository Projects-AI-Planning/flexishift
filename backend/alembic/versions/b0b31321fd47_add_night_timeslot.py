"""add_night_timeslot

Revision ID: b0b31321fd47
Revises: 16922c8bc3b3
Create Date: 2026-05-19 10:27:03.348120+00:00

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'b0b31321fd47'
down_revision: Union[str, None] = '16922c8bc3b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE jobs MODIFY COLUMN time_slot "
        "ENUM('MORNING','AFTERNOON','EVENING','NIGHT','FULL_DAY') "
        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE jobs MODIFY COLUMN time_slot "
        "ENUM('MORNING','AFTERNOON','EVENING','FULL_DAY') "
        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL"
    )
