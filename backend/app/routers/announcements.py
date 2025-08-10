# app/routers/announcements.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from ..database.database import get_db
from ..models.reflected_models import announcements, announcement_reads, employees, departments
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"],
)

@router.get("/", response_model=Dict)
def get_announcements(
    skip: int = 0, 
    limit: int = 20, 
    is_active: Optional[bool] = None,
    target_department: Optional[int] = None,
    announcement_type: Optional[str] = None,
    priority: Optional[str] = None,
    sort: str = "created_at",
    order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(announcements)
    count_query = select(func.count()).select_from(announcements)
    
    # Apply filters if provided
    if is_active is not None:
        query = query.where(announcements.c.is_active == is_active)
        count_query = count_query.where(announcements.c.is_active == is_active)
    if target_department:
        query = query.where(announcements.c.target_department == target_department)
        count_query = count_query.where(announcements.c.target_department == target_department)
    if announcement_type:
        query = query.where(announcements.c.announcement_type == announcement_type)
        count_query = count_query.where(announcements.c.announcement_type == announcement_type)
    if priority:
        query = query.where(announcements.c.priority == priority)
        count_query = count_query.where(announcements.c.priority == priority)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            announcements.c.title.ilike(search_pattern),
            announcements.c.message.ilike(search_pattern),
            announcements.c.announcement_type.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Only return non-expired announcements or ones with no expiration
    current_time = datetime.now()
    query = query.where(
        (announcements.c.expires_at > current_time) | 
        (announcements.c.expires_at.is_(None))
    )
    
    # Add sorting
    if hasattr(announcements.c, sort):
        sort_column = getattr(announcements.c, sort)
        if order.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    # Execute query
    result = db.execute(query).fetchall()
    announcements_list = rows_to_list(result)
    
    # Post-query filtering based on user role and department
    filtered_announcements = []
    for announcement in announcements_list:
        # Check if announcement has target roles and if user's role is in the target roles
        if announcement["target_roles"] and len(announcement["target_roles"]) > 0:
            if current_user["role"] not in announcement["target_roles"]:
                continue  # Skip this announcement
        
        # Check if announcement targets a specific department
        if announcement["target_department"] is not None:
            # Skip if not in the targeted department and not an admin
            if current_user["role"] != "admin" and announcement["target_department"] != current_user.get("department_id"):
                continue
        
        # If we get here, the announcement is relevant to this user
        filtered_announcements.append(announcement)
    
    # Get total count for pagination (before filtering)
    total_count = db.execute(count_query).scalar()
    
    # Return with pagination metadata
    return {
        "items": filtered_announcements,
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


@router.get("/stats", response_model=Dict)
def get_announcement_read_stats(
    skip: int = 0, 
    limit: int = 20,
    sort: str = "created_at",
    order: str = "desc", 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can view stats
):
    # Base query for active announcements
    announcements_query = select(announcements).where(announcements.c.is_active == True)
    count_query = select(func.count()).select_from(announcements).where(announcements.c.is_active == True)
    
    # Add sorting
    if hasattr(announcements.c, sort):
        sort_column = getattr(announcements.c, sort)
        if order.lower() == "asc":
            announcements_query = announcements_query.order_by(sort_column.asc())
        else:
            announcements_query = announcements_query.order_by(sort_column.desc())
    
    # Get total count for pagination
    total_count = db.execute(count_query).scalar()
    
    # Apply pagination
    announcements_query = announcements_query.offset(skip).limit(limit)
    
    # Execute query
    all_announcements = db.execute(announcements_query).fetchall()
    all_announcements = rows_to_list(all_announcements)
    
    stats = []
    
    for announcement in all_announcements:
        # Count total reads for this announcement
        reads_query = select(func.count()).select_from(announcement_reads).where(
            announcement_reads.c.announcement_id == announcement["id"]
        )
        total_reads = db.execute(reads_query).scalar() or 0
        
        # Count total employees who should read this announcement
        employees_query = select(func.count()).select_from(employees)
        
        # Filter by department if announcement targets a specific department
        if announcement["target_department"]:
            employees_query = employees_query.where(employees.c.department_id == announcement["target_department"])
        
        # Filter by position/role if announcement targets specific roles
        if announcement["target_roles"]:
            from sqlalchemy import or_
            role_conditions = []
            for role in announcement["target_roles"]:
                role_conditions.append(employees.c.position == role)
            
            if role_conditions:
                employees_query = employees_query.where(or_(*role_conditions))
        
        total_employees_count = db.execute(employees_query).scalar() or 0
        
        # Calculate read percentage
        read_percentage = 0
        if total_employees_count > 0:
            read_percentage = (total_reads / total_employees_count) * 100
        
        # Get creator name
        creator_query = select(employees).where(employees.c.id == announcement["created_by"])
        creator = db.execute(creator_query).fetchone()
        creator_name = None
        if creator:
            creator = row_to_dict(creator)
            creator_name = f"{creator['first_name']} {creator['last_name']}"
        
        stats.append({
            "announcement_id": announcement["id"],
            "title": announcement["title"],
            "created_at": announcement["created_at"],
            "created_by": announcement["created_by"],
            "creator_name": creator_name,
            "expires_at": announcement["expires_at"],
            "total_reads": total_reads,
            "total_employees": total_employees_count,
            "read_percentage": read_percentage
        })
    
    return {
        "items": stats,
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

@router.get("/{announcement_id}", response_model=schemas.Announcement)
def get_announcement(
    announcement_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(announcements).where(announcements.c.id == announcement_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Announcement not found")
    return row_to_dict(result)

@router.post("/", response_model=schemas.Announcement)
def create_announcement(
    announcement_data: schemas.AnnouncementCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can create announcements
):
    # Create new announcement with proper field mapping
    new_announcement = {
        "title": announcement_data.title,
        "message": announcement_data.message,  # Changed from content
        "announcement_type": announcement_data.announcement_type,
        "target_department": announcement_data.target_department,  # Changed from department
        "created_by": announcement_data.created_by,  # Changed from published_by
        "priority": announcement_data.priority,
        "is_active": announcement_data.is_active,
        "expires_at": announcement_data.expires_at,  # Changed from end_date
        "target_roles": announcement_data.target_roles
    }
    
    # Insert into database
    insert_stmt = insert(announcements).values(**new_announcement)
    result = db.execute(insert_stmt)
    db.commit()
    
    # Return created announcement
    announcement_id = result.inserted_primary_key[0]
    query = select(announcements).where(announcements.c.id == announcement_id)
    result = db.execute(query).fetchone()
    created_announcement = row_to_dict(result)
    return created_announcement

@router.put("/{announcement_id}", response_model=schemas.Announcement)
def update_announcement(
    announcement_id: int, 
    announcement_data: schemas.AnnouncementUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can update announcements
):
    # Check if announcement exists
    query = select(announcements).where(announcements.c.id == announcement_id)
    existing_announcement = db.execute(query).fetchone()
    if existing_announcement is None:
        raise_api_error(404, "Announcement not found")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    
    # Map fields from schema to database columns
    field_mapping = {
        "title": "title",
        "message": "message",
        "announcement_type": "announcement_type",
        "target_department": "target_department",
        "priority": "priority",
        "is_active": "is_active",
        "expires_at": "expires_at",
        "target_roles": "target_roles"
    }
    
    # Convert Pydantic model to dict and apply field mapping
    announcement_dict = announcement_data.dict(exclude_unset=True)
    for schema_field, db_field in field_mapping.items():
        if schema_field in announcement_dict and announcement_dict[schema_field] is not None:
            update_values[db_field] = announcement_dict[schema_field]
    
    # Update announcement if there are values to update
    if update_values:
        update_stmt = update(announcements).where(announcements.c.id == announcement_id).values(**update_values)
        db.execute(update_stmt)
        db.commit()
    
    # Fetch updated announcement
    query = select(announcements).where(announcements.c.id == announcement_id)
    result = db.execute(query).fetchone()
    updated_announcement = row_to_dict(result)
    return updated_announcement

@router.delete("/{announcement_id}", response_model=dict)
def delete_announcement(
    announcement_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can delete announcements
):
    # Check if announcement exists
    query = select(announcements).where(announcements.c.id == announcement_id)
    existing_announcement = db.execute(query).fetchone()
    if existing_announcement is None:
        raise_api_error(404, "Announcement not found")
    
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
        raise_api_error(404, "Announcement not found")
    
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
        raise_api_error(400, "Current user is not associated with an employee")
    
    employee_query = select(employees).where(employees.c.id == employee_id)
    employee = db.execute(employee_query).fetchone()
    
    if not employee:
        raise_api_error(404, "Employee not found")
    
    employee = row_to_dict(employee)
    
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
    
    # Execute the query first since we need to do post-filtering based on role
    all_announcements = db.execute(announcements_query).fetchall()
    all_announcements = rows_to_list(all_announcements)
    
    # Get all announcements that this employee has already read
    read_query = select(announcement_reads).where(announcement_reads.c.employee_id == employee_id)
    read_announcements = db.execute(read_query).fetchall()
    read_announcements = rows_to_list(read_announcements)
    
    # Create a set of IDs of read announcements for quick lookup
    read_announcement_ids = {read["announcement_id"] for read in read_announcements}
    
    # Filter out announcements that have been read and filter by user role
    unread_announcements = []
    for announcement in all_announcements:
        # Skip if already read
        if announcement["id"] in read_announcement_ids:
            continue
        
        # Check if announcement has target roles and if user's role is in the target roles
        if announcement["target_roles"] and len(announcement["target_roles"]) > 0:
            if current_user["role"] not in announcement["target_roles"]:
                continue  # Skip this announcement
        
        # Get the creator's name
        creator_query = select(employees).where(employees.c.id == announcement["created_by"])
        creator = db.execute(creator_query).fetchone()
        
        if creator:
            creator = row_to_dict(creator)
            announcement["creator_name"] = f"{creator['first_name']} {creator['last_name']}"
        
        # Get the target department name if applicable
        if announcement["target_department"]:
            dept_query = select(departments).where(departments.c.id == announcement["target_department"])
            dept = db.execute(dept_query).fetchone()
            
            if dept:
                dept = row_to_dict(dept)
                announcement["target_department_name"] = dept["name"]
        
        unread_announcements.append(announcement)
    
    # Sort by priority and then by creation date (newest first)
    priority_order = {"high": 0, "normal": 1, "low": 2}
    unread_announcements.sort(
        key=lambda x: (
            priority_order.get(x["priority"], 3),
            -datetime.timestamp(x["created_at"])
        )
    )
    
    return unread_announcements