"""add_clerk_user_id_to_users

Revision ID: c5a9cfc92207
Revises: 2a3b4c5d6e7f
Create Date: 2025-10-23 13:23:57.323922

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5a9cfc92207'
down_revision: Union[str, Sequence[str], None] = '2a3b4c5d6e7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # add clerk_user_id column
    op.add_column('users', sa.Column('clerk_user_id', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_users_clerk_user_id'), 'users', ['clerk_user_id'], unique=True)

    # make google_id nullable for clerk users
    op.alter_column('users', 'google_id', existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # remove clerk_user_id column
    op.drop_index(op.f('ix_users_clerk_user_id'), table_name='users')
    op.drop_column('users', 'clerk_user_id')

    # restore google_id as non-nullable
    op.alter_column('users', 'google_id', existing_type=sa.String(length=255), nullable=False)
