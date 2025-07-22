# fix_timestamps.py
import os
import sys
from datetime import datetime
from sqlalchemy import update, or_

# Add the app directory to the path so we can import app modules
sys.path.append('.')

from app.database.database import get_db
from app.models.reflected_models import employees, departments, users, tasks, customer_complaints, pre_orders

def fix_employee_timestamps():
    """Fix missing timestamp values for employees"""
    db = next(get_db())
    try:
        # Update all records with missing timestamps
        now = datetime.utcnow()
        update_stmt = update(employees).where(
            or_(
                employees.c.created_at.is_(None),
                employees.c.updated_at.is_(None)
            )
        ).values({
            "created_at": now,
            "updated_at": now
        })
        
        result = db.execute(update_stmt)
        db.commit()
        print(f"Updated {result.rowcount} employee records with timestamps")
        return True
    except Exception as e:
        db.rollback()
        print(f"Error fixing employee timestamps: {str(e)}")
        return False

def fix_department_timestamps():
    """Fix missing timestamp values for departments"""
    db = next(get_db())
    try:
        now = datetime.utcnow()
        update_stmt = update(departments).where(
            or_(
                departments.c.created_at.is_(None),
                departments.c.updated_at.is_(None)
            )
        ).values({
            "created_at": now,
            "updated_at": now
        })
        
        result = db.execute(update_stmt)
        db.commit()
        print(f"Updated {result.rowcount} department records with timestamps")
        return True
    except Exception as e:
        db.rollback()
        print(f"Error fixing department timestamps: {str(e)}")
        return False

def fix_all_timestamps():
    """Fix timestamps on all tables that have created_at/updated_at columns"""
    print("Starting timestamp fix operation...")
    
    # Fix employees
    fix_employee_timestamps()
    
    # Fix departments
    fix_department_timestamps()
    
    # Fix users (if they have timestamp columns)
    try:
        db = next(get_db())
        now = datetime.utcnow()
        update_stmt = update(users).where(
            or_(
                users.c.created_at.is_(None),
                users.c.updated_at.is_(None)
            )
        ).values({
            "created_at": now,
            "updated_at": now
        })
        
        result = db.execute(update_stmt)
        db.commit()
        print(f"Updated {result.rowcount} user records with timestamps")
    except Exception as e:
        print(f"Error fixing user timestamps: {str(e)}")
    
    # Fix tasks (if they have timestamp columns)
    try:
        db = next(get_db())
        now = datetime.utcnow()
        update_stmt = update(tasks).where(
            or_(
                tasks.c.created_at.is_(None),
                tasks.c.updated_at.is_(None)
            )
        ).values({
            "created_at": now,
            "updated_at": now
        })
        
        result = db.execute(update_stmt)
        db.commit()
        print(f"Updated {result.rowcount} task records with timestamps")
    except Exception as e:
        print(f"Error fixing task timestamps: {str(e)}")
    
    print("Timestamp fix operation completed!")

if __name__ == "__main__":
    # Run the fix functions
    fix_all_timestamps()