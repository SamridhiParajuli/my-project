# app/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_, and_
from typing import List, Optional, Dict
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import tasks, employees, departments
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
    assigned_to_department: Optional[int] = None,
    status: Optional[str] = None,
    is_urgent: Optional[bool] = None,
    sort: str = "created_at",
    order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query with joins to get names
    base_query = select(
        tasks,
        employees.c.first_name.label("assigned_to_first_name"),
        employees.c.last_name.label("assigned_to_last_name"),
        departments.c.name.label("department_name")
    ).select_from(
        tasks.outerjoin(
            employees, tasks.c.assigned_to == employees.c.id
        ).outerjoin(
            departments, tasks.c.department_id == departments.c.id
        )
    )
    
    # Count query for pagination
    count_query = select(func.count()).select_from(tasks)
    
    # Add filters if provided
    if department_id:
        base_query = base_query.where(tasks.c.department_id == department_id)
        count_query = count_query.where(tasks.c.department_id == department_id)
    if assigned_to:
        base_query = base_query.where(tasks.c.assigned_to == assigned_to)
        count_query = count_query.where(tasks.c.assigned_to == assigned_to)
    if assigned_to_department:
        base_query = base_query.where(tasks.c.assigned_to_department == assigned_to_department)
        count_query = count_query.where(tasks.c.assigned_to_department == assigned_to_department)
    if status:
        base_query = base_query.where(tasks.c.status == status)
        count_query = count_query.where(tasks.c.status == status)
    if is_urgent is not None:
        base_query = base_query.where(tasks.c.is_urgent == is_urgent)
        count_query = count_query.where(tasks.c.is_urgent == is_urgent)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            tasks.c.title.ilike(search_pattern),
            tasks.c.description.ilike(search_pattern)
        )
        base_query = base_query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(tasks.c, sort):
        sort_column = getattr(tasks.c, sort)
        if order.lower() == "asc":
            base_query = base_query.order_by(sort_column.asc())
        else:
            base_query = base_query.order_by(sort_column.desc())
    
    # Get total count for pagination
    total_count = db.execute(count_query).scalar()
    
    # Apply pagination
    query = base_query.offset(skip).limit(limit)
    
    # Execute query
    result = db.execute(query).fetchall()
    
    # Process the results to add name fields
    tasks_list = []
    for row in result:
        task_dict = {}
        for key in tasks.columns.keys():
            task_dict[key] = getattr(row, key)
        
        # Add the joined names
        if row.assigned_to_first_name and row.assigned_to_last_name:
            task_dict["assigned_to_name"] = f"{row.assigned_to_first_name} {row.assigned_to_last_name}"
        task_dict["department_name"] = row.department_name
        
        tasks_list.append(task_dict)
    
    # Add assigned_by names in a separate query to avoid complex joins
    if tasks_list:
        # Get all unique assigned_by IDs
        assigned_by_ids = set(task["assigned_by"] for task in tasks_list if task["assigned_by"])
        
        if assigned_by_ids:
            # Query to get all employee names at once
            employees_query = select(
                employees.c.id,
                employees.c.first_name,
                employees.c.last_name
            ).where(employees.c.id.in_(assigned_by_ids))
            
            employees_result = db.execute(employees_query).fetchall()
            
            # Create a map of employee ID to name
            employee_map = {
                row.id: f"{row.first_name} {row.last_name}" 
                for row in employees_result
            }
            
            # Update tasks with employee names
            for task in tasks_list:
                if task["assigned_by"] and task["assigned_by"] in employee_map:
                    task["assigned_by_name"] = employee_map[task["assigned_by"]]
    
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

