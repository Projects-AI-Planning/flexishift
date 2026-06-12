"""add vehicles table and vehicle_id to documents

Revision ID: aa1bb2cc3dd4
Revises: z3a4b5c6d7e8
Create Date: 2026-06-10
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'aa1bb2cc3dd4'
down_revision: Union[str, None] = 'z3a4b5c6d7e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'vehicles',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('vehicle_type', sa.String(50), nullable=True),
        sa.Column('vehicle_registration', sa.String(20), nullable=True),
        sa.Column('truck_capacity', sa.String(100), nullable=True),
        sa.Column('equipment_details', sa.JSON, nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime, nullable=True),
        sa.Column('updated_at', sa.DateTime, nullable=True),
    )
    op.create_index('ix_vehicles_user_id', 'vehicles', ['user_id'])
    op.add_column('documents', sa.Column('vehicle_id', sa.String(36), nullable=True))
    try:
        op.create_foreign_key(
            'fk_documents_vehicle_id', 'documents', 'vehicles', ['vehicle_id'], ['id'], ondelete='SET NULL'
        )
    except Exception:
        pass
    op.create_index('ix_documents_vehicle_id', 'documents', ['vehicle_id'])


def downgrade() -> None:
    op.drop_index('ix_documents_vehicle_id', table_name='documents')
    try:
        op.drop_constraint('fk_documents_vehicle_id', 'documents', type_='foreignkey')
    except Exception:
        pass
    op.drop_column('documents', 'vehicle_id')
    op.drop_index('ix_vehicles_user_id', table_name='vehicles')
    op.drop_table('vehicles')
