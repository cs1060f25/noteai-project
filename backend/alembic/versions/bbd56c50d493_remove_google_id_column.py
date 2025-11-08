"""remove_google_id_column

Revision ID: bbd56c50d493
Revises: c5a9cfc92207
Create Date: 2025-10-23 13:43:39.942670

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'bbd56c50d493'
down_revision: Union[str, Sequence[str], None] = 'c5a9cfc92207'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # make clerk_user_id non-nullable (all new users must have it)
    op.alter_column('users', 'clerk_user_id', existing_type=sa.String(length=255), nullable=False)

    # drop google_id column (legacy auth)
    op.drop_index('ix_users_google_id', table_name='users')
    op.drop_column('users', 'google_id')


def downgrade() -> None:
    """Downgrade schema."""
    # restore google_id column
    op.add_column('users', sa.Column('google_id', sa.String(length=255), nullable=True))
    op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)

    # make clerk_user_id nullable again
    op.alter_column('users', 'clerk_user_id', existing_type=sa.String(length=255), nullable=True)
