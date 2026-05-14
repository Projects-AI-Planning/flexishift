"""add local uploads table

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "local_uploads",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("upload_token", sa.String(64), nullable=False),
        sa.Column("storage_key", sa.String(600), nullable=False),
        sa.Column("kind", sa.Enum("DOCUMENT", "IMAGE", "FILE", name="localuploadkind"), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(120), nullable=False),
        sa.Column("local_path", sa.Text, nullable=False),
        sa.Column("public_url", sa.Text, nullable=False),
        sa.Column("status", sa.Enum("PENDING", "STORED", "DELETED", name="localuploadstatus"), nullable=False, server_default="PENDING"),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_local_uploads_upload_token", "local_uploads", ["upload_token"], unique=True)
    op.create_index("ix_local_uploads_storage_key", "local_uploads", ["storage_key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_local_uploads_storage_key", table_name="local_uploads")
    op.drop_index("ix_local_uploads_upload_token", table_name="local_uploads")
    op.drop_table("local_uploads")
