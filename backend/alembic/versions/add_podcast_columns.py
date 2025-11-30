"""add podcast columns to jobs table

Revision ID: add_podcast_columns
Revises: 3105335fb7e4
Create Date: 2025-11-29 20:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_podcast_columns'
down_revision: Union[str, None] = '3105335fb7e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add podcast-related columns to jobs table
    op.add_column('jobs', sa.Column('podcast_s3_key', sa.String(500), nullable=True))
    op.add_column('jobs', sa.Column('podcast_duration', sa.Float(), nullable=True))
    op.add_column('jobs', sa.Column('podcast_file_size', sa.Integer(), nullable=True))
    op.add_column('jobs', sa.Column('podcast_status', sa.String(20), nullable=True))


def downgrade() -> None:
    # Remove podcast-related columns from jobs table
    op.drop_column('jobs', 'podcast_status')
    op.drop_column('jobs', 'podcast_file_size')
    op.drop_column('jobs', 'podcast_duration')
    op.drop_column('jobs', 'podcast_s3_key')
