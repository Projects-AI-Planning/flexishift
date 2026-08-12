"""add OTHER to doc_type enum

Revision ID: x1y2z3a4b5c6
Revises: w3x4y5z6a7b8
Create Date: 2026-06-07 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "x1y2z3a4b5c6"
down_revision: Union[str, None] = "w3x4y5z6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "documents",
        "doc_type",
        existing_type=sa.Enum(
            "DRIVING_LICENCE", "VEHICLE_REG", "VEHICLE_INSURANCE",
            "COMPANY_REG", "FLEET_INSURANCE",
            name="doctype",
        ),
        type_=sa.Enum(
            "DRIVING_LICENCE", "VEHICLE_REG", "VEHICLE_INSURANCE",
            "COMPANY_REG", "FLEET_INSURANCE", "OTHER",
            name="doctype",
        ),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "documents",
        "doc_type",
        existing_type=sa.Enum(
            "DRIVING_LICENCE", "VEHICLE_REG", "VEHICLE_INSURANCE",
            "COMPANY_REG", "FLEET_INSURANCE", "OTHER",
            name="doctype",
        ),
        type_=sa.Enum(
            "DRIVING_LICENCE", "VEHICLE_REG", "VEHICLE_INSURANCE",
            "COMPANY_REG", "FLEET_INSURANCE",
            name="doctype",
        ),
        nullable=False,
    )
