"""add_user_id_to_quizzes

Revision ID: 6896d01d2041
Revises: 532d9ab6e236
Create Date: 2025-12-01 17:29:34.322902

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6896d01d2041"
down_revision: Union[str, Sequence[str], None] = "532d9ab6e236"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # add user_id column to quizzes table
    op.add_column("quizzes", sa.Column("user_id", sa.String(100), nullable=True))
    # add foreign key constraint
    op.create_foreign_key("fk_quizzes_user_id", "quizzes", "users", ["user_id"], ["user_id"])
    # create index on user_id
    op.create_index("ix_quizzes_user_id", "quizzes", ["user_id"])


def downgrade() -> None:
    """Downgrade schema."""
    # drop index
    op.drop_index("ix_quizzes_user_id", "quizzes")
    # drop foreign key constraint
    op.drop_constraint("fk_quizzes_user_id", "quizzes", type_="foreignkey")
    # drop column
    op.drop_column("quizzes", "user_id")
