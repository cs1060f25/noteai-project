"""add_summaries_table

Revision ID: 532d9ab6e236
Revises: add_podcast_columns
Create Date: 2025-12-01 12:13:14.114186

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "532d9ab6e236"
down_revision: Union[str, Sequence[str], None] = "add_podcast_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "summaries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("summary_id", sa.String(100), nullable=False),
        sa.Column("job_id", sa.String(100), nullable=False),
        sa.Column("summary_text", sa.Text(), nullable=False),
        sa.Column("key_takeaways", sa.JSON(), nullable=False),
        sa.Column("topics_covered", sa.JSON(), nullable=False),
        sa.Column("learning_objectives", sa.JSON(), nullable=True),
        sa.Column("word_count", sa.Integer(), nullable=True),
        sa.Column("model_used", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.job_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("summary_id"),
    )
    op.create_index("ix_summaries_job_id", "summaries", ["job_id"])
    op.create_index("ix_summaries_summary_id", "summaries", ["summary_id"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_summaries_summary_id", "summaries")
    op.drop_index("ix_summaries_job_id", "summaries")
    op.drop_table("summaries")
