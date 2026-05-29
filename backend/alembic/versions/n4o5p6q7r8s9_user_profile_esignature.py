"""user_profile_esignature

Revision ID: n4o5p6q7r8s9
Revises: m3n4o5p6q7r8
Create Date: 2026-05-27 00:00:02.000000

Adds esignature_data MEDIUMTEXT to user_profiles so hauliers and drivers
can store a persistent e-signature that auto-fills handover signing flows.
"""

from alembic import op
import sqlalchemy as sa

revision = 'n4o5p6q7r8s9'
down_revision = 'm3n4o5p6q7r8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'user_profiles',
        sa.Column('esignature_data', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('user_profiles', 'esignature_data')
