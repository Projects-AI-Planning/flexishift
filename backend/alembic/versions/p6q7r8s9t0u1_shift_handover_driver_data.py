"""add driver handover data columns to shifts

Revision ID: p6q7r8s9t0u1
Revises: o5p6q7r8s9t0
Create Date: 2026-05-29
"""
from alembic import op
import sqlalchemy as sa

revision = 'p6q7r8s9t0u1'
down_revision = 'o5p6q7r8s9t0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('shifts', sa.Column('handover_checklist_data', sa.JSON(), nullable=True))
    op.add_column('shifts', sa.Column('handover_photo_urls', sa.JSON(), nullable=True))
    op.add_column('shifts', sa.Column('handover_driver_signature', sa.Text(), nullable=True))
    op.add_column('shifts', sa.Column('handover_submitted_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('shifts', 'handover_submitted_at')
    op.drop_column('shifts', 'handover_driver_signature')
    op.drop_column('shifts', 'handover_photo_urls')
    op.drop_column('shifts', 'handover_checklist_data')
