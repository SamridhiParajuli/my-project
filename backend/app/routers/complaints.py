# app/routers/complaints.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete
from typing import List, Optional
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import customer_complaints
from ..schemas import schemas
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/complaints",
    tags=["customer complaints"],
)

@router.get("/", response_model=List[schemas.Complaint])
def get_complaints(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    severity: Optional[str] = None,
    department_involved: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(customer_complaints)
    
    # Add filters if provided
    if status:
        query = query.where(customer_complaints.c.status == status)
    if severity:
        query = query.where(customer_complaints.c.severity == severity)
    if department_involved:
        query = query.where(customer_complaints.c.department_involved == department_involved)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    complaints_list = [dict(row._mapping) for row in result]
    return complaints_list

@router.get("/{complaint_id}", response_model=schemas.Complaint)
def get_complaint(
    complaint_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return dict(result._mapping)

@router.post("/", response_model=schemas.Complaint)
def create_complaint(
    complaint: schemas.ComplaintCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    new_complaint = {
        "customer_name": complaint.customer_name,
        "customer_email": complaint.customer_email,
        "customer_phone": complaint.customer_phone,
        "complaint_type": complaint.complaint_type,
        "description": complaint.description,
        "department_involved": complaint.department_involved,
        "reported_by": complaint.reported_by or current_user["id"],
        "severity": complaint.severity,
        "status": complaint.status,
        "resolution": complaint.resolution
    }
    
    insert_stmt = insert(customer_complaints).values(**new_complaint)
    result = db.execute(insert_stmt)
    db.commit()
    
    complaint_id = result.inserted_primary_key[0]
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    result = db.execute(query).fetchone()
    created_complaint = dict(result._mapping)
    return created_complaint

@router.put("/{complaint_id}", response_model=schemas.Complaint)
def update_complaint(
    complaint_id: int, 
    complaint: schemas.ComplaintUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if complaint exists
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    existing_complaint = db.execute(query).fetchone()
    if existing_complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in complaint.dict(exclude_unset=True).items():
        if value is not None:
            update_values[key] = value
    
    # Set resolved_at timestamp if status is changing to resolved
    if "status" in update_values and update_values["status"] == "resolved":
        update_values["resolved_at"] = datetime.now()
    
    # Update complaint
    update_stmt = update(customer_complaints).where(customer_complaints.c.id == complaint_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated complaint
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    result = db.execute(query).fetchone()
    updated_complaint = dict(result._mapping)
    return updated_complaint

@router.delete("/{complaint_id}", response_model=dict)
def delete_complaint(
    complaint_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if complaint exists
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    existing_complaint = db.execute(query).fetchone()
    if existing_complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Delete complaint
    delete_stmt = delete(customer_complaints).where(customer_complaints.c.id == complaint_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Complaint deleted successfully"}