"""add country to jobs and shifts (and merge open heads)

Adds a `country` column to jobs and shifts so that listings can be isolated by
country: a job/shift posted in one country must not be visible to drivers in
another country. Existing rows are backfilled from their haulier's country.

This revision also acts as a merge point for the previously branched alembic
heads so that `alembic upgrade head` resolves to a single head again.

Revision ID: h4i5j6k7l8m9
Create Date: 2026-06-16

"""
from alembic import op
import sqlalchemy as sa

revision = 'h4i5j6k7l8m9'
down_revision = (
    'c6d7e8f9a0b1',
    '0010',
    'w3x4y5z6a7b8',
    'g3h4i5j6k7l8',
    '0015',
    '0009',
    'b1c2d3e4f5a6',
)
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('jobs', sa.Column('country', sa.String(2), nullable=True, server_default='GB'))
    op.add_column('shifts', sa.Column('country', sa.String(2), nullable=True, server_default='GB'))

    # Backfill existing rows from the haulier's country (fall back to GB).
    op.execute(
        "UPDATE jobs j JOIN users u ON j.haulier_id = u.id "
        "SET j.country = COALESCE(UPPER(u.country), 'GB')"
    )
    op.execute(
        "UPDATE shifts s JOIN users u ON s.haulier_id = u.id "
        "SET s.country = COALESCE(UPPER(u.country), 'GB')"
    )


def downgrade():
    op.drop_column('shifts', 'country')
    op.drop_column('jobs', 'country')
