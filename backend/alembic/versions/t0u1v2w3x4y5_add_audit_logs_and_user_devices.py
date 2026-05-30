"""add audit_logs and user_devices tables

Revision ID: t0u1v2w3x4y5
Revises: s9t0u1v2w3x4
Create Date: 2026-05-30

"""
from alembic import op
import sqlalchemy as sa

revision = 't0u1v2w3x4y5'
down_revision = 's9t0u1v2w3x4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'audit_logs',
        sa.Column('id',          sa.String(36),  primary_key=True),
        sa.Column('user_id',     sa.String(36),  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('action',      sa.String(100), nullable=False, index=True),
        sa.Column('entity_type', sa.String(50),  nullable=True),
        sa.Column('entity_id',   sa.String(36),  nullable=True, index=True),
        sa.Column('old_value',   sa.JSON,        nullable=True),
        sa.Column('new_value',   sa.JSON,        nullable=True),
        sa.Column('ip_address',  sa.String(45),  nullable=True),
        sa.Column('user_agent',  sa.String(512), nullable=True),
        sa.Column('endpoint',    sa.String(255), nullable=True),
        sa.Column('method',      sa.String(10),  nullable=True),
        sa.Column('status_code', sa.Integer,     nullable=True),
        sa.Column('extra',       sa.JSON,        nullable=True),
        sa.Column('created_at',  sa.DateTime,    nullable=False, server_default=sa.func.now(), index=True),
    )

    op.create_table(
        'user_devices',
        sa.Column('id',           sa.String(36),  primary_key=True),
        sa.Column('user_id',      sa.String(36),  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('device_id',    sa.String(255), nullable=True, index=True),
        sa.Column('app_type',     sa.String(20),  nullable=True),
        sa.Column('app_version',  sa.String(30),  nullable=True),
        sa.Column('os_name',      sa.String(30),  nullable=True),
        sa.Column('os_version',   sa.String(30),  nullable=True),
        sa.Column('device_model', sa.String(100), nullable=True),
        sa.Column('device_brand', sa.String(50),  nullable=True),
        sa.Column('ip_address',   sa.String(45),  nullable=True),
        sa.Column('mac_address',  sa.String(17),  nullable=True),
        sa.Column('push_token',   sa.String(500), nullable=True),
        sa.Column('user_agent',   sa.String(512), nullable=True),
        sa.Column('last_seen_at', sa.DateTime,    nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_at',   sa.DateTime,    nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('user_devices')
    op.drop_table('audit_logs')
