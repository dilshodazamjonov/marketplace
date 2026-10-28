"""tightened product and category constraints

Revision ID: 9b1d7c4e2a6f
Revises: fe2b3656369f
Create Date: 2026-10-28 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b1d7c4e2a6f'
down_revision: Union[str, Sequence[str], None] = 'fe2b3656369f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # The API always requires these, so the database does too.
    op.alter_column('products', 'description', existing_type=sa.Text(), nullable=False)
    op.alter_column('products', 'condition', existing_type=sa.String(length=200), nullable=False)

    # "Phones" and "phones" count as the same category.
    op.create_index('uq_categories_name_lower', 'categories', [sa.text('lower(name)')], unique=True)

    # Deleting a user or product removes its events instead of failing.
    op.drop_constraint('product_events_user_id_fkey', 'product_events', type_='foreignkey')
    op.drop_constraint('product_events_product_id_fkey', 'product_events', type_='foreignkey')
    op.create_foreign_key('product_events_user_id_fkey', 'product_events', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('product_events_product_id_fkey', 'product_events', 'products', ['product_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('product_events_product_id_fkey', 'product_events', type_='foreignkey')
    op.drop_constraint('product_events_user_id_fkey', 'product_events', type_='foreignkey')
    op.create_foreign_key('product_events_product_id_fkey', 'product_events', 'products', ['product_id'], ['id'])
    op.create_foreign_key('product_events_user_id_fkey', 'product_events', 'users', ['user_id'], ['id'])

    op.drop_index('uq_categories_name_lower', table_name='categories')

    op.alter_column('products', 'condition', existing_type=sa.String(length=200), nullable=True)
    op.alter_column('products', 'description', existing_type=sa.Text(), nullable=True)
