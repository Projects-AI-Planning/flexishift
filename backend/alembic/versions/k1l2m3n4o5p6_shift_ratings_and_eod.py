"""shift_ratings_and_eod

Revision ID: k1l2m3n4o5p6
Revises: 0015, d4e5f6a7b8c9, g3h4i5j6k7l8, j0k1l2m3n4o5
Create Date: 2026-05-28 10:00:00.000000+00:00

- Makes ratings.job_id nullable (shifts have no job_id)
- Adds ratings.shift_id nullable FK → shifts(id)
- Adds shift_day_proofs table for driver end-of-day submissions
- Adds shifts.access_code_verified column
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'k1l2m3n4o5p6'
down_revision: Union[str, Sequence[str]] = ('0015', 'd4e5f6a7b8c9', 'g3h4i5j6k7l8', 'j0k1l2m3n4o5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Make ratings.job_id nullable so shift ratings can omit it
    op.alter_column('ratings', 'job_id', existing_type=sa.String(36), nullable=True)

    # 2. Add shift_id FK on ratings
    op.add_column('ratings', sa.Column('shift_id', sa.String(36), nullable=True))
    op.create_foreign_key(
        'ratings_shift_fk', 'ratings', 'shifts', ['shift_id'], ['id'],
        ondelete='SET NULL',
    )

    # 3. Track access-code verification on the shift itself
    op.add_column('shifts', sa.Column(
        'access_code_verified', sa.Boolean(), nullable=False, server_default='0',
    ))

    # 4. Driver end-of-day proof table
    op.create_table(
        'shift_day_proofs',
        sa.Column('id',               sa.String(36),  primary_key=True),
        sa.Column('shift_id',         sa.String(36),  sa.ForeignKey('shifts.id'), nullable=False),
        sa.Column('day_number',       sa.Integer(),   nullable=False),
        sa.Column('driver_id',        sa.String(36),  sa.ForeignKey('users.id'), nullable=False),
        sa.Column('notes',            sa.Text(),      nullable=True),
        sa.Column('recipient_name',   sa.String(255), nullable=True),
        sa.Column('proof_photo_url',  sa.Text(),      nullable=True),
        sa.Column('signature_data',   sa.Text(),      nullable=True),
        sa.Column('submitted_at',     sa.DateTime(),  nullable=False),
        sa.Column('created_at',       sa.DateTime(),  nullable=False, server_default=sa.text('NOW()')),
        sa.UniqueConstraint('shift_id', 'day_number', name='uq_shift_day_proof'),
    )


def downgrade() -> None:
    op.drop_table('shift_day_proofs')
    op.drop_column('shifts', 'access_code_verified')
    op.drop_constraint('ratings_shift_fk', 'ratings', type_='foreignkey')
    op.drop_column('ratings', 'shift_id')
    op.alter_column('ratings', 'job_id', existing_type=sa.String(36), nullable=False)
