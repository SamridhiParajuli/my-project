# app/routers/employees.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from typing import List, Optional, Dict
from ..database.database import get_db
from ..models.reflected_models import employees
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

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
    # Base query
    query = select(employees)
    count_query = select(func.count()).select_from(employees)
    
    # Add filters if provided
    if department_id:
        query = query.where(employees.c.department_id == department_id)
        count_query = count_query.where(employees.c.department_id == department_id)
    if status:
        query = query.where(employees.c.status == status)
        count_query = count_query.where(employees.c.status == status)
    if position:
        query = query.where(employees.c.position == position)
        count_query = count_query.where(employees.c.position == position)
    
    # Add search if provided
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
    
    # Add sorting
    if hasattr(employees.c, sort):
        sort_column = getattr(employees.c, sort)
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
    employees_list = rows_to_list(result)
    
    # Return with pagination metadata
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
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can create employees
):
    # Check if employee_id already exists
    check_query = select(employees).where(employees.c.employee_id == employee.employee_id)
    existing_employee = db.execute(check_query).fetchone()
    
    if existing_employee:
        raise_api_error(400, f"Employee with ID '{employee.employee_id}' already exists")
    
    new_employee = {
        "employee_id": employee.employee_id,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "email": employee.email,
        "phone": employee.phone,
        "department_id": employee.department_id,
        "position": employee.position,
        "status": employee.status,
        "hire_date": employee.hire_date
    }
    
    insert_stmt = insert(employees).values(**new_employee)
    result = db.execute(insert_stmt)
    db.commit()
    
    employee_id = result.inserted_primary_key[0]
    query = select(employees).where(employees.c.id == employee_id)
    result = db.execute(query).fetchone()
    created_employee = row_to_dict(result)
    return created_employee

@router.put("/{employee_id}", response_model=schemas.Employee)
def update_employee(
    employee_id: int, 
    employee: schemas.EmployeeCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can update employees
):
    # Check if employee exists
    query = select(employees).where(employees.c.id == employee_id)
    existing_employee = db.execute(query).fetchone()
    if existing_employee is None:
        raise_api_error(404, "Employee not found")
    
    # Update employee
    update_values = {
        "employee_id": employee.employee_id,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "email": employee.email,
        "phone": employee.phone,
        "department_id": employee.department_id,
        "position": employee.position,
        "status": employee.status,
        "hire_date": employee.hire_date
    }
    
    update_stmt = update(employees).where(employees.c.id == employee_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated employee
    query = select(employees).where(employees.c.id == employee_id)
    result = db.execute(query).fetchone()
    updated_employee = row_to_dict(result)
    return updated_employee

@router.delete("/{employee_id}", response_model=dict)
def delete_employee(
    employee_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can delete employees
):
    # Check if employee exists
    query = select(employees).where(employees.c.id == employee_id)
    existing_employee = db.execute(query).fetchone()
    if existing_employee is None:
        raise_api_error(404, "Employee not found")
    
    # Delete employee
    delete_stmt = delete(employees).where(employees.c.id == employee_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Employee deleted successfully"}