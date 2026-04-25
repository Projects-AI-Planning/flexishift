"""add load_code_verified_at to compliance_records

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-25 01:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "compliance_records",
        sa.Column("load_code_verified_at", sa.DateTime, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("compliance_records", "load_code_verified_at")
