# app/routers/employees.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete
from typing import List, Optional
from ..database.database import get_db
from ..models.reflected_models import employees
from ..schemas import schemas
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/employees",
    tags=["employees"],
)

@router.get("/", response_model=List[schemas.Employee])
def get_employees(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(employees).offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    employees_list = [dict(row._mapping) for row in result]
    return employees_list

@router.get("/{employee_id}", response_model=schemas.Employee)
def get_employee(
    employee_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(employees).where(employees.c.id == employee_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return dict(result._mapping)

@router.post("/", response_model=schemas.Employee)
def create_employee(
    employee: schemas.EmployeeCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
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
    created_employee = dict(result._mapping)
    return created_employee

@router.put("/{employee_id}", response_model=schemas.Employee)
def update_employee(
    employee_id: int, 
    employee: schemas.EmployeeCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if employee exists
    query = select(employees).where(employees.c.id == employee_id)
    existing_employee = db.execute(query).fetchone()
    if existing_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    
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
    updated_employee = dict(result._mapping)
    return updated_employee

@router.delete("/{employee_id}", response_model=dict)
def delete_employee(
    employee_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if employee exists
    query = select(employees).where(employees.c.id == employee_id)
    existing_employee = db.execute(query).fetchone()
    if existing_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Delete employee
    delete_stmt = delete(employees).where(employees.c.id == employee_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Employee deleted successfully"}