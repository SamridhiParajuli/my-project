# app/routers/departments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete
from typing import List, Optional
from ..database.database import get_db
from ..models.reflected_models import departments
from ..schemas import schemas
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/departments",
    tags=["departments"],
)

@router.get("/", response_model=List[schemas.Department])
def get_departments(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(departments).offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    departments_list = [dict(row._mapping) for row in result]
    return departments_list

@router.get("/{department_id}", response_model=schemas.Department)
def get_department(
    department_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(departments).where(departments.c.id == department_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Department not found")
    return dict(result._mapping)

@router.post("/", response_model=schemas.Department)
def create_department(
    department: schemas.DepartmentCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    new_department = {
        "name": department.name,
        "department_code": department.department_code,
        "description": department.description,
        "manager_id": department.manager_id,
        "is_active": department.is_active
    }
    
    insert_stmt = insert(departments).values(**new_department)
    result = db.execute(insert_stmt)
    db.commit()
    
    department_id = result.inserted_primary_key[0]
    query = select(departments).where(departments.c.id == department_id)
    result = db.execute(query).fetchone()
    created_department = dict(result._mapping)
    return created_department

@router.put("/{department_id}", response_model=schemas.Department)
def update_department(
    department_id: int, 
    department: schemas.DepartmentCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if department exists
    query = select(departments).where(departments.c.id == department_id)
    existing_department = db.execute(query).fetchone()
    if existing_department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Update department
    update_values = {
        "name": department.name,
        "department_code": department.department_code,
        "description": department.description,
        "manager_id": department.manager_id,
        "is_active": department.is_active
    }
    
    update_stmt = update(departments).where(departments.c.id == department_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated department
    query = select(departments).where(departments.c.id == department_id)
    result = db.execute(query).fetchone()
    updated_department = dict(result._mapping)
    return updated_department

@router.delete("/{department_id}", response_model=dict)
def delete_department(
    department_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if department exists
    query = select(departments).where(departments.c.id == department_id)
    existing_department = db.execute(query).fetchone()
    if existing_department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Check if there are any employees in this department
    from ..models.reflected_models import employees
    employee_query = select(employees).where(employees.c.department_id == department_id)
    department_employees = db.execute(employee_query).fetchall()
    
    if department_employees:
        # There are employees in this department
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete department with ID {department_id} because it has {len(department_employees)} employees assigned to it. Reassign or remove employees first."
        )
    
    # If no employees, proceed with deletion
    delete_stmt = delete(departments).where(departments.c.id == department_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Department deleted successfully"}
    