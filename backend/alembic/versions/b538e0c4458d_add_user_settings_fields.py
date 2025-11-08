"""add user settings fields

Revision ID: b538e0c4458d
Revises: bbd56c50d493
Create Date: 2025-11-05 15:12:51.639767

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b538e0c4458d"
down_revision: Union[str, Sequence[str], None] = "bbd56c50d493"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns to users table
    op.add_column("users", sa.Column("organization", sa.String(length=255), nullable=True))
    op.add_column(
        "users",
        sa.Column("email_notifications", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "users",
        sa.Column("processing_notifications", sa.Boolean(), nullable=False, server_default="true"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove columns from users table
    op.drop_column("users", "processing_notifications")
    op.drop_column("users", "email_notifications")
    op.drop_column("users", "organization")
