"""add admin_approved to users

Revision ID: b1c2d3e4f5a6
Revises: cf46bd6c4014
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "cf46bd6c4014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("admin_approved", sa.Boolean(), nullable=False, server_default="1"))
    # Hauliers that already exist are NOT auto-approved; all other roles are
    op.execute("UPDATE users SET admin_approved = 0 WHERE role = 'HAULIER'")


def downgrade() -> None:
    op.drop_column("users", "admin_approved")
