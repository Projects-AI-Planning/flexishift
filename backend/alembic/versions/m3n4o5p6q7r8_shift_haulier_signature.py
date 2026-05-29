"""shift_haulier_signature

Revision ID: m3n4o5p6q7r8
Revises: l2m3n4o5p6q7
Create Date: 2026-05-27 00:00:01.000000

Adds handover_haulier_signature_data MEDIUMTEXT to shifts so the haulier's
drawn canvas signature is persisted alongside the sign-off timestamp.
"""

from alembic import op
import sqlalchemy as sa

revision = 'm3n4o5p6q7r8'
down_revision = 'l2m3n4o5p6q7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'shifts',
        sa.Column('handover_haulier_signature_data', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('shifts', 'handover_haulier_signature_data')
