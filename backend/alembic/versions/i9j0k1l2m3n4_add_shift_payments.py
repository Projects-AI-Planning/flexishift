"""add_shift_payments

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-05-27 16:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'i9j0k1l2m3n4'
down_revision: Union[str, None] = 'h8i9j0k1l2m3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'shift_payments',
        sa.Column('id',                 sa.String(36),   primary_key=True),
        sa.Column('shift_id',           sa.String(36),   sa.ForeignKey('shifts.id'),       nullable=False, unique=True),
        sa.Column('quote_id',           sa.String(36),   sa.ForeignKey('shift_quotes.id'), nullable=False),
        sa.Column('gateway_order_id',   sa.String(100),  nullable=False),
        sa.Column('gateway_payment_id', sa.String(100),  nullable=True),
        sa.Column('amount',             sa.DECIMAL(12, 2), nullable=False),
        sa.Column('currency',           sa.String(3),    nullable=False, server_default='USD'),
        sa.Column('status',             sa.Enum('PENDING', 'ESCROWED', 'RELEASED', 'FAILED', 'REFUNDED',
                                                name='shiftpaymentstatus'), nullable=False, server_default='PENDING'),
        sa.Column('escrowed_at',        sa.DateTime,     nullable=True),
        sa.Column('created_at',         sa.DateTime,     server_default=sa.func.now()),
        sa.Column('updated_at',         sa.DateTime,     server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('shift_payments')
    op.execute("DROP TYPE IF EXISTS shiftpaymentstatus")
