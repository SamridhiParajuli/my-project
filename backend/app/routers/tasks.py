# app/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from typing import List, Optional, Dict
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import tasks
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
)

@router.get("/", response_model=Dict)
def get_tasks(
    skip: int = 0, 
    limit: int = 20, 
    department_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    status: Optional[str] = None,
    is_urgent: Optional[bool] = None,
    sort: str = "created_at",
    order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(tasks)
    count_query = select(func.count()).select_from(tasks)
    
    # Add filters if provided
    if department_id:
        query = query.where(tasks.c.department_id == department_id)
        count_query = count_query.where(tasks.c.department_id == department_id)
    if assigned_to:
        query = query.where(tasks.c.assigned_to == assigned_to)
        count_query = count_query.where(tasks.c.assigned_to == assigned_to)
    if status:
        query = query.where(tasks.c.status == status)
        count_query = count_query.where(tasks.c.status == status)
    if is_urgent is not None:
        query = query.where(tasks.c.is_urgent == is_urgent)
        count_query = count_query.where(tasks.c.is_urgent == is_urgent)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            tasks.c.title.ilike(search_pattern),
            tasks.c.description.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(tasks.c, sort):
        sort_column = getattr(tasks.c, sort)
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
    tasks_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": tasks_list,
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

@router.get("/{task_id}", response_model=schemas.Task)
def get_task(
    task_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(tasks).where(tasks.c.id == task_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Task not found")
    return row_to_dict(result)

@router.post("/", response_model=schemas.Task)
def create_task(
    task: schemas.TaskCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    new_task = {
        "title": task.title,
        "description": task.description,
        "department_id": task.department_id,
        "assigned_by": task.assigned_by or current_user["id"],
        "assigned_to": task.assigned_to,
        "assigned_to_department": task.assigned_to_department,
        "is_urgent": task.is_urgent,
        "due_date": task.due_date,
        "status": task.status,
        "is_completed": True if task.status == "completed" else False
    }
    
    insert_stmt = insert(tasks).values(**new_task)
    result = db.execute(insert_stmt)
    db.commit()
    
    task_id = result.inserted_primary_key[0]
    query = select(tasks).where(tasks.c.id == task_id)
    result = db.execute(query).fetchone()
    created_task = row_to_dict(result)
    return created_task

@router.put("/{task_id}", response_model=schemas.Task)
def update_task(
    task_id: int, 
    task: schemas.TaskUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if task exists
    query = select(tasks).where(tasks.c.id == task_id)
    existing_task = db.execute(query).fetchone()
    if existing_task is None:
        raise_api_error(404, "Task not found")
    
    # Check if current user is authorized to update this task
    # Either the task is assigned to them, they assigned it, or they're a manager/admin
    existing_task_dict = row_to_dict(existing_task)
    is_task_owner = (
        existing_task_dict["assigned_to"] == current_user["id"] or
        existing_task_dict["assigned_by"] == current_user["id"] or
        current_user["role"] in ["admin", "manager"]
    )
    
    if not is_task_owner:
        raise_api_error(403, "You do not have permission to update this task")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    if task.title is not None:
        update_values["title"] = task.title
    if task.description is not None:
        update_values["description"] = task.description
    if task.assigned_to is not None:
        update_values["assigned_to"] = task.assigned_to
    if task.is_urgent is not None:
        update_values["is_urgent"] = task.is_urgent
    if task.due_date is not None:
        update_values["due_date"] = task.due_date
    if task.status is not None:
        update_values["status"] = task.status
        # Update is_completed based on status
        update_values["is_completed"] = (task.status == "completed")
        # Set completed_at timestamp if completed
        if task.status == "completed":
            update_values["completed_at"] = datetime.now()
    
    # Update task
    update_stmt = update(tasks).where(tasks.c.id == task_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated task
    query = select(tasks).where(tasks.c.id == task_id)
    result = db.execute(query).fetchone()
    updated_task = row_to_dict(result)
    return updated_task

@router.patch("/{task_id}/status", response_model=schemas.Task)
def update_task_status(
    task_id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if task exists
    query = select(tasks).where(tasks.c.id == task_id)
    existing_task = db.execute(query).fetchone()
    if existing_task is None:
        raise_api_error(404, "Task not found")
    
    existing_task_dict = row_to_dict(existing_task)
    
    # Check if current user is authorized to update this task
    is_task_owner = (
        existing_task_dict["assigned_to"] == current_user["id"] or
        existing_task_dict["assigned_by"] == current_user["id"] or
        current_user["role"] in ["admin", "manager"]
    )
    
    if not is_task_owner:
        raise_api_error(403, "You do not have permission to update this task")
    
    # Validate status
    if "status" not in status_update:
        raise_api_error(400, "Status field is required")
    
    # Update status
    update_values = {"status": status_update.get("status")}
    
    # If status is "completed", set completed_at timestamp and is_completed flag
    if status_update.get("status") == "completed":
        update_values["completed_at"] = datetime.now()
        update_values["is_completed"] = True
    else:
        update_values["is_completed"] = False
        # If task was previously completed and now it's not, reset completed_at
        if existing_task_dict["status"] == "completed":
            update_values["completed_at"] = None
    
    update_stmt = update(tasks).where(tasks.c.id == task_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated task
    query = select(tasks).where(tasks.c.id == task_id)
    result = db.execute(query).fetchone()
    updated_task = row_to_dict(result)
    return updated_task

@router.delete("/{task_id}", response_model=dict)
def delete_task(
    task_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if task exists
    query = select(tasks).where(tasks.c.id == task_id)
    existing_task = db.execute(query).fetchone()
    if existing_task is None:
        raise_api_error(404, "Task not found")
    
    existing_task_dict = row_to_dict(existing_task)
    
    # Check if current user is authorized to delete this task
    # Only the user who assigned the task or a manager/admin can delete it
    is_authorized = (
        existing_task_dict["assigned_by"] == current_user["id"] or
        current_user["role"] in ["admin", "manager"]
    )
    
    if not is_authorized:
        raise_api_error(403, "You do not have permission to delete this task")
    
    # Delete task
    delete_stmt = delete(tasks).where(tasks.c.id == task_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Task deleted successfully"}