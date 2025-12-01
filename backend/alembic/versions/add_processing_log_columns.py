"""add duration_seconds and created_at to processing_logs table

Revision ID: add_processing_log_columns
Revises: add_podcast_columns
Create Date: 2025-12-01 16:40:00.000000

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_processing_log_columns"
down_revision: Union[str, None] = "add_podcast_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add duration_seconds and created_at columns to processing_logs table
    op.add_column("processing_logs", sa.Column("duration_seconds", sa.Float(), nullable=True))
    op.add_column(
        "processing_logs",
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    # Remove duration_seconds and created_at columns from processing_logs table
    op.drop_column("processing_logs", "created_at")
    op.drop_column("processing_logs", "duration_seconds")
