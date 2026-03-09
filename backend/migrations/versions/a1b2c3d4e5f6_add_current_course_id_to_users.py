"""add current_course_id to users

Revision ID: a1b2c3d4e5f6
Revises: 08abede13d62
Create Date: 2026-03-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "08abede13d62"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("current_course_id", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "current_course_id")
