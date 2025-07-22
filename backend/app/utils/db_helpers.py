# app/utils/db_helpers.py
from sqlalchemy import update, select, delete
from ..models.reflected_models import users, tasks, customer_complaints, pre_orders, inventory_requests, equipment, temperature_monitoring_points, announcements, departments
from datetime import datetime
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session

from sqlalchemy import or_

def row_to_dict(row):
    """Convert a SQLAlchemy RowMapping to a dictionary with timestamp handling"""
    if row is None:
        return None
        
    result = dict(row._mapping)
    
    # Ensure created_at and updated_at are present
    now = datetime.utcnow()
    if "created_at" not in result or result["created_at"] is None:
        result["created_at"] = now
        
    if "updated_at" not in result or result["updated_at"] is None:
        result["updated_at"] = now
        
    return result

def rows_to_list(rows):
    """Convert a list of SQLAlchemy RowMapping objects to a list of dictionaries"""
    return [dict(row._mapping) for row in rows]

def break_user_dependencies(db, user_id, tables):
    """Helper function to break foreign key dependencies for a user
    
    Args:
        db: SQLAlchemy database session
        user_id: ID of the user to break dependencies for
        tables: Dictionary mapping table name to SQLAlchemy table object
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        users_table = tables.get('users')
        
        if not users_table:
            print("Users table not found in provided tables")
            return False
        
        # Get user details
        user_query = select(users_table).where(users_table.c.id == user_id)
        user = db.execute(user_query).fetchone()
        
        if not user:
            print(f"User with ID {user_id} not found")
            return False
        
        user = row_to_dict(user)
        
        # Break foreign key dependencies
        # First, remove employee_id reference from user
        if user.get("employee_id"):
            update_stmt = update(users_table).where(users_table.c.id == user_id).values({"employee_id": None})
            db.execute(update_stmt)
            print(f"Removed employee_id reference from user {user_id}")
        
        # Check if the tasks table exists and update assigned_to references
        tasks_table = tables.get('tasks')
        if tasks_table:
            tasks_update = update(tasks_table).where(tasks_table.c.assigned_to == user_id).values({"assigned_to": None})
            db.execute(tasks_update)
            print(f"Removed user references from tasks table for user {user_id}")
        
        # Check if the complaints table exists and update assigned_to references
        complaints_table = tables.get('customer_complaints')
        if complaints_table:
            complaints_update = update(complaints_table).where(complaints_table.c.assigned_to == user_id).values({"assigned_to": None})
            db.execute(complaints_update)
            print(f"Removed user references from complaints table for user {user_id}")
        
        # Check if the pre_orders table exists and update assigned_to references
        pre_orders_table = tables.get('pre_orders')
        if pre_orders_table:
            pre_orders_update = update(pre_orders_table).where(pre_orders_table.c.assigned_to == user_id).values({"assigned_to": None})
            db.execute(pre_orders_update)
            print(f"Removed user references from pre_orders table for user {user_id}")
        
        # Check if the inventory_requests table exists and update assigned_to references
        inventory_requests_table = tables.get('inventory_requests')
        if inventory_requests_table:
            inventory_update = update(inventory_requests_table).where(inventory_requests_table.c.assigned_to == user_id).values({"assigned_to": None})
            db.execute(inventory_update)
            print(f"Removed user references from inventory_requests table for user {user_id}")
        
        # Check if the equipment_repair_requests table exists and update assigned_to references
        repair_requests_table = tables.get('equipment_repair_requests')
        if repair_requests_table:
            repair_update = update(repair_requests_table).where(repair_requests_table.c.assigned_to == user_id).values({"assigned_to": None})
            db.execute(repair_update)
            print(f"Removed user references from equipment_repair_requests table for user {user_id}")
        
        # Commit all changes
        db.commit()
        return True
    
    except Exception as e:
        db.rollback()
        print(f"Error breaking user dependencies: {str(e)}")
        return False
    
def break_user_dependencies(db, user_id):
    """Helper function to break user dependencies before deletion"""
    try:
        # First, check if the user exists
        user_query = select(users).where(users.c.id == user_id)
        user = db.execute(user_query).fetchone()
        
        if not user:
            print(f"User with ID {user_id} not found")
            return False
            
        # Remove employee_id reference from user
        update_stmt = update(users).where(users.c.id == user_id).values({
            "employee_id": None, 
            "department_id": None
        })
        db.execute(update_stmt)
        db.commit()
        
        print(f"Successfully removed dependencies for user {user_id}")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"Error breaking user dependencies: {str(e)}")
        return False


def break_department_dependencies(db, department_id):
    """Helper function to break foreign key dependencies for a department"""
    tables_updated = []
    errors = []
    
    # Define all tables and columns that reference departments
    references = [
        {"table": "tasks", "columns": ["department_id", "assigned_to_department"]},
        {"table": "customer_complaints", "columns": ["department_involved"]},
        {"table": "pre_orders", "columns": ["target_department"]},
        {"table": "inventory_requests", "columns": ["requesting_department", "fulfilling_department"]},
        {"table": "equipment", "columns": ["department_id"]},
        {"table": "temperature_monitoring_points", "columns": ["department_id"]},
        {"table": "announcements", "columns": ["target_department"]},
        {"table": "announcement_reads", "columns": ["department_id"]}
    ]
    
    try:
        # Loop through each table and column
        for ref in references:
            table_name = ref["table"]
            for column_name in ref["columns"]:
                try:
                    # Use raw SQL for more control
                    query = text(f"""
                    UPDATE {table_name} 
                    SET {column_name} = NULL 
                    WHERE {column_name} = :department_id
                    """)
                    
                    result = db.execute(query, {"department_id": department_id})
                    if result.rowcount > 0:
                        tables_updated.append(f"{table_name}.{column_name} ({result.rowcount} rows)")
                except Exception as e:
                    error_msg = f"Error updating {table_name}.{column_name}: {str(e)}"
                    errors.append(error_msg)
                    print(error_msg)
        
        # Commit the transaction if there were no errors
        if not errors:
            db.commit()
            if tables_updated:
                print(f"Successfully updated references: {', '.join(tables_updated)}")
            return True
        else:
            # If there were errors, log them but continue with deletion
            print(f"Encountered {len(errors)} errors while breaking dependencies")
            db.commit()  # Still commit the successful updates
            return True  # Return true to continue with deletion despite errors
            
    except Exception as e:
        db.rollback()
        print(f"Error breaking department dependencies: {str(e)}")
        return False
 


from sqlalchemy import text, inspect

def break_employee_dependencies(db, employee_id):
    """Helper function to break foreign key dependencies for an employee"""
    # Get actual column names for each table
    inspector = inspect(db.bind)
    
    # Process each table in a separate transaction
    tables_to_check = [
        "customer_complaints",
        "pre_orders",
        "departments",
        "inventory_requests",
        "equipment",
        "equipment_repair_requests",
        "announcements",
        "temperature_logs",
        "temperature_violations",
        "inventory_request_updates",
        "equipment_maintenance",
        "training_types",
        "employee_training_records",
        "training_requirements",
        "announcement_reads",
        "tasks"
    ]
    
    success = True
    
    for table_name in tables_to_check:
        try:
            # Get column names from the actual table
            if not inspector.has_table(table_name):
                print(f"Table {table_name} does not exist, skipping")
                continue
                
            columns = inspector.get_columns(table_name)
            column_names = [col['name'] for col in columns]
            
            # Check for likely employee reference columns
            employee_ref_columns = []
            for possible_name in ["reported_by", "assigned_to", "requested_by", "manager_id", 
                                "created_by", "updated_by", "recorded_by", "performed_by",
                                "resolved_by", "employee_id", "assigned_by"]:
                if possible_name in column_names:
                    employee_ref_columns.append(possible_name)
            
            if not employee_ref_columns:
                continue  # No employee reference columns in this table
                
            # Create a separate connection/transaction for each table
            with db.bind.connect() as conn:
                with conn.begin():
                    for column_name in employee_ref_columns:
                        sql = text(f"""
                        UPDATE "{table_name}" 
                        SET "{column_name}" = NULL 
                        WHERE "{column_name}" = :employee_id
                        """)
                        
                        conn.execute(sql, {"employee_id": employee_id})
                        
                    print(f"Successfully nullified employee references in {table_name}")
                    
        except Exception as e:
            print(f"Error processing {table_name}: {str(e)}")
            success = False
    
    return success