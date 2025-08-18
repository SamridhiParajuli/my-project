# app/routers/reminders.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_, and_
from typing import List, Optional, Dict
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import reminders
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/reminders",
    tags=["reminders"],
)

@router.get("/", response_model=Dict)
def get_reminders(
    skip: int = 0, 
    limit: int = 100, 
    sort: str = "reminder_date",
    order: str = "asc",
    completed: Optional[bool] = False,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get all reminders for the current user.
    Filter by completed status and priority if provided.
    """
    # Base query for user's reminders
    query = select(reminders).where(reminders.c.user_id == current_user["id"])
    count_query = select(func.count()).select_from(reminders).where(reminders.c.user_id == current_user["id"])
    
    # Add filters
    if completed is not None:
        query = query.where(reminders.c.is_completed == completed)
        count_query = count_query.where(reminders.c.is_completed == completed)
    
    if priority:
        query = query.where(reminders.c.priority == priority)
        count_query = count_query.where(reminders.c.priority == priority)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            reminders.c.title.ilike(search_pattern),
            reminders.c.description.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(reminders.c, sort):
        sort_column = getattr(reminders.c, sort)
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
    reminders_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": reminders_list,
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

@router.get("/upcoming", response_model=List[schemas.Reminder])
def get_upcoming_reminders(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get upcoming reminders for the next X days that are not completed.
    """
    now = datetime.now()
    # Calculate date range (now to now + days)
    from_date = now
    
    # Query for upcoming reminders
    query = select(reminders).where(
        and_(
            reminders.c.user_id == current_user["id"],
            reminders.c.is_completed == False,
            reminders.c.reminder_date >= from_date
        )
    ).order_by(reminders.c.reminder_date.asc())
    
    result = db.execute(query).fetchall()
    upcoming_reminders = rows_to_list(result)
    
    return upcoming_reminders

@router.get("/today", response_model=List[schemas.Reminder])
def get_today_reminders(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get reminders for today that are not completed.
    """
    # Get today's date with time set to midnight
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today.replace(day=today.day + 1)
    
    # Query for today's reminders
    query = select(reminders).where(
        and_(
            reminders.c.user_id == current_user["id"],
            reminders.c.is_completed == False,
            reminders.c.reminder_date >= today,
            reminders.c.reminder_date < tomorrow
        )
    ).order_by(reminders.c.reminder_date.asc())
    
    result = db.execute(query).fetchall()
    today_reminders = rows_to_list(result)
    
    return today_reminders

@router.get("/{reminder_id}", response_model=schemas.Reminder)
def get_reminder(
    reminder_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get a specific reminder by ID.
    Only the owner can access their reminder.
    """
    query = select(reminders).where(
        and_(
            reminders.c.id == reminder_id,
            reminders.c.user_id == current_user["id"]
        )
    )
    
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Reminder not found")
        
    return row_to_dict(result)

@router.post("/", response_model=schemas.Reminder)
def create_reminder(
    reminder: schemas.ReminderCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Create a new reminder for the current user.
    """
    try:
        # Get current datetime
        now = datetime.now()
        
        # Prepare reminder data
        new_reminder = {
            "user_id": current_user["id"],
            "title": reminder.title,
            "description": reminder.description,
            "reminder_date": reminder.reminder_date,
            "priority": reminder.priority,
            "is_completed": reminder.is_completed,
            "repeat_type": reminder.repeat_type,
            "created_at": now,
            "updated_at": now
        }
        
        # Insert into database
        insert_stmt = insert(reminders).values(**new_reminder)
        result = db.execute(insert_stmt)
        db.commit()
        
        # Get the inserted reminder
        reminder_id = result.inserted_primary_key[0]
        query = select(reminders).where(reminders.c.id == reminder_id)
        result = db.execute(query).fetchone()
        
        return row_to_dict(result)
        
    except Exception as e:
        db.rollback()
        print(f"Error creating reminder: {str(e)}")
        raise_api_error(500, f"Failed to create reminder: {str(e)}")

@router.put("/{reminder_id}", response_model=schemas.Reminder)
def update_reminder(
    reminder_id: int, 
    reminder: schemas.ReminderUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update a reminder.
    Only the owner can update their reminder.
    """
    try:
        # Check if reminder exists and belongs to current user
        query = select(reminders).where(
            and_(
                reminders.c.id == reminder_id,
                reminders.c.user_id == current_user["id"]
            )
        )
        existing_reminder = db.execute(query).fetchone()
        
        if existing_reminder is None:
            raise_api_error(404, "Reminder not found")
        
        # Prepare update values (only include fields that were provided)
        update_values = {}
        for key, value in reminder.dict(exclude_unset=True).items():
            update_values[key] = value
        
        # Add updated_at timestamp
        update_values["updated_at"] = datetime.now()
        
        # Update reminder
        update_stmt = update(reminders).where(reminders.c.id == reminder_id).values(**update_values)
        db.execute(update_stmt)
        db.commit()
        
        # Fetch updated reminder
        query = select(reminders).where(reminders.c.id == reminder_id)
        result = db.execute(query).fetchone()
        
        return row_to_dict(result)
        
    except Exception as e:
        db.rollback()
        print(f"Error updating reminder: {str(e)}")
        raise_api_error(500, f"Failed to update reminder: {str(e)}")

@router.patch("/{reminder_id}/complete", response_model=schemas.Reminder)
def complete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Mark a reminder as completed.
    Only the owner can complete their reminder.
    """
    try:
        # Check if reminder exists and belongs to current user
        query = select(reminders).where(
            and_(
                reminders.c.id == reminder_id,
                reminders.c.user_id == current_user["id"]
            )
        )
        existing_reminder = db.execute(query).fetchone()
        
        if existing_reminder is None:
            raise_api_error(404, "Reminder not found")
        
        # Update reminder to completed
        update_stmt = update(reminders).where(reminders.c.id == reminder_id).values({
            "is_completed": True,
            "updated_at": datetime.now()
        })
        db.execute(update_stmt)
        db.commit()
        
        # Fetch updated reminder
        query = select(reminders).where(reminders.c.id == reminder_id)
        result = db.execute(query).fetchone()
        
        return row_to_dict(result)
        
    except Exception as e:
        db.rollback()
        print(f"Error completing reminder: {str(e)}")
        raise_api_error(500, f"Failed to complete reminder: {str(e)}")

@router.delete("/{reminder_id}", response_model=dict)
def delete_reminder(
    reminder_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Delete a reminder.
    Only the owner can delete their reminder.
    """
    try:
        # Check if reminder exists and belongs to current user
        query = select(reminders).where(
            and_(
                reminders.c.id == reminder_id,
                reminders.c.user_id == current_user["id"]
            )
        )
        existing_reminder = db.execute(query).fetchone()
        
        if existing_reminder is None:
            raise_api_error(404, "Reminder not found")
        
        # Delete reminder
        delete_stmt = delete(reminders).where(reminders.c.id == reminder_id)
        db.execute(delete_stmt)
        db.commit()
        
        return {"message": "Reminder deleted successfully"}
        
    except Exception as e:
        db.rollback()
        print(f"Error deleting reminder: {str(e)}")
        raise_api_error(500, f"Failed to delete reminder: {str(e)}")