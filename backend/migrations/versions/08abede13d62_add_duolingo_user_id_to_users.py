"""add duolingo_user_id to users

Revision ID: 08abede13d62
Revises: e62685f9cd20
Create Date: 2026-03-08 16:54:34.978768

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '08abede13d62'
down_revision: Union[str, Sequence[str], None] = 'e62685f9cd20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("duolingo_user_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        op.f("ix_users_duolingo_user_id"),
        "users",
        ["duolingo_user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_users_duolingo_user_id"), table_name="users")
    op.drop_column("users", "duolingo_user_id")