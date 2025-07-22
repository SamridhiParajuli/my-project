# app/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from typing import List, Optional, Dict
from ..database.database import get_db
from ..models.reflected_models import users, employees, departments
from ..schemas import schemas
from ..utils.security import get_password_hash
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.auth_utils import get_current_active_user
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

@router.get("/", response_model=Dict)
def get_users(
    skip: int = 0, 
    limit: int = 20,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = True,
    include_inactive: Optional[bool] = False,
    sort: str = "username",
    order: str = "asc",
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)
):
    query = select(users)
    count_query = select(func.count()).select_from(users)
    
    if department_id:
        query = query.where(users.c.department_id == department_id)
        count_query = count_query.where(users.c.department_id == department_id)
    if role:
        query = query.where(users.c.role == role)
        count_query = count_query.where(users.c.role == role)

    # NEW FILTERING LOGIC
    if not include_inactive:
        query = query.where(users.c.is_active == True)
        count_query = count_query.where(users.c.is_active == True)
    elif is_active is not None:
        query = query.where(users.c.is_active == is_active)
        count_query = count_query.where(users.c.is_active == is_active)
    
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            users.c.username.ilike(search_pattern),
            users.c.user_type.ilike(search_pattern),
            users.c.role.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    if hasattr(users.c, sort):
        sort_column = getattr(users.c, sort)
        if order.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
    
    total_count = db.execute(count_query).scalar()
    query = query.offset(skip).limit(limit)
    
    result = db.execute(query).fetchall()
    users_list = rows_to_list(result)
    
    for user in users_list:
        if "password_hash" in user:
            del user["password_hash"]
    
    return {
        "items": users_list,
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

@router.get("/{user_id}", response_model=schemas.User)
def get_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_active_user)
):
    if current_user["role"] not in ["admin", "manager"] and current_user["id"] != user_id:
        raise_api_error(403, "Not authorized to view this user")
    
    query = select(users).where(users.c.id == user_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "User not found")
    
    user_data = row_to_dict(result)
    if "password_hash" in user_data:
        del user_data["password_hash"]
    
    return user_data

@router.post("/", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)
):
    existing_query = select(users).where(users.c.username == user.username)
    existing_user = db.execute(existing_query).fetchone()
    if existing_user:
        raise_api_error(400, f"Username '{user.username}' already exists")

    if user.employee_id:
        emp_query = select(employees).where(employees.c.id == user.employee_id)
        emp = db.execute(emp_query).fetchone()
        if not emp:
            raise_api_error(400, f"Employee with ID {user.employee_id} does not exist")

        emp_user_query = select(users).where(users.c.employee_id == user.employee_id)
        emp_user = db.execute(emp_user_query).fetchone()
        if emp_user:
            raise_api_error(400, f"Employee with ID {user.employee_id} already has a user account")
    
    if user.department_id:
        dept_query = select(departments).where(departments.c.id == user.department_id)
        dept = db.execute(dept_query).fetchone()
        if not dept:
            raise_api_error(400, f"Department with ID {user.department_id} does not exist")
    
    new_user = {
        "username": user.username,
        "password_hash": get_password_hash(user.password),
        "user_type": user.user_type,
        "employee_id": user.employee_id if user.employee_id else None,
        "department_id": user.department_id if user.department_id else None,
        "role": user.role,
        "is_active": user.is_active
    }
    
    insert_stmt = insert(users).values(**new_user)
    result = db.execute(insert_stmt)
    db.commit()
    
    user_id = result.inserted_primary_key[0]
    query = select(users).where(users.c.id == user_id)
    result = db.execute(query).fetchone()
    created_user = row_to_dict(result)
    
    if "password_hash" in created_user:
        del created_user["password_hash"]
    
    return created_user

@router.put("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int, 
    user_data: dict, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_active_user)
):
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise_api_error(404, "User not found")
    
    if current_user["role"] != "admin":
        if current_user["id"] != user_id:
            raise_api_error(403, "Not authorized to update this user")
        if "role" in user_data or "is_active" in user_data:
            raise_api_error(403, "Not authorized to change role or activation status")
    
    update_values = {}
    for key, value in user_data.items():
        if key != "password" and value is not None:
            update_values[key] = value
    
    if "password" in user_data and user_data["password"]:
        update_values["password_hash"] = get_password_hash(user_data["password"])
    
    update_stmt = update(users).where(users.c.id == user_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    query = select(users).where(users.c.id == user_id)
    result = db.execute(query).fetchone()
    updated_user = row_to_dict(result)
    
    if "password_hash" in updated_user:
        del updated_user["password_hash"]
    
    return updated_user

@router.delete("/{user_id}", response_model=dict)
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)
):
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise_api_error(404, "User not found")
    
    if current_user["id"] == user_id:
        raise_api_error(400, "Cannot delete your own account")
    
    update_stmt = update(users).where(users.c.id == user_id).values({"is_active": False})
    db.execute(update_stmt)
    db.commit()
    
    return {"message": "User deactivated successfully"}

@router.delete("/{user_id}/permanent", response_model=dict)
def permanent_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)
):
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise_api_error(404, "User not found")

    if current_user["id"] == user_id:
        raise_api_error(400, "Cannot delete your own account")

    delete_stmt = delete(users).where(users.c.id == user_id)
    db.execute(delete_stmt)
    db.commit()

    return {"message": "User permanently deleted successfully"}


@router.patch("/{user_id}/activate", response_model=dict)
def activate_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)
):
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise_api_error(404, "User not found")
    
    update_stmt = update(users).where(users.c.id == user_id).values({"is_active": True})
    db.execute(update_stmt)
    db.commit()
    
    return {"message": "User activated successfully"}

@router.patch("/{user_id}/change-password", response_model=dict)
def change_password(
    user_id: int,
    password_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    if current_user["role"] != "admin" and current_user["id"] != user_id:
        raise_api_error(403, "Not authorized to change this user's password")
    
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise_api_error(404, "User not found")
    
    if "password" not in password_data or not password_data["password"]:
        raise_api_error(400, "Password field is required")
    
    update_stmt = update(users).where(users.c.id == user_id).values({
        "password_hash": get_password_hash(password_data["password"])
    })
    db.execute(update_stmt)
    db.commit()
    
    return {"message": "Password changed successfully"}
