"""add_vat_organisation_to_user_profiles

Revision ID: cf46bd6c4014
Revises: c6d7e8f9a0b1
Create Date: 2026-06-10 20:52:09.032525+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'cf46bd6c4014'
down_revision: Union[str, None] = 'c6d7e8f9a0b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user_profiles', sa.Column('vat_number', sa.String(length=50), nullable=True))
    op.add_column('user_profiles', sa.Column('organisation_number', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('user_profiles', 'organisation_number')
    op.drop_column('user_profiles', 'vat_number')
