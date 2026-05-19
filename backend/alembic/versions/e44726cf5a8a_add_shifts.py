"""add_shifts

Revision ID: e44726cf5a8a
Revises: c2df54d96545
Create Date: 2026-05-18 17:41:25.125888+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'e44726cf5a8a'
down_revision: Union[str, None] = 'c2df54d96545'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('shifts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('haulier_id', sa.String(length=36), nullable=False),
        sa.Column('shift_ref', sa.String(length=20), nullable=False),
        sa.Column('requirement_type', sa.Enum('DRIVER_ONLY', 'TRUCK_WITH_DRIVER', 'TRUCK_ONLY', name='requirementtype'), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('total_days', sa.Integer(), nullable=False),
        sa.Column('hours_per_day', sa.Integer(), nullable=False),
        sa.Column('location', sa.Text(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('daily_rate', sa.DECIMAL(precision=10, scale=2), nullable=True),
        sa.Column('status', sa.Enum('OPEN', 'BOOKED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', name='shiftstatus'), nullable=False),
        sa.Column('selected_driver_id', sa.String(length=36), nullable=True),
        sa.Column('days_completed', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['haulier_id'], ['users.id']),
        sa.ForeignKeyConstraint(['selected_driver_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('shift_ref'),
    )
    op.create_table('shift_quotes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('shift_id', sa.String(length=36), nullable=False),
        sa.Column('driver_id', sa.String(length=36), nullable=False),
        sa.Column('amount_per_day', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('total_amount', sa.DECIMAL(precision=10, scale=2), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', name='shiftquotestatus'), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['driver_id'], ['users.id']),
        sa.ForeignKeyConstraint(['shift_id'], ['shifts.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('shift_quotes')
    op.drop_table('shifts')
