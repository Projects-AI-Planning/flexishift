"""shift_handover_columns

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-05-27 00:00:00.000000

Adds handover_submitted, handover_haulier_signed, handover_haulier_signed_at
to the shifts table so the driver ↔ haulier handover workflow mirrors the
job compliance flow.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'l2m3n4o5p6q7'
down_revision = 'k1l2m3n4o5p6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('shifts', sa.Column('handover_submitted', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    op.add_column('shifts', sa.Column('handover_haulier_signed', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    op.add_column('shifts', sa.Column('handover_haulier_signed_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('shifts', 'handover_haulier_signed_at')
    op.drop_column('shifts', 'handover_haulier_signed')
    op.drop_column('shifts', 'handover_submitted')
