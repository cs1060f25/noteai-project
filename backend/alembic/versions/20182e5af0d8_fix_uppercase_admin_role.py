"""fix_uppercase_admin_role

Revision ID: 20182e5af0d8
Revises: 5262ba4a3e83
Create Date: 2025-11-09 17:55:57.263915

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20182e5af0d8'
down_revision: Union[str, Sequence[str], None] = '5262ba4a3e83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix uppercase enum values to lowercase for userrole enum."""
    # step 1: create a temporary column to hold the converted values
    op.execute("ALTER TABLE users ADD COLUMN role_new VARCHAR(20);")

    # step 2: copy and convert the data to lowercase
    op.execute(
        """
        UPDATE users
        SET role_new = LOWER(role::text);
        """
    )

    # step 3: drop the old role column
    op.execute("ALTER TABLE users DROP COLUMN role;")

    # step 4: create new enum with lowercase values
    op.execute("DROP TYPE IF EXISTS userrole CASCADE;")
    op.execute("CREATE TYPE userrole AS ENUM ('user', 'admin');")

    # step 5: recreate the role column with the correct enum type
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN role userrole NOT NULL DEFAULT 'user';
        """
    )

    # step 6: copy data from temporary column to new role column
    op.execute(
        """
        UPDATE users
        SET role = role_new::userrole;
        """
    )

    # step 7: drop the temporary column
    op.execute("ALTER TABLE users DROP COLUMN role_new;")

    # step 8: create index on role column
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);")


def downgrade() -> None:
    """Revert lowercase enum values to uppercase for userrole enum."""
    # step 1: create a temporary column
    op.execute("ALTER TABLE users ADD COLUMN role_old VARCHAR(20);")

    # step 2: copy and convert the data to uppercase
    op.execute(
        """
        UPDATE users
        SET role_old = UPPER(role::text);
        """
    )

    # step 3: drop the role column
    op.execute("DROP INDEX IF EXISTS ix_users_role;")
    op.execute("ALTER TABLE users DROP COLUMN role;")

    # step 4: recreate enum with uppercase values
    op.execute("DROP TYPE IF EXISTS userrole CASCADE;")
    op.execute("CREATE TYPE userrole AS ENUM ('USER', 'ADMIN');")

    # step 5: recreate the role column
    op.execute(
        """
        ALTER TABLE users
        ADD COLUMN role userrole NOT NULL DEFAULT 'USER';
        """
    )

    # step 6: copy data back
    op.execute(
        """
        UPDATE users
        SET role = role_old::userrole;
        """
    )

    # step 7: drop temporary column
    op.execute("ALTER TABLE users DROP COLUMN role_old;")

    # step 8: create index
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);")
