# app/routers/training.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete
from typing import List, Optional
from datetime import datetime, date, timedelta
from ..database.database import get_db
from ..models.reflected_models import training_types, employee_training_records, training_requirements, employees
from ..schemas import schemas
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/training",
    tags=["training"],
)

# Training Types endpoints
@router.get("/types", response_model=List[schemas.TrainingType])
def get_training_types(
    skip: int = 0, 
    limit: int = 100, 
    is_mandatory: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(training_types)
    
    # Apply filters if provided
    if is_mandatory is not None:
        query = query.where(training_types.c.is_mandatory == is_mandatory)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    types_list = [dict(row._mapping) for row in result]
    return types_list

@router.get("/types/{type_id}", response_model=schemas.TrainingType)
def get_training_type(
    type_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(training_types).where(training_types.c.id == type_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Training type not found")
    return dict(result._mapping)

@router.post("/types", response_model=schemas.TrainingType)
def create_training_type(
    type_data: schemas.TrainingTypeCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    new_type = {
        "training_name": type_data.training_name,
        "description": type_data.description,
        "required_for_departments": type_data.required_for_departments,
        "required_for_positions": type_data.required_for_positions,
        "validity_period_months": type_data.validity_period_months,
        "is_mandatory": type_data.is_mandatory,
        "created_by": type_data.created_by or current_user["id"]
    }
    
    insert_stmt = insert(training_types).values(**new_type)
    result = db.execute(insert_stmt)
    db.commit()
    
    type_id = result.inserted_primary_key[0]
    
    # If training is mandatory for specific departments or positions, create requirements for applicable employees
    if (new_type["is_mandatory"] and 
        (new_type["required_for_departments"] or new_type["required_for_positions"])):
        
        # Build query to find employees that need this training
        employees_query = select(employees)
        
        conditions = []
        if new_type["required_for_departments"]:
            for dept_id in new_type["required_for_departments"]:
                conditions.append(employees.c.department_id == dept_id)
                
        if new_type["required_for_positions"]:
            for position in new_type["required_for_positions"]:
                conditions.append(employees.c.position == position)
        
        # Combine conditions with OR
        if conditions:
            from sqlalchemy import or_
            employees_query = employees_query.where(or_(*conditions))
        
        # Find applicable employees
        applicable_employees = db.execute(employees_query).fetchall()
        
        # Create training requirements for each applicable employee
        for employee in applicable_employees:
            employee_id = dict(employee._mapping)["id"]
            
            # Set required_by_date (e.g., 30 days from now)
            required_by_date = date.today() + timedelta(days=30)
            
            requirement_data = {
                "employee_id": employee_id,
                "training_type_id": type_id,
                "required_by_date": required_by_date,
                "status": "pending",
                "assigned_by": current_user["id"]
            }
            
            insert_stmt = insert(training_requirements).values(**requirement_data)
            db.execute(insert_stmt)
        
        db.commit()
    
    # Fetch created training type
    query = select(training_types).where(training_types.c.id == type_id)
    result = db.execute(query).fetchone()
    created_type = dict(result._mapping)
    return created_type

@router.put("/types/{type_id}", response_model=schemas.TrainingType)
def update_training_type(
    type_id: int, 
    type_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if training type exists
    query = select(training_types).where(training_types.c.id == type_id)
    existing_type = db.execute(query).fetchone()
    if existing_type is None:
        raise HTTPException(status_code=404, detail="Training type not found")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in type_data.items():
        if value is not None:
            update_values[key] = value
    
    # Update training type
    update_stmt = update(training_types).where(training_types.c.id == type_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated training type
    query = select(training_types).where(training_types.c.id == type_id)
    result = db.execute(query).fetchone()
    updated_type = dict(result._mapping)
    return updated_type

@router.delete("/types/{type_id}", response_model=dict)
def delete_training_type(
    type_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if training type exists
    query = select(training_types).where(training_types.c.id == type_id)
    existing_type = db.execute(query).fetchone()
    if existing_type is None:
        raise HTTPException(status_code=404, detail="Training type not found")
    
    # Delete all associated requirements first
    delete_requirements_stmt = delete(training_requirements).where(training_requirements.c.training_type_id == type_id)
    db.execute(delete_requirements_stmt)
    
    # Delete training type
    delete_type_stmt = delete(training_types).where(training_types.c.id == type_id)
    db.execute(delete_type_stmt)
    db.commit()
    
    return {"message": "Training type deleted successfully"}

# Training Records endpoints
@router.get("/records", response_model=List[schemas.TrainingRecord])
def get_training_records(
    skip: int = 0, 
    limit: int = 100, 
    employee_id: Optional[int] = None,
    training_type_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(employee_training_records)
    
    # Apply filters if provided
    if employee_id:
        query = query.where(employee_training_records.c.employee_id == employee_id)
    if training_type_id:
        query = query.where(employee_training_records.c.training_type_id == training_type_id)
    if status:
        query = query.where(employee_training_records.c.status == status)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    records_list = [dict(row._mapping) for row in result]
    return records_list

@router.post("/records", response_model=schemas.TrainingRecord)
def create_training_record(
    record_data: schemas.TrainingRecordCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if employee exists
    employee_query = select(employees).where(employees.c.id == record_data.employee_id)
    existing_employee = db.execute(employee_query).fetchone()
    if existing_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if training type exists
    training_query = select(training_types).where(training_types.c.id == record_data.training_type_id)
    existing_training = db.execute(training_query).fetchone()
    if existing_training is None:
        raise HTTPException(status_code=404, detail="Training type not found")
    
    # Calculate expiration date if validity period is set
    expiration_date = None
    if record_data.expiration_date:
        expiration_date = record_data.expiration_date
    elif existing_training and dict(existing_training._mapping)["validity_period_months"]:
        validity_months = dict(existing_training._mapping)["validity_period_months"]
        completed_date = record_data.completed_date
        # Add validity_months to the completed date
        expiration_date = date(
            year=completed_date.year + (completed_date.month + validity_months - 1) // 12,
            month=((completed_date.month + validity_months - 1) % 12) + 1,
            day=min(completed_date.day, 28)  # Avoid invalid dates in February
        )
    
    # Create training record
    new_record = {
        "employee_id": record_data.employee_id,
        "training_type_id": record_data.training_type_id,
        "completed_date": record_data.completed_date,
        "expiration_date": expiration_date,
        "instructor_name": record_data.instructor_name,
        "certificate_number": record_data.certificate_number,
        "training_score": record_data.training_score,
        "notes": record_data.notes,
        "status": record_data.status,
        "recorded_by": record_data.recorded_by or current_user["id"]
    }
    
    insert_stmt = insert(employee_training_records).values(**new_record)
    result = db.execute(insert_stmt)
    db.commit()
    
    record_id = result.inserted_primary_key[0]
    
    # Check if there are any pending requirements for this training type and employee
    requirements_query = select(training_requirements).where(
        (training_requirements.c.employee_id == record_data.employee_id) &
        (training_requirements.c.training_type_id == record_data.training_type_id) &
        (training_requirements.c.status == "pending")
    )
    
    pending_requirements = db.execute(requirements_query).fetchall()
    
    # Update pending requirements to completed
    for requirement in pending_requirements:
        requirement_id = dict(requirement._mapping)["id"]
        update_stmt = update(training_requirements).where(
            training_requirements.c.id == requirement_id
        ).values({
            "status": "completed",
            "completed_training_record_id": record_id
        })
        db.execute(update_stmt)
    
    db.commit()
    
    # Fetch created training record
    query = select(employee_training_records).where(employee_training_records.c.id == record_id)
    result = db.execute(query).fetchone()
    created_record = dict(result._mapping)
    return created_record

@router.put("/records/{record_id}", response_model=schemas.TrainingRecord)
def update_training_record(
    record_id: int, 
    record_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if training record exists
    query = select(employee_training_records).where(employee_training_records.c.id == record_id)
    existing_record = db.execute(query).fetchone()
    if existing_record is None:
        raise HTTPException(status_code=404, detail="Training record not found")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in record_data.items():
        if value is not None:
            update_values[key] = value
    
    # If completed_date is being updated and training type has a validity period, recalculate expiration_date
    if "completed_date" in update_values:
        training_type_id = dict(existing_record._mapping)["training_type_id"]
        training_query = select(training_types).where(training_types.c.id == training_type_id)
        training_type = db.execute(training_query).fetchone()
        
        if training_type and dict(training_type._mapping)["validity_period_months"]:
            validity_months = dict(training_type._mapping)["validity_period_months"]
            completed_date = update_values["completed_date"]
            
            # Calculate new expiration date
            new_expiration = date(
                year=completed_date.year + (completed_date.month + validity_months - 1) // 12,
                month=((completed_date.month + validity_months - 1) % 12) + 1,
                day=min(completed_date.day, 28)  # Avoid invalid dates in February
            )
            
            update_values["expiration_date"] = new_expiration
    
    # Update training record
    update_stmt = update(employee_training_records).where(employee_training_records.c.id == record_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated training record
    query = select(employee_training_records).where(employee_training_records.c.id == record_id)
    result = db.execute(query).fetchone()
    updated_record = dict(result._mapping)
    return updated_record

@router.delete("/records/{record_id}", response_model=dict)
def delete_training_record(
    record_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if training record exists
    query = select(employee_training_records).where(employee_training_records.c.id == record_id)
    existing_record = db.execute(query).fetchone()
    if existing_record is None:
        raise HTTPException(status_code=404, detail="Training record not found")
    
    # Update any requirements that reference this record
    update_stmt = update(training_requirements).where(
        training_requirements.c.completed_training_record_id == record_id
    ).values({
        "status": "pending",
        "completed_training_record_id": None
    })
    db.execute(update_stmt)
    
    # Delete training record
    delete_stmt = delete(employee_training_records).where(employee_training_records.c.id == record_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Training record deleted successfully"}

# Training Requirements endpoints
@router.get("/requirements", response_model=List[dict])
def get_training_requirements(
    skip: int = 0, 
    limit: int = 100, 
    employee_id: Optional[int] = None,
    training_type_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(training_requirements)
    
    # Apply filters if provided
    if employee_id:
        query = query.where(training_requirements.c.employee_id == employee_id)
    if training_type_id:
        query = query.where(training_requirements.c.training_type_id == training_type_id)
    if status:
        query = query.where(training_requirements.c.status == status)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    requirements_list = [dict(row._mapping) for row in result]
    return requirements_list

@router.post("/requirements", response_model=dict)
def create_training_requirement(
    requirement_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if employee exists
    employee_query = select(employees).where(employees.c.id == requirement_data["employee_id"])
    existing_employee = db.execute(employee_query).fetchone()
    if existing_employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if training type exists
    training_query = select(training_types).where(training_types.c.id == requirement_data["training_type_id"])
    existing_training = db.execute(training_query).fetchone()
    if existing_training is None:
        raise HTTPException(status_code=404, detail="Training type not found")
    
    # Create training requirement
    new_requirement = {
        "employee_id": requirement_data["employee_id"],
        "training_type_id": requirement_data["training_type_id"],
        "required_by_date": requirement_data.get("required_by_date"),
        "status": requirement_data.get("status", "pending"),
        "assigned_by": requirement_data.get("assigned_by", current_user["id"])
    }
    
    insert_stmt = insert(training_requirements).values(**new_requirement)
    result = db.execute(insert_stmt)
    db.commit()
    
    requirement_id = result.inserted_primary_key[0]
    
    # Fetch created requirement
    query = select(training_requirements).where(training_requirements.c.id == requirement_id)
    result = db.execute(query).fetchone()
    created_requirement = dict(result._mapping)
    return created_requirement

@router.put("/requirements/{requirement_id}", response_model=dict)
def update_training_requirement(
    requirement_id: int, 
    requirement_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if requirement exists
    query = select(training_requirements).where(training_requirements.c.id == requirement_id)
    existing_requirement = db.execute(query).fetchone()
    if existing_requirement is None:
        raise HTTPException(status_code=404, detail="Training requirement not found")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in requirement_data.items():
        if value is not None:
            update_values[key] = value
    
    # Update requirement
    update_stmt = update(training_requirements).where(training_requirements.c.id == requirement_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated requirement
    query = select(training_requirements).where(training_requirements.c.id == requirement_id)
    result = db.execute(query).fetchone()
    updated_requirement = dict(result._mapping)
    return updated_requirement

@router.delete("/requirements/{requirement_id}", response_model=dict)
def delete_training_requirement(
    requirement_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if requirement exists
    query = select(training_requirements).where(training_requirements.c.id == requirement_id)
    existing_requirement = db.execute(query).fetchone()
    if existing_requirement is None:
        raise HTTPException(status_code=404, detail="Training requirement not found")
    
    # Delete requirement
    delete_stmt = delete(training_requirements).where(training_requirements.c.id == requirement_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Training requirement deleted successfully"}

@router.get("/expiring", response_model=List[dict])
def get_expiring_trainings(
    days_threshold: int = 30,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Calculate the date threshold (e.g., 30 days from now)
    threshold_date = date.today() + timedelta(days=days_threshold)
    
    # Get all training records that expire before the threshold date
    query = select(employee_training_records).where(
        (employee_training_records.c.expiration_date <= threshold_date) &
        (employee_training_records.c.expiration_date >= date.today())
    )
    
    result = db.execute(query).fetchall()
    expiring_records = []
    
    for record in result:
        record_dict = dict(record._mapping)
        
        # Get employee details
        employee_query = select(employees).where(employees.c.id == record_dict["employee_id"])
        employee = db.execute(employee_query).fetchone()
        
        # Get training type details
        training_query = select(training_types).where(training_types.c.id == record_dict["training_type_id"])
        training = db.execute(training_query).fetchone()
        
        if employee and training:
            employee_dict = dict(employee._mapping)
            training_dict = dict(training._mapping)
            
            # Calculate days until expiration
            days_until_expiration = (record_dict["expiration_date"] - date.today()).days
            
            expiring_records.append({
                "record_id": record_dict["id"],
                "employee_id": record_dict["employee_id"],
                "employee_name": f"{employee_dict['first_name']} {employee_dict['last_name']}",
                "training_type_id": record_dict["training_type_id"],
                "training_name": training_dict["training_name"],
                "completed_date": record_dict["completed_date"],
                "expiration_date": record_dict["expiration_date"],
                "days_until_expiration": days_until_expiration,
                "is_mandatory": training_dict["is_mandatory"]
            })
    
    # Sort by days until expiration (ascending)
    expiring_records.sort(key=lambda x: x["days_until_expiration"])
    
    return expiring_records