# app/routers/employees.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_,text
from typing import List, Optional, Dict
from ..database.database import get_db
from ..models.reflected_models import employees,users
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list, break_employee_dependencies
from datetime import datetime



router = APIRouter(
    prefix="/employees",
    tags=["employees"],
)

@router.get("/", response_model=Dict)
def get_employees(
    skip: int = 0, 
    limit: int = 20, 
    department_id: Optional[int] = None,
    status: Optional[str] = None,
    position: Optional[str] = None,
    sort: str = "id",
    order: str = "asc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(employees)
    count_query = select(func.count()).select_from(employees)
    
    if department_id:
        query = query.where(employees.c.department_id == department_id)
        count_query = count_query.where(employees.c.department_id == department_id)
    if status:
        query = query.where(employees.c.status == status)
        count_query = count_query.where(employees.c.status == status)
    if position:
        query = query.where(employees.c.position == position)
        count_query = count_query.where(employees.c.position == position)
    
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            employees.c.first_name.ilike(search_pattern),
            employees.c.last_name.ilike(search_pattern),
            employees.c.email.ilike(search_pattern),
            employees.c.employee_id.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    if hasattr(employees.c, sort):
        sort_column = getattr(employees.c, sort)
        query = query.order_by(sort_column.asc() if order.lower() == "asc" else sort_column.desc())
    
    total_count = db.execute(count_query).scalar()
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    employees_list = rows_to_list(result)
    
    return {
        "items": employees_list,
        "pagination": {
            "total": total_count,
            "limit": limit,
            "offset": skip,
            "has_more": (skip + limit) < total_count
        },
        "sort": {
            "field": sort,
            "order": order
        }
    }

@router.get("/{employee_id}", response_model=schemas.Employee)
def get_employee(
    employee_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(employees).where(employees.c.id == employee_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Employee not found")
    return row_to_dict(result)

@router.post("/", response_model=schemas.Employee)
def create_employee(
    employee: schemas.EmployeeCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)
):
    try:
        # Check if employee with the same ID already exists
        check_query = select(employees).where(employees.c.employee_id == employee.employee_id)
        existing_employee = db.execute(check_query).fetchone()
        if existing_employee:
            raise_api_error(400, f"Employee with ID '{employee.employee_id}' already exists")
        
        # Debug log of incoming data
        print(f"Creating employee with data: {employee}")
        
        # Prepare employee data with proper NULL handling
        new_employee = {
            "employee_id": employee.employee_id,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "email": employee.email,
            "phone": employee.phone,
            "department_id": employee.department_id if employee.department_id else None,
            "position": employee.position or "Staff",
            "status": employee.status or "active"
        }
        
        # Special handling for hire_date
        if employee.hire_date:
            # If hire_date is a string, convert to datetime
            if isinstance(employee.hire_date, str):
                try:
                    # Try parsing as ISO format (YYYY-MM-DD)
                    new_employee["hire_date"] = datetime.strptime(employee.hire_date, "%Y-%m-%d")
                except ValueError:
                    # If parsing fails, log and use current date
                    print(f"Invalid hire_date format: {employee.hire_date}")
                    new_employee["hire_date"] = datetime.now()
            else:
                # If it's already a datetime, use it directly
                new_employee["hire_date"] = employee.hire_date
        else:
            # If no hire_date provided, use current date
            new_employee["hire_date"] = datetime.now()
        
        # Debug log of processed data
        print(f"Processed employee data: {new_employee}")
        
        # Insert new employee
        insert_stmt = insert(employees).values(**new_employee)
        result = db.execute(insert_stmt)
        db.commit()
        
        # Fetch and return the created employee
        employee_id = result.inserted_primary_key[0]
        query = select(employees).where(employees.c.id == employee_id)
        result = db.execute(query).fetchone()
        return row_to_dict(result)
        
    except Exception as e:
        db.rollback()
        print(f"Error creating employee: {str(e)}")
        # Check if this is already a FastAPI HTTPException
        if isinstance(e, HTTPException):
            raise
        # Otherwise, create a new exception with the error details
        raise_api_error(500, f"Failed to create employee: {str(e)}")

@router.put("/{employee_id}", response_model=schemas.Employee)
def update_employee(
    employee_id: int, 
    employee: schemas.EmployeeUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)
):
    try:
        # Check if employee exists
        query = select(employees).where(employees.c.id == employee_id)
        existing_employee = db.execute(query).fetchone()
        if existing_employee is None:
            raise_api_error(404, "Employee not found")
        
        print(f"Updating employee {employee_id} with data: {employee}")
        
        # Convert employee model to dict and handle nulls
        update_values = {}
        for field, value in employee.dict(exclude_unset=True).items():
            if field == 'department_id' and value == 0:
                update_values[field] = None
            else:
                update_values[field] = value
        
        # Add updated_at timestamp
        update_values["updated_at"] = datetime.utcnow()
        
        print(f"Processed update values: {update_values}")
        
        # Update employee
        update_stmt = update(employees).where(employees.c.id == employee_id).values(**update_values)
        db.execute(update_stmt)
        db.commit()
        
        # Fetch updated employee with all fields including timestamps
        query = select(employees).where(employees.c.id == employee_id)
        result = db.execute(query).fetchone()
        
        if result is None:
            raise_api_error(404, "Employee not found after update")
        
        # Convert to dict and ensure timestamp fields are present
        employee_dict = row_to_dict(result)
        
        # Ensure timestamp fields have values
        if employee_dict.get("created_at") is None:
            employee_dict["created_at"] = datetime.utcnow()
            
        if employee_dict.get("updated_at") is None:
            employee_dict["updated_at"] = datetime.utcnow()
            
        return employee_dict
        
    except Exception as e:
        db.rollback()
        print(f"Error updating employee: {str(e)}")
        raise_api_error(500, f"Failed to update employee: {str(e)}")

@router.delete("/{employee_id}", response_model=dict)
def delete_employee(
    employee_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)
):
    try:
        # Check if employee exists
        query = select(employees).where(employees.c.id == employee_id)
        existing_employee = db.execute(query).fetchone()
        if existing_employee is None:
            raise_api_error(404, "Employee not found")
        
        # Check if there are any users associated with this employee
        user_query = select(users).where(users.c.employee_id == employee_id)
        employee_users = db.execute(user_query).fetchall()
        
        if employee_users:
            # There are users associated with this employee
            raise_api_error(
                400, 
                f"Cannot delete employee with ID {employee_id} because there are {len(employee_users)} users associated with it. Remove user associations first."
            )
        
        # Break dependencies with other tables
        break_employee_dependencies(db, employee_id)
        
        # Special handling for customer_complaints table - direct SQL approach
        # Use a separate connection to avoid transaction conflicts
        try:
            engine = db.get_bind()
            with engine.connect() as connection:
                with connection.begin():
                    # Handle reported_by column
                    sql = text("""
                    UPDATE customer_complaints 
                    SET reported_by = NULL 
                    WHERE reported_by = :employee_id
                    """)
                    connection.execute(sql, {"employee_id": employee_id})
                    
                    # Try other possible column names if needed
                    for possible_column in ["assignee", "assigned_to"]:
                        try:
                            sql = text(f"""
                            UPDATE customer_complaints 
                            SET "{possible_column}" = NULL 
                            WHERE "{possible_column}" = :employee_id
                            """)
                            connection.execute(sql, {"employee_id": employee_id})
                        except Exception:
                            pass  # Column might not exist
        except Exception as e:
            print(f"Special handling for customer_complaints failed: {str(e)}")
        
        # Now delete the employee
        delete_stmt = delete(employees).where(employees.c.id == employee_id)
        db.execute(delete_stmt)
        db.commit()
        
        print(f"Successfully deleted employee {employee_id}")
        return {"message": "Employee deleted successfully"}
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        db.rollback()
        print(f"Unexpected error in delete_employee: {str(e)}")
        raise_api_error(500, f"Failed to delete employee: {str(e)}")