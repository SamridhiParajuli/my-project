# app/routers/announcements.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete,func, or_
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from ..database.database import get_db
from ..models.reflected_models import announcements, announcement_reads, employees, departments
from ..schemas import schemas
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"],
)

@router.get("/", response_model=List[schemas.Announcement])
def get_announcements(
    skip: int = 0, 
    limit: int = 100, 
    is_active: Optional[bool] = None,
    target_department: Optional[int] = None,
    announcement_type: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(announcements)
    
    # Apply filters if provided
    if is_active is not None:
        query = query.where(announcements.c.is_active == is_active)
    if target_department:
        query = query.where(announcements.c.target_department == target_department)
    if announcement_type:
        query = query.where(announcements.c.announcement_type == announcement_type)
    if priority:
        query = query.where(announcements.c.priority == priority)
    
    # Only return non-expired announcements or ones with no expiration
    current_time = datetime.now()
    query = query.where(
        (announcements.c.expires_at > current_time) | 
        (announcements.c.expires_at.is_(None))
    )
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    announcements_list = [dict(row._mapping) for row in result]
    return announcements_list

@router.get("/{announcement_id}", response_model=schemas.Announcement)
def get_announcement(
    announcement_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(announcements).where(announcements.c.id == announcement_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return dict(result._mapping)

@router.post("/", response_model=schemas.Announcement)
def create_announcement(
    announcement_data: schemas.AnnouncementCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    new_announcement = {
        "title": announcement_data.title,
        "message": announcement_data.message,
        "announcement_type": announcement_data.announcement_type,
        "target_department": announcement_data.target_department,
        "created_by": announcement_data.created_by or current_user["id"],
        "priority": announcement_data.priority,
        "is_active": announcement_data.is_active,
        "expires_at": announcement_data.expires_at,
        "target_roles": announcement_data.target_roles
    }
    
    insert_stmt = insert(announcements).values(**new_announcement)
    result = db.execute(insert_stmt)
    db.commit()
    
    announcement_id = result.inserted_primary_key[0]
    query = select(announcements).where(announcements.c.id == announcement_id)
    result = db.execute(query).fetchone()
    created_announcement = dict(result._mapping)
    return created_announcement

@router.put("/{announcement_id}", response_model=schemas.Announcement)
def update_announcement(
    announcement_id: int, 
    announcement_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if announcement exists
    query = select(announcements).where(announcements.c.id == announcement_id)
    existing_announcement = db.execute(query).fetchone()
    if existing_announcement is None:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in announcement_data.items():
        if value is not None:
            update_values[key] = value
    
    # Update announcement
    update_stmt = update(announcements).where(announcements.c.id == announcement_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated announcement
    query = select(announcements).where(announcements.c.id == announcement_id)
    result = db.execute(query).fetchone()
    updated_announcement = dict(result._mapping)
    return updated_announcement

@router.delete("/{announcement_id}", response_model=dict)
def delete_announcement(
    announcement_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if announcement exists
    query = select(announcements).where(announcements.c.id == announcement_id)
    existing_announcement = db.execute(query).fetchone()
    if existing_announcement is None:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Delete all reads for this announcement
    delete_reads_stmt = delete(announcement_reads).where(announcement_reads.c.announcement_id == announcement_id)
    db.execute(delete_reads_stmt)
    
    # Delete announcement
    delete_stmt = delete(announcements).where(announcements.c.id == announcement_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Announcement deleted successfully"}

@router.post("/{announcement_id}/read", response_model=dict)
def mark_announcement_as_read(
    announcement_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if announcement exists
    query = select(announcements).where(announcements.c.id == announcement_id)
    existing_announcement = db.execute(query).fetchone()
    if existing_announcement is None:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Check if this employee has already read this announcement
    read_query = select(announcement_reads).where(
        (announcement_reads.c.announcement_id == announcement_id) &
        (announcement_reads.c.employee_id == current_user["employee_id"])
    )
    existing_read = db.execute(read_query).fetchone()
    
    if existing_read is None:
        # Create new read record
        new_read = {
            "announcement_id": announcement_id,
            "employee_id": current_user["employee_id"],
            "department_id": current_user["department_id"]
        }
        
        insert_stmt = insert(announcement_reads).values(**new_read)
        db.execute(insert_stmt)
        db.commit()
    
    return {"message": "Announcement marked as read"}

@router.get("/unread/me", response_model=List[dict])
def get_unread_announcements(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Get employee details
    employee_id = current_user["employee_id"]
    
    if not employee_id:
        raise HTTPException(status_code=400, detail="Current user is not associated with an employee")
    
    employee_query = select(employees).where(employees.c.id == employee_id)
    employee = db.execute(employee_query).fetchone()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee = dict(employee._mapping)
    
    # Get all active announcements that are relevant to this employee
    # (either targeted to their department, or not targeted to any department)
    current_time = datetime.now()
    
    announcements_query = select(announcements).where(
        (announcements.c.is_active == True) &
        ((announcements.c.expires_at > current_time) | (announcements.c.expires_at.is_(None))) &
        (
            (announcements.c.target_department.is_(None)) |
            (announcements.c.target_department == employee["department_id"])
        )
    )
    
    if employee["position"]:
        # If target_roles contains the employee's position
        from sqlalchemy import func
        announcements_query = announcements_query.where(
            (announcements.c.target_roles.is_(None)) |
            (func.array_position(announcements.c.target_roles, employee["position"]) > 0)
        )
    
    all_announcements = db.execute(announcements_query).fetchall()
    
    # Get all announcements that this employee has already read
    read_query = select(announcement_reads).where(announcement_reads.c.employee_id == employee_id)
    read_announcements = db.execute(read_query).fetchall()
    
    # Create a set of IDs of read announcements for quick lookup
    read_announcement_ids = {dict(read._mapping)["announcement_id"] for read in read_announcements}
    
    # Filter out announcements that have been read
    unread_announcements = []
    for announcement in all_announcements:
        announcement_dict = dict(announcement._mapping)
        if announcement_dict["id"] not in read_announcement_ids:
            # Get the creator's name
            creator_query = select(employees).where(employees.c.id == announcement_dict["created_by"])
            creator = db.execute(creator_query).fetchone()
            
            if creator:
                creator_dict = dict(creator._mapping)
                announcement_dict["creator_name"] = f"{creator_dict['first_name']} {creator_dict['last_name']}"
            
            # Get the target department name if applicable
            if announcement_dict["target_department"]:
                dept_query = select(departments).where(departments.c.id == announcement_dict["target_department"])
                dept = db.execute(dept_query).fetchone()
                
                if dept:
                    dept_dict = dict(dept._mapping)
                    announcement_dict["target_department_name"] = dept_dict["name"]
            
            unread_announcements.append(announcement_dict)
    
    # Sort by priority and then by creation date (newest first)
    priority_order = {"high": 0, "normal": 1, "low": 2}
    unread_announcements.sort(
        key=lambda x: (
            priority_order.get(x["priority"], 3),
            -datetime.timestamp(x["created_at"])
        )
    )
    
    return unread_announcements

@router.get("/stats", response_model=List[dict])
def get_announcement_read_stats(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Get all active announcements
    announcements_query = select(announcements).where(announcements.c.is_active == True).offset(skip).limit(limit)
    all_announcements = db.execute(announcements_query).fetchall()
    
    stats = []
    
    for announcement in all_announcements:
        announcement_dict = dict(announcement._mapping)
        
        # Count total reads for this announcement
        reads_query = select(announcement_reads).where(announcement_reads.c.announcement_id == announcement_dict["id"])
        reads = db.execute(reads_query).fetchall()
        
        total_reads = len(reads)
        
        # Count total employees who should read this announcement
        employees_query = select(employees)
        
        # Filter by department if announcement targets a specific department
        if announcement_dict["target_department"]:
            employees_query = employees_query.where(employees.c.department_id == announcement_dict["target_department"])
        
        # Filter by position/role if announcement targets specific roles
        if announcement_dict["target_roles"]:
            from sqlalchemy import or_
            role_conditions = []
            for role in announcement_dict["target_roles"]:
                role_conditions.append(employees.c.position == role)
            
            if role_conditions:
                employees_query = employees_query.where(or_(*role_conditions))
        
        total_employees = db.execute(employees_query).fetchall()
        total_employees_count = len(total_employees)
        
        # Calculate read percentage
        read_percentage = 0
        if total_employees_count > 0:
            read_percentage = (total_reads / total_employees_count) * 100
        
        # Get creator name
        creator_query = select(employees).where(employees.c.id == announcement_dict["created_by"])
        creator = db.execute(creator_query).fetchone()
        creator_name = None
        if creator:
            creator_dict = dict(creator._mapping)
            creator_name = f"{creator_dict['first_name']} {creator_dict['last_name']}"
        
        stats.append({
            "announcement_id": announcement_dict["id"],
            "title": announcement_dict["title"],
            "created_at": announcement_dict["created_at"],
            "created_by": announcement_dict["created_by"],
            "creator_name": creator_name,
            "expires_at": announcement_dict["expires_at"],
            "total_reads": total_reads,
            "total_employees": total_employees_count,
            "read_percentage": read_percentage
        })
    
    return stats