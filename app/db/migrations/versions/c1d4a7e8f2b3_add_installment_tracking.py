"""add installment tracking

Revision ID: c1d4a7e8f2b3
Revises: 8a91c52e740d
Create Date: 2026-09-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c1d4a7e8f2b3"
down_revision: Union[str, None] = "8a91c52e740d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "installments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("item_id", sa.Uuid(), nullable=False),
        sa.Column("total_installments", sa.Integer(), nullable=False),
        sa.Column("paid_installments", sa.Integer(), nullable=False),
        sa.Column("payment_day", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("amount_per_installment", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.ForeignKeyConstraint(["item_id"], ["household_items.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("item_id"),
    )


def downgrade() -> None:
    op.drop_table("installments")
