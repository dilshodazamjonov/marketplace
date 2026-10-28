"""added is_active to users

Revision ID: fe2b3656369f
Revises: 3d28a1e76f7e
Create Date: 2026-10-28 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe2b3656369f'
down_revision: Union[str, Sequence[str], None] = '3d28a1e76f7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Existing users become active through the server default.
    op.add_column('users', sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'is_active')
