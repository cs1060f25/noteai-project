"""fix_quizzes_schema

Revision ID: 2acdeb204778
Revises: 6896d01d2041
Create Date: 2025-12-01 17:33:56.920608

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2acdeb204778"
down_revision: Union[str, Sequence[str], None] = "6896d01d2041"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # add title column with a default value for existing rows
    op.add_column("quizzes", sa.Column("title", sa.String(255), nullable=True))
    # update existing rows to have a default title
    op.execute("UPDATE quizzes SET title = 'Quiz' WHERE title IS NULL")
    # make title non-nullable
    op.alter_column("quizzes", "title", nullable=False)

    # add description column (nullable)
    op.add_column("quizzes", sa.Column("description", sa.Text(), nullable=True))

    # rename num_questions to total_questions
    op.alter_column("quizzes", "num_questions", new_column_name="total_questions")


def downgrade() -> None:
    """Downgrade schema."""
    # rename total_questions back to num_questions
    op.alter_column("quizzes", "total_questions", new_column_name="num_questions")

    # drop description column
    op.drop_column("quizzes", "description")

    # drop title column
    op.drop_column("quizzes", "title")
