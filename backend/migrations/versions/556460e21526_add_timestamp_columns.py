"""Add timestamp columns

Revision ID: 556460e21526
Revises: 
Create Date: 2025-07-17 14:28:22.087040

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '556460e21526'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Add timestamp columns to departments
    op.add_column('departments', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('departments', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.execute("UPDATE departments SET created_at = NOW(), updated_at = NOW()")
    
    # Add timestamp columns to employees
    op.add_column('employees', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('employees', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.execute("UPDATE employees SET created_at = NOW(), updated_at = NOW()")
    
    # Add updated_at to tasks (since created_at already exists)
    op.add_column('tasks', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.execute("UPDATE tasks SET updated_at = NOW()")
    
    # Add updated_at to users (since created_at already exists)
    op.add_column('users', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.execute("UPDATE users SET updated_at = NOW()")
    


def downgrade():
    # Remove timestamp columns
    op.drop_column('departments', 'updated_at')
    op.drop_column('departments', 'created_at')
    op.drop_column('employees', 'updated_at')
    op.drop_column('employees', 'created_at')
    op.drop_column('tasks', 'updated_at')
    op.drop_column('users', 'updated_at')
