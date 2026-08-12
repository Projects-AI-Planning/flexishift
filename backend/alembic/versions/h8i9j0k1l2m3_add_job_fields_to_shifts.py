"""add_job_fields_to_shifts

Revision ID: h8i9j0k1l2m3
Revises: 7db758afc6bd
Create Date: 2026-05-27 12:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'h8i9j0k1l2m3'
down_revision: Union[str, None] = '7db758afc6bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('shifts', sa.Column('pickup_lat',           sa.DECIMAL(10, 7),  nullable=True))
    op.add_column('shifts', sa.Column('pickup_lng',           sa.DECIMAL(10, 7),  nullable=True))
    op.add_column('shifts', sa.Column('drop_lat',             sa.DECIMAL(10, 7),  nullable=True))
    op.add_column('shifts', sa.Column('drop_lng',             sa.DECIMAL(10, 7),  nullable=True))
    op.add_column('shifts', sa.Column('goods_type',           sa.String(100),     nullable=True))
    op.add_column('shifts', sa.Column('total_capacity',       sa.DECIMAL(10, 2),  nullable=True))
    op.add_column('shifts', sa.Column('compartments',         sa.Integer(),       nullable=True))
    op.add_column('shifts', sa.Column('compartment_details',  sa.JSON(),          nullable=True))
    op.add_column('shifts', sa.Column('stops',                sa.JSON(),          nullable=True))
    op.add_column('shifts', sa.Column('access_code',          sa.String(50),      nullable=True))
    op.add_column('shifts', sa.Column('load_code',            sa.String(20),      nullable=True))
    op.add_column('shifts', sa.Column('job_time',             sa.String(10),      nullable=True))
    op.add_column('shifts', sa.Column('special_instructions', sa.Text(),          nullable=True))
    op.add_column('shifts', sa.Column('distance_km',          sa.DECIMAL(10, 2),  nullable=True))
    op.add_column('shifts', sa.Column('duration_min',         sa.Integer(),       nullable=True))


def downgrade() -> None:
    for col in [
        'duration_min', 'distance_km', 'special_instructions', 'job_time',
        'load_code', 'access_code', 'stops', 'compartment_details',
        'compartments', 'total_capacity', 'goods_type',
        'drop_lng', 'drop_lat', 'pickup_lng', 'pickup_lat',
    ]:
        op.drop_column('shifts', col)
