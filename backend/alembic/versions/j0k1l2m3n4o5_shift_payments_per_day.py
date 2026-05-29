"""shift_payments_per_day

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2026-05-27 18:00:00.000000+00:00

Converts shift_payments from one-per-shift to one-per-day.
- Drops the FK + unique index on shift_id
- Adds day_number, driver_amount, platform_fee, released_at columns
- Adds composite unique on (shift_id, day_number)  — also serves as the FK index
- Re-adds the FK constraint on shift_id
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'j0k1l2m3n4o5'
down_revision: Union[str, None] = 'i9j0k1l2m3n4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop FK that references shifts(id) — MySQL requires this before we can
    #    drop the unique index it backs.
    op.drop_constraint('shift_payments_ibfk_1', 'shift_payments', type_='foreignkey')

    # 2. Drop the old per-shift unique index on shift_id
    op.drop_index('shift_id', table_name='shift_payments')

    # 3. Add new per-day columns
    op.add_column('shift_payments', sa.Column('day_number',    sa.Integer(),      nullable=False, server_default='1'))
    op.add_column('shift_payments', sa.Column('driver_amount', sa.DECIMAL(12, 2), nullable=True))
    op.add_column('shift_payments', sa.Column('platform_fee',  sa.DECIMAL(12, 2), nullable=True))
    op.add_column('shift_payments', sa.Column('released_at',   sa.DateTime(),     nullable=True))

    # 4. Add composite unique on (shift_id, day_number).
    #    MySQL can use this index (with shift_id as leftmost key) to back the FK.
    op.create_unique_constraint('uq_shift_day_payment', 'shift_payments', ['shift_id', 'day_number'])

    # 5. Re-add FK on shift_id (backed by the composite unique index above)
    op.create_foreign_key(
        'shift_payments_ibfk_1', 'shift_payments',
        'shifts', ['shift_id'], ['id'],
    )


def downgrade() -> None:
    # Reverse: drop FK, drop composite unique, drop new columns,
    # restore unique index, restore FK.
    op.drop_constraint('shift_payments_ibfk_1', 'shift_payments', type_='foreignkey')
    op.drop_constraint('uq_shift_day_payment',  'shift_payments', type_='unique')
    op.drop_column('shift_payments', 'released_at')
    op.drop_column('shift_payments', 'platform_fee')
    op.drop_column('shift_payments', 'driver_amount')
    op.drop_column('shift_payments', 'day_number')
    op.create_index('shift_id', 'shift_payments', ['shift_id'], unique=True)
    op.create_foreign_key(
        'shift_payments_ibfk_1', 'shift_payments',
        'shifts', ['shift_id'], ['id'],
    )
