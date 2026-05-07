"""widen signature and photo url columns to Text

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None

_COLS = [
    "driver_signature_url",
    "haulier_signature_url",
    "delivery_photo_url",
    "recipient_signature_url",
]


def _col_type(table: str, column: str) -> str:
    bind = op.get_bind()
    insp = inspect(bind)
    for c in insp.get_columns(table):
        if c["name"] == column:
            return str(c["type"]).upper()
    return ""


def upgrade() -> None:
    with op.batch_alter_table("compliance_records") as batch_op:
        for col in _COLS:
            t = _col_type("compliance_records", col)
            if "TEXT" not in t and "BLOB" not in t:
                batch_op.alter_column(col, type_=sa.Text(), existing_nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("compliance_records") as batch_op:
        for col in _COLS:
            batch_op.alter_column(col, type_=sa.String(500), existing_nullable=True)
