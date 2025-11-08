"""add_user_role_and_audit_log

Revision ID: 5262ba4a3e83
Revises: b538e0c4458d
Create Date: 2025-11-05 18:26:07.431440

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "5262ba4a3e83"
down_revision: Union[str, Sequence[str], None] = "b538e0c4458d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create enum type for user roles
    user_role_enum = postgresql.ENUM("user", "admin", name="userrole", create_type=False)
    user_role_enum.create(op.get_bind(), checkfirst=True)

    # Add role column to users table with proper enum default
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.Enum("user", "admin", name="userrole"),
            nullable=False,
            server_default=sa.text("'user'::userrole"),
        ),
    )

    # Create index on role column
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop role column from users table
    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_column("users", "role")

    # Drop user role enum type
    user_role_enum = postgresql.ENUM("user", "admin", name="userrole")
    user_role_enum.drop(op.get_bind(), checkfirst=True)