@router.get("/department/{department_id}", response_model=Dict)
def get_department_tasks(
    department_id: int,
    skip: int = 0, 
    limit: int = 20,
    status: Optional[str] = None,
    is_urgent: Optional[bool] = None,
    sort: str = "created_at",
    order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get all tasks for a specific department.
    Department managers can access their department's tasks.
    """
    # Verify access rights (admin, store manager, or department manager)
    if current_user["role"] not in ["admin", "manager"]:
        # For non-managers, check if they have access to this department
        if current_user.get("department_id") != department_id:
            raise_api_error(403, "Not authorized to view department tasks")
    
    # Base query with joins for name resolution
    base_query = select(
        tasks,
        employees.c.first_name.label("assigned_to_first_name"),
        employees.c.last_name.label("assigned_to_last_name"),
        departments.c.name.label("department_name")
    ).select_from(
        tasks.outerjoin(
            employees, tasks.c.assigned_to == employees.c.id
        ).outerjoin(
            departments, tasks.c.department_id == departments.c.id
        )
    )
    
    # Add department filter
    base_query = base_query.where(
        or_(
            tasks.c.department_id == department_id,
            tasks.c.assigned_to_department == department_id
        )
    )
    
    # Count query for pagination
    count_query = select(func.count()).select_from(tasks).where(
        or_(
            tasks.c.department_id == department_id,
            tasks.c.assigned_to_department == department_id
        )
    )
    
    # Add filters if provided
    if status:
        base_query = base_query.where(tasks.c.status == status)
        count_query = count_query.where(tasks.c.status == status)
    if is_urgent is not None:
        base_query = base_query.where(tasks.c.is_urgent == is_urgent)
        count_query = count_query.where(tasks.c.is_urgent == is_urgent)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            tasks.c.title.ilike(search_pattern),
            tasks.c.description.ilike(search_pattern)
        )
        base_query = base_query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(tasks.c, sort):
        sort_column = getattr(tasks.c, sort)
        if order.lower() == "asc":
            base_query = base_query.order_by(sort_column.asc())
        else:
            base_query = base_query.order_by(sort_column.desc())
    
    # Get total count for pagination
    total_count = db.execute(count_query).scalar()
    
    # Apply pagination
    query = base_query.offset(skip).limit(limit)
    
    # Execute query
    result = db.execute(query).fetchall()
    
    # Process the results to add name fields
    tasks_list = []
    for row in result:
        task_dict = {}
        for key in tasks.columns.keys():
            task_dict[key] = getattr(row, key)
        
        # Add the joined names
        if row.assigned_to_first_name and row.assigned_to_last_name:
            task_dict["assigned_to_name"] = f"{row.assigned_to_first_name} {row.assigned_to_last_name}"
        task_dict["department_name"] = row.department_name
        
        tasks_list.append(task_dict)
    
    # Add assigned_by names in a separate query to avoid complex joins
    if tasks_list:
        # Get all unique assigned_by IDs
        assigned_by_ids = set(task["assigned_by"] for task in tasks_list if task["assigned_by"])
        
        if assigned_by_ids:
            # Query to get all employee names at once
            employees_query = select(
                employees.c.id,
                employees.c.first_name,
                employees.c.last_name
            ).where(employees.c.id.in_(assigned_by_ids))
            
            employees_result = db.execute(employees_query).fetchall()
            
            # Create a map of employee ID to name
            employee_map = {
                row.id: f"{row.first_name} {row.last_name}" 
                for row in employees_result
            }
            
            # Update tasks with employee names
            for task in tasks_list:
                if task["assigned_by"] and task["assigned_by"] in employee_map:
                    task["assigned_by_name"] = employee_map[task["assigned_by"]]
    
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

@router.get("/assignable-employees", response_model=List[dict])
def get_assignable_employees(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get a list of employees that can be assigned to tasks.
    Filtered by department if provided.
    """
    query = select(employees.c.id, 
                  employees.c.first_name,
                  employees.c.last_name,
                  employees.c.position,
                  employees.c.department_id,
                  departments.c.name.label("department_name"))\
            .join(departments, employees.c.department_id == departments.c.id)\
            .where(employees.c.status == "active")
    
    if department_id:
        query = query.where(employees.c.department_id == department_id)
    
    # If not admin, limit to user's department unless they're a manager
    if current_user["role"] not in ["admin", "manager"] and current_user.get("department_id"):
        query = query.where(employees.c.department_id == current_user["department_id"])
    
    result = db.execute(query).fetchall()
    employees_list = [dict(row._mapping) for row in result]
    
    return employees_list

@router.get("/{task_id}", response_model=schemas.TaskWithNames)
def get_task(
    task_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Create a join query to get task with employee and department names
    query = select(
        tasks,
        employees.c.first_name.label("assigned_to_first_name"),
        employees.c.last_name.label("assigned_to_last_name"),
        departments.c.name.label("department_name")
    ).select_from(
        tasks.outerjoin(
            employees, tasks.c.assigned_to == employees.c.id
        ).outerjoin(
            departments, tasks.c.department_id == departments.c.id
        )
    ).where(tasks.c.id == task_id)
    
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Task not found")
    
    # Convert SQLAlchemy row to dict
    task_dict = {}
    for key in tasks.columns.keys():
        task_dict[key] = getattr(result, key)
    
    # Add the joined names
    if result.assigned_to_first_name and result.assigned_to_last_name:
        task_dict["assigned_to_name"] = f"{result.assigned_to_first_name} {result.assigned_to_last_name}"
    task_dict["department_name"] = result.department_name
    
    # Get assigned_by name
    if task_dict["assigned_by"]:
        assigned_by_query = select(employees.c.first_name, employees.c.last_name).where(
            employees.c.id == task_dict["assigned_by"]
        )
        assigned_by_result = db.execute(assigned_by_query).fetchone()
        if assigned_by_result:
            task_dict["assigned_by_name"] = f"{assigned_by_result.first_name} {assigned_by_result.last_name}"
    
    # Get assigned_to_department name if present
    if task_dict.get("assigned_to_department"):
        dept_query = select(departments.c.name).where(
            departments.c.id == task_dict["assigned_to_department"]
        )
        dept_result = db.execute(dept_query).fetchone()
        if dept_result:
            task_dict["assigned_to_department_name"] = dept_result.name
    
    return task_dict

@router.post("/", response_model=schemas.TaskWithNames)
def create_task(
    task: schemas.TaskCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Get current datetime to use for created_at and updated_at
    current_time = datetime.now()
    
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
        "is_completed": True if task.status == "completed" else False,
        "created_at": current_time,
        "updated_at": current_time
    }
    
    # Create the insert statement
    insert_stmt = insert(tasks).values(**new_task)
    result = db.execute(insert_stmt)
    db.commit()
    
    task_id = result.inserted_primary_key[0]
    
    # Instead of using get_task, directly fetch the task with a full join
    query = select(
        tasks,
        employees.c.first_name.label("assigned_to_first_name"),
        employees.c.last_name.label("assigned_to_last_name"),
        departments.c.name.label("department_name")
    ).select_from(
        tasks.outerjoin(
            employees, tasks.c.assigned_to == employees.c.id
        ).outerjoin(
            departments, tasks.c.department_id == departments.c.id
        )
    ).where(tasks.c.id == task_id)
    
    result = db.execute(query).fetchone()
    
    # Convert SQLAlchemy row to dict with explicit handling for created_at and updated_at
    task_dict = {}
    for key in tasks.columns.keys():
        value = getattr(result, key)
        # If created_at or updated_at is None, use current_time
        if (key == 'created_at' or key == 'updated_at') and value is None:
            task_dict[key] = current_time
        else:
            task_dict[key] = value
    
    # Add the joined names
    if result.assigned_to_first_name and result.assigned_to_last_name:
        task_dict["assigned_to_name"] = f"{result.assigned_to_first_name} {result.assigned_to_last_name}"
    task_dict["department_name"] = result.department_name
    
    # Get assigned_by name
    if task_dict["assigned_by"]:
        assigned_by_query = select(employees.c.first_name, employees.c.last_name).where(
            employees.c.id == task_dict["assigned_by"]
        )
        assigned_by_result = db.execute(assigned_by_query).fetchone()
        if assigned_by_result:
            task_dict["assigned_by_name"] = f"{assigned_by_result.first_name} {assigned_by_result.last_name}"
    
    # Get assigned_to_department name if present
    if task_dict.get("assigned_to_department"):
        dept_query = select(departments.c.name).where(
            departments.c.id == task_dict["assigned_to_department"]
        )
        dept_result = db.execute(dept_query).fetchone()
        if dept_result:
            task_dict["assigned_to_department_name"] = dept_result.name
    
    return task_dict

@router.put("/{task_id}", response_model=schemas.TaskWithNames)
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
    if task.assigned_to_department is not None:
        update_values["assigned_to_department"] = task.assigned_to_department
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
    
    # Use the get_task endpoint to fetch the updated task with names
    return get_task(task_id, db, current_user)

@router.patch("/{task_id}/status", response_model=schemas.TaskWithNames)
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
    
    # Use the get_task endpoint to fetch the updated task with names
    return get_task(task_id, db, current_user)

@router.patch("/{task_id}/assign", response_model=schemas.TaskWithNames)
def assign_task(
    task_id: int,
    assignment: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Assign a task to an employee or department.
    Only managers, admins, or the task creator can assign tasks.
    """
    # Check if task exists
    query = select(tasks).where(tasks.c.id == task_id)
    existing_task = db.execute(query).fetchone()
    if existing_task is None:
        raise_api_error(404, "Task not found")
    
    existing_task_dict = row_to_dict(existing_task)
    
    # Check if current user is authorized to assign this task
    is_authorized = (
        existing_task_dict["assigned_by"] == current_user["id"] or
        current_user["role"] in ["admin", "manager"]
    )
    
    if not is_authorized:
        raise_api_error(403, "You do not have permission to assign this task")
    
    # Prepare update values
    update_values = {}
    
    # Assign to specific employee if provided
    if "assigned_to" in assignment:
        update_values["assigned_to"] = assignment["assigned_to"]
        
        # If assigning to an employee, also get their department
        if assignment["assigned_to"]:
            emp_query = select(employees.c.department_id).where(employees.c.id == assignment["assigned_to"])
            emp_result = db.execute(emp_query).fetchone()
            if emp_result:
                update_values["assigned_to_department"] = emp_result[0]
    
    # Assign to department if provided
    if "assigned_to_department" in assignment:
        update_values["assigned_to_department"] = assignment["assigned_to_department"]
        
        # If we're assigning to a department and not to a specific employee,
        # clear the assigned_to field
        if "assigned_to" not in assignment and assignment["assigned_to_department"]:
            update_values["assigned_to"] = None
    
    # Update task
    update_stmt = update(tasks).where(tasks.c.id == task_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Use the get_task endpoint to fetch the updated task with names
    return get_task(task_id, db, current_user)

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