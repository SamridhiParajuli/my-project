# app/routers/departments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_,text
from typing import List, Optional, Dict
from ..database.database import get_db
from ..models.reflected_models import departments, employees,users
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list, break_department_dependencies
# from ..models.models import Department  # Comment this out until you have all models defined
from datetime import datetime

router = APIRouter(
    prefix="/departments",
    tags=["departments"],
)

@router.get("", response_model=Dict)
def get_departments(
    skip: int = 0, 
    limit: int = 20, 
    is_active: Optional[bool] = None,
    sort: str = "name",
    order: str = "asc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(departments)
    count_query = select(func.count()).select_from(departments)
    
    # Apply filters if provided
    if is_active is not None:
        query = query.where(departments.c.is_active == is_active)
        count_query = count_query.where(departments.c.is_active == is_active)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            departments.c.name.ilike(search_pattern),
            departments.c.department_code.ilike(search_pattern),
            departments.c.description.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(departments.c, sort):
        sort_column = getattr(departments.c, sort)
        if order.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
    
    # Get total count for pagination
    total_count = db.execute(count_query).scalar()
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    # Execute query
    result = db.execute(query).fetchall()
    departments_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": departments_list,
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

@router.get("/{department_id}", response_model=schemas.Department)
def get_department(
    department_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(departments).where(departments.c.id == department_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Department not found")
    return row_to_dict(result)

@router.post("", response_model=schemas.Department)
def create_department(
    department: schemas.DepartmentCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)
):
    # Use the reflection approach for now
    if department.department_code:
        code_query = select(departments).where(departments.c.department_code == department.department_code)
        existing_dept = db.execute(code_query).fetchone()
        if existing_dept:
            raise_api_error(400, f"Department with code '{department.department_code}' already exists")
    
    # Check if name already exists
    name_query = select(departments).where(departments.c.name == department.name)
    existing_name = db.execute(name_query).fetchone()
    if existing_name:
        raise_api_error(400, f"Department with name '{department.name}' already exists")
    
    # Validate manager_id if provided
    if department.manager_id:
        manager_query = select(employees).where(employees.c.id == department.manager_id)
        existing_manager = db.execute(manager_query).fetchone()
        if not existing_manager:
            raise_api_error(404, f"Manager with ID {department.manager_id} not found")
    
    new_department = {
        "name": department.name,
        "department_code": department.department_code,
        "description": department.description,
        "manager_id": department.manager_id,
        "is_active": department.is_active,
        # Include timestamp fields
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    insert_stmt = insert(departments).values(**new_department)
    result = db.execute(insert_stmt)
    db.commit()
    
    department_id = result.inserted_primary_key[0]
    query = select(departments).where(departments.c.id == department_id)
    result = db.execute(query).fetchone()
    created_department = row_to_dict(result)
    return created_department

@router.put("/{department_id}", response_model=schemas.Department)
def update_department(
    department_id: int, 
    department: schemas.DepartmentCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)
):
    # Check if department exists
    query = select(departments).where(departments.c.id == department_id)
    existing_department = db.execute(query).fetchone()
    if existing_department is None:
        raise_api_error(404, "Department not found")

    # Update department
    update_values = {
        "name": department.name,
        "department_code": department.department_code,
        "description": department.description,
        "manager_id": department.manager_id,
        "is_active": department.is_active
    }

    update_stmt = (
        update(departments)
        .where(departments.c.id == department_id)
        .values(**update_values)
    )
    db.execute(update_stmt)
    db.commit()

    # Fetch updated department
    query = select(departments).where(departments.c.id == department_id)
    result = db.execute(query).fetchone()
    updated_department = row_to_dict(result)

    # ✅ RETURN Pydantic object instead of raw dict
    return schemas.Department(**updated_department)

@router.delete("/{department_id}", response_model=dict)
def delete_department(
    department_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can delete departments
):
    try:
        # Check if department exists
        query = select(departments).where(departments.c.id == department_id)
        existing_department = db.execute(query).fetchone()
        if existing_department is None:
            raise_api_error(404, "Department not found")
        
        # Check if there are any employees in this department
        employee_query = select(employees).where(employees.c.department_id == department_id)
        department_employees = db.execute(employee_query).fetchall()
        
        if department_employees:
            # There are employees in this department
            raise_api_error(
                400, 
                f"Cannot delete department with ID {department_id} because it has {len(department_employees)} employees assigned to it. Reassign or remove employees first."
            )
        
        # Check if there are any users in this department
        user_query = select(users).where(users.c.department_id == department_id)
        department_users = db.execute(user_query).fetchall()
        
        if department_users:
            # There are users in this department
            raise_api_error(
                400, 
                f"Cannot delete department with ID {department_id} because it has {len(department_users)} users assigned to it. Reassign or remove users first."
            )
        
        # Break dependencies with other tables
        break_department_dependencies(db, department_id)
        
        # Delete department
        delete_stmt = delete(departments).where(departments.c.id == department_id)
        db.execute(delete_stmt)
        db.commit()
        
        return {"message": "Department deleted successfully"}
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        db.rollback()
        print(f"Unexpected error in delete_department: {str(e)}")
        raise_api_error(500, f"Failed to delete department: {str(e)}")