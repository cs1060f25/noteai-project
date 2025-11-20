"""add storage tracking fields

Revision ID: 3105335fb7e4
Revises: b1ea30b60ccb
Create Date: 2025-11-19 19:02:45.822757

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3105335fb7e4"
down_revision: Union[str, Sequence[str], None] = "b1ea30b60ccb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # add file_size_bytes to clips table
    op.add_column("clips", sa.Column("file_size_bytes", sa.Integer(), nullable=True))

    # add storage_used_bytes to users table with default value of 0
    op.add_column(
        "users", sa.Column("storage_used_bytes", sa.Integer(), nullable=False, server_default="0")
    )


def downgrade() -> None:
    """Downgrade schema."""
    # remove columns in reverse order
    op.drop_column("users", "storage_used_bytes")
    op.drop_column("clips", "file_size_bytes")
