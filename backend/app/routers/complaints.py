# app/routers/complaints.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from typing import List, Optional, Dict
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import customer_complaints
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/complaints",
    tags=["customer complaints"],
)

@router.get("/", response_model=Dict)
def get_complaints(
    skip: int = 0, 
    limit: int = 20, 
    status: Optional[str] = None,
    severity: Optional[str] = None,
    department_involved: Optional[int] = None,
    sort: str = "created_at",
    order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(customer_complaints)
    count_query = select(func.count()).select_from(customer_complaints)
    
    # Add filters if provided
    if status:
        query = query.where(customer_complaints.c.status == status)
        count_query = count_query.where(customer_complaints.c.status == status)
    if severity:
        query = query.where(customer_complaints.c.severity == severity)
        count_query = count_query.where(customer_complaints.c.severity == severity)
    if department_involved:
        query = query.where(customer_complaints.c.department_involved == department_involved)
        count_query = count_query.where(customer_complaints.c.department_involved == department_involved)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            customer_complaints.c.customer_name.ilike(search_pattern),
            customer_complaints.c.customer_email.ilike(search_pattern),
            customer_complaints.c.description.ilike(search_pattern),
            customer_complaints.c.complaint_type.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(customer_complaints.c, sort):
        sort_column = getattr(customer_complaints.c, sort)
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
    complaints_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": complaints_list,
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

@router.get("/{complaint_id}", response_model=schemas.Complaint)
def get_complaint(
    complaint_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Complaint not found")
    return row_to_dict(result)

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
    created_complaint = row_to_dict(result)
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
        raise_api_error(404, "Complaint not found")
    
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
    updated_complaint = row_to_dict(result)
    return updated_complaint

@router.patch("/{complaint_id}/status", response_model=schemas.Complaint)
def update_complaint_status(
    complaint_id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if complaint exists
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    existing_complaint = db.execute(query).fetchone()
    if existing_complaint is None:
        raise_api_error(404, "Complaint not found")
    
    # Validate status
    if "status" not in status_update:
        raise_api_error(400, "Status field is required")
    
    # Update status
    update_values = {"status": status_update.get("status")}
    
    # If status is "resolved", set resolved_at timestamp
    if status_update.get("status") == "resolved":
        update_values["resolved_at"] = datetime.now()
    
    update_stmt = update(customer_complaints).where(customer_complaints.c.id == complaint_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated complaint
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    result = db.execute(query).fetchone()
    updated_complaint = row_to_dict(result)
    return updated_complaint

@router.delete("/{complaint_id}", response_model=dict)
def delete_complaint(
    complaint_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can delete complaints
):
    # Check if complaint exists
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    existing_complaint = db.execute(query).fetchone()
    if existing_complaint is None:
        raise_api_error(404, "Complaint not found")
    
    # Delete complaint
    delete_stmt = delete(customer_complaints).where(customer_complaints.c.id == complaint_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Complaint deleted successfully"}