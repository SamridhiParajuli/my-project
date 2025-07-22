# app/routers/auth.py
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from ..utils.security import verify_password, get_password_hash
from ..database.database import get_db
from ..models.reflected_models import users, employees, departments
from ..schemas import schemas
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.auth_utils import get_current_active_user, get_current_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from ..utils.db_helpers import row_to_dict, rows_to_list
from sqlalchemy import inspect
from ..database.database import engine

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
)

def authenticate_user(db: Session, username: str, password: str):
    query = select(users).where(users.c.username == username)
    user = db.execute(query).fetchone()
    if not user:
        return False
    if not verify_password(password, user._mapping["password_hash"]):
        return False
    return row_to_dict(user)

@router.post("/token", response_model=dict)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise_api_error(
            401,
            "Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    # Get employee details if available
    employee_data = None
    department_data = None
    
    if user["employee_id"]:
        emp_query = select(employees).where(employees.c.id == user["employee_id"])
        employee = db.execute(emp_query).fetchone()
        if employee:
            employee_data = row_to_dict(employee)
            
            # Get department details if available
            if employee_data["department_id"]:
                dept_query = select(departments).where(departments.c.id == employee_data["department_id"])
                department = db.execute(dept_query).fetchone()
                if department:
                    department_data = row_to_dict(department)
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "employee_id": user["employee_id"],
            "department_id": user["department_id"] if "department_id" in user else None
        },
        "employee": employee_data,
        "department": department_data
    }

@router.post("/logout", response_model=dict)
async def logout():
    # Note: JWT tokens can't be invalidated server-side without a token blacklist
    # The client should delete the token from local storage
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=Dict)
async def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Get employee details if available
    employee_data = None
    department_data = None
    
    if current_user["employee_id"]:
        emp_query = select(employees).where(employees.c.id == current_user["employee_id"])
        employee = db.execute(emp_query).fetchone()
        if employee:
            employee_data = row_to_dict(employee)
            
            # Get department details if available
            if employee_data["department_id"]:
                dept_query = select(departments).where(departments.c.id == employee_data["department_id"])
                department = db.execute(dept_query).fetchone()
                if department:
                    department_data = row_to_dict(department)
    
    # Ensure all data is serializable
    return {
        "user": current_user,
        "employee": employee_data,
        "department": department_data
    }

# USER MANAGEMENT ENDPOINTS (Consolidated from both auth.py and users.py)

@router.get("/users", response_model=Dict)
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
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can list users
):
    # Base query
    query = select(users)
    count_query = select(func.count()).select_from(users)
    
    # Apply filters if provided
    if department_id:
        query = query.where(users.c.department_id == department_id)
        count_query = count_query.where(users.c.department_id == department_id)
    if role:
        query = query.where(users.c.role == role)
        count_query = count_query.where(users.c.role == role)
    if is_active is not None and not include_inactive:
        query = query.where(users.c.is_active == is_active)
        count_query = count_query.where(users.c.is_active == is_active)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            users.c.username.ilike(search_pattern),
            users.c.user_type.ilike(search_pattern),
            users.c.role.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(users.c, sort):
        sort_column = getattr(users.c, sort)
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
    users_list = rows_to_list(result)
    
    # Remove password_hash from each user for security
    for user in users_list:
        if "password_hash" in user:
            del user["password_hash"]
    
    # Return with pagination metadata
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

@router.get("/users/{user_id}", response_model=schemas.User)
def get_user(
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_active_user)
):
    # Regular users can only view their own profile
    if current_user["role"] not in ["admin", "manager"] and current_user["id"] != user_id:
        raise_api_error(403, "Not authorized to view this user")
    
    query = select(users).where(users.c.id == user_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "User not found")
    
    user_data = row_to_dict(result)
    
    # Remove password_hash for security
    if "password_hash" in user_data:
        del user_data["password_hash"]
    
    # Ensure all required fields are present
    if "email" not in user_data:
        user_data["email"] = None
    
    if "created_at" not in user_data:
        user_data["created_at"] = datetime.utcnow()
    
    return user_data


# app/routers/auth.py (create_user function only)

@router.post("/users", response_model=schemas.User)
def create_user(
    user: schemas.UserCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can create users
):
    try:
        # Check if username already exists
        existing_query = select(users).where(users.c.username == user.username)
        existing_user = db.execute(existing_query).fetchone()
        if existing_user:
            raise_api_error(400, f"Username '{user.username}' already exists")

        # Validate employee_id if provided
        if user.employee_id:
            emp_query = select(employees).where(employees.c.id == user.employee_id)
            emp = db.execute(emp_query).fetchone()
            if not emp:
                raise_api_error(400, f"Employee with ID {user.employee_id} does not exist")
        
            # Check if employee already has a user account
            emp_user_query = select(users).where(users.c.employee_id == user.employee_id)
            emp_user = db.execute(emp_user_query).fetchone()
            if emp_user:
                raise_api_error(400, f"Employee with ID {user.employee_id} already has a user account")
        
        # Validate department_id if provided
        if user.department_id:
            dept_query = select(departments).where(departments.c.id == user.department_id)
            dept = db.execute(dept_query).fetchone()
            if not dept:
                raise_api_error(400, f"Department with ID {user.department_id} does not exist")
        
        # Create a new user with proper column mapping
        current_time = datetime.utcnow()
        
        # Get a list of actual columns in the users table
        inspector = inspect(engine)
        columns = [column['name'] for column in inspector.get_columns('users')]
        
        # Only include fields that exist in the table
        new_user = {}
        
        # Always include these essential fields
        new_user["username"] = user.username
        new_user["password_hash"] = get_password_hash(user.password)
        
        # Conditionally add fields if they exist in the table
        if "role" in columns:
            new_user["role"] = user.role
        if "is_active" in columns:
            new_user["is_active"] = user.is_active
        if "user_type" in columns:
            new_user["user_type"] = user.user_type or "staff"
        if "employee_id" in columns:
            new_user["employee_id"] = user.employee_id
        if "department_id" in columns:
            new_user["department_id"] = user.department_id
        if "email" in columns:
            new_user["email"] = user.email
        if "created_at" in columns:
            new_user["created_at"] = current_time
        
        # Insert the new user
        insert_stmt = insert(users).values(**new_user)
        result = db.execute(insert_stmt)
        db.commit()
        
        # Get the new user's ID
        user_id = result.inserted_primary_key[0]
        
        # Fetch and return the new user
        query = select(users).where(users.c.id == user_id)
        result = db.execute(query).fetchone()
        created_user = row_to_dict(result)
        
        # Remove password_hash for security
        if "password_hash" in created_user:
            del created_user["password_hash"]
        
        return created_user
        
    except Exception as e:
        # Log the error details
        print(f"Error creating user: {str(e)}")
        # Rollback in case of error
        db.rollback()
        # Re-raise with clearer message
        raise_api_error(500, f"Failed to create user: {str(e)}")


@router.put("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int, 
    user_data: dict, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_active_user)
):
    # Check if user exists
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise_api_error(404, "User not found")
    
    existing_user = row_to_dict(existing_user)
    
    # Regular users can only update their own profile
    # Only admins can change roles or activation status
    if current_user["role"] != "admin":
        if current_user["id"] != user_id:
            raise_api_error(403, "Not authorized to update this user")
        
        # Non-admins cannot change role or activation status
        if "role" in user_data or "is_active" in user_data:
            raise_api_error(403, "Not authorized to change role or activation status")
    
    # Validate employee_id if provided
    if "employee_id" in user_data and user_data["employee_id"]:
        # Check if employee exists
        emp_query = select(employees).where(employees.c.id == user_data["employee_id"])
        emp = db.execute(emp_query).fetchone()
        if not emp:
            raise_api_error(400, f"Employee with ID {user_data['employee_id']} does not exist")
        
        # Check if employee already has a different user account
        emp_user_query = select(users).where(
            (users.c.employee_id == user_data["employee_id"]) & 
            (users.c.id != user_id)
        )
        emp_user = db.execute(emp_user_query).fetchone()
        if emp_user:
            raise_api_error(400, f"Employee with ID {user_data['employee_id']} already has a user account")
    
    # Validate department_id if provided
    if "department_id" in user_data and user_data["department_id"]:
        dept_query = select(departments).where(departments.c.id == user_data["department_id"])
        dept = db.execute(dept_query).fetchone()
        if not dept:
            raise_api_error(400, f"Department with ID {user_data['department_id']} does not exist")
    
    # Prepare update values (only include fields that exist in the users table)
    valid_columns = ["username", "user_type", "employee_id", "department_id", "role", "is_active", "email"]
    update_values = {}
    
    for key, value in user_data.items():
        if key in valid_columns and value is not None:
            update_values[key] = value
        # Special handling for password
        elif key == "password" and value:
            update_values["password_hash"] = get_password_hash(value)
    
    # Handle nullable foreign keys
    if "employee_id" in update_values and update_values["employee_id"] == 0:
        update_values["employee_id"] = None
    if "department_id" in update_values and update_values["department_id"] == 0:
        update_values["department_id"] = None
    
    # Only update if there are values to update
    if update_values:
        # Update user
        update_stmt = update(users).where(users.c.id == user_id).values(**update_values)
        db.execute(update_stmt)
        db.commit()
    
    # Fetch updated user
    query = select(users).where(users.c.id == user_id)
    result = db.execute(query).fetchone()
    updated_user = row_to_dict(result)
    
    # Remove password_hash for security
    if "password_hash" in updated_user:
        del updated_user["password_hash"]
    
    # Ensure all required fields are present in the response for schema validation
    if "email" not in updated_user:
        updated_user["email"] = user_data.get("email", None)
    
    if "created_at" not in updated_user:
        updated_user["created_at"] = datetime.utcnow()
    
    return updated_user

@router.patch("/users/{user_id}/activate", response_model=schemas.User)
def activate_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can activate users
):
    # Check if user exists
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise_api_error(404, "User not found")
    
    # Update user activation status
    update_stmt = update(users).where(users.c.id == user_id).values({"is_active": True})
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated user
    query = select(users).where(users.c.id == user_id)
    result = db.execute(query).fetchone()
    updated_user = row_to_dict(result)
    
    # Remove password_hash for security
    if "password_hash" in updated_user:
        del updated_user["password_hash"]
    
    # Ensure all required fields are present in the response
    if "email" not in updated_user:
        updated_user["email"] = None
    
    if "created_at" not in updated_user:
        updated_user["created_at"] = datetime.utcnow()
    
    return updated_user

@router.patch("/users/{user_id}/deactivate", response_model=schemas.User)
def deactivate_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can deactivate users
):
    # Check if user exists
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise_api_error(404, "User not found")
    
    # Update user activation status
    update_stmt = update(users).where(users.c.id == user_id).values({"is_active": False})
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated user
    query = select(users).where(users.c.id == user_id)
    result = db.execute(query).fetchone()
    updated_user = row_to_dict(result)
    
    # Remove password_hash for security
    if "password_hash" in updated_user:
        del updated_user["password_hash"]
    
    # Ensure all required fields are present in the response
    if "email" not in updated_user:
        updated_user["email"] = None
    
    if "created_at" not in updated_user:
        updated_user["created_at"] = datetime.utcnow()
    
    return updated_user

@router.patch("/users/{user_id}/change-role", response_model=schemas.User)
def change_user_role(
    user_id: int,
    role_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can change roles
):
    # Check if user exists
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise_api_error(404, "User not found")
    
    # Validate role
    if "role" not in role_data:
        raise_api_error(400, "Role field is required")
    
    allowed_roles = ["admin", "manager", "staff"]
    if role_data["role"] not in allowed_roles:
        raise_api_error(400, f"Invalid role. Allowed roles are: {', '.join(allowed_roles)}")
    
    # Update user role
    update_stmt = update(users).where(users.c.id == user_id).values({"role": role_data["role"]})
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated user
    query = select(users).where(users.c.id == user_id)
    result = db.execute(query).fetchone()
    updated_user = row_to_dict(result)
    
    # Remove password_hash for security
    if "password_hash" in updated_user:
        del updated_user["password_hash"]
    
    # Ensure all required fields are present in the response
    if "email" not in updated_user:
        updated_user["email"] = None
    
    if "created_at" not in updated_user:
        updated_user["created_at"] = datetime.utcnow()
    
    return updated_user

@router.patch("/users/{user_id}/change-password", response_model=dict)
def change_password(
    user_id: int,
    password_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Regular users can only change their own password
    # Admins can change any password
    if current_user["role"] != "admin" and current_user["id"] != user_id:
        raise_api_error(403, "Not authorized to change this user's password")
    
    # Check if user exists
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise_api_error(404, "User not found")
    
    existing_user = row_to_dict(existing_user)
    
    # Validate password data
    if "password" not in password_data or not password_data["password"]:
        raise_api_error(400, "Password field is required")
    
    # If not admin and changing own password, require current password
    if current_user["role"] != "admin" and current_user["id"] == user_id:
        if "current_password" not in password_data or not password_data["current_password"]:
            raise_api_error(400, "Current password is required")
        
        # Verify current password
        if not verify_password(password_data["current_password"], existing_user["password_hash"]):
            raise_api_error(400, "Current password is incorrect")
    
    # Update password
    update_stmt = update(users).where(users.c.id == user_id).values({
        "password_hash": get_password_hash(password_data["password"])
    })
    db.execute(update_stmt)
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.delete("/users/{user_id}", response_model=dict)
def delete_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can delete users
):
    # Check if user exists
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise_api_error(404, "User not found")
    
    # Prevent deleting your own account
    if current_user["id"] == user_id:
        raise_api_error(400, "Cannot delete your own account")
    
    # Instead of deleting, deactivate the user
    update_stmt = update(users).where(users.c.id == user_id).values({"is_active": False})
    db.execute(update_stmt)
    db.commit()
    
    return {"message": "User deactivated successfully"}

@router.delete("/users/{user_id}/permanent", response_model=dict)
def permanent_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)
):
    try:
        # Check if user exists
        query = select(users).where(users.c.id == user_id)
        existing_user = db.execute(query).fetchone()
        if existing_user is None:
            raise_api_error(404, "User not found")
        
        existing_user_dict = row_to_dict(existing_user)

        if current_user["id"] == user_id:
            raise_api_error(400, "Cannot delete your own account")
        
        # First, try to break dependencies
        if existing_user_dict.get("employee_id"):
            # Clear the employee_id reference
            update_stmt = update(users).where(users.c.id == user_id).values({"employee_id": None})
            db.execute(update_stmt)
            db.commit()
        
        # Now try to delete the user
        delete_stmt = delete(users).where(users.c.id == user_id)
        db.execute(delete_stmt)
        db.commit()
        
        return {"message": "User permanently deleted successfully"}
    
    except IntegrityError as e:
        db.rollback()
        error_message = str(e)
        print(f"IntegrityError deleting user: {error_message}")
        raise_api_error(400, f"Cannot delete user due to database constraints. Please remove user associations first.")
    
    except SQLAlchemyError as e:
        db.rollback()
        error_message = str(e)
        print(f"SQLAlchemyError deleting user: {error_message}")
        raise_api_error(500, f"Database error occurred when deleting user: {error_message}")
    
    except Exception as e:
        db.rollback()
        error_message = str(e)
        print(f"Exception deleting user: {error_message}")
        raise_api_error(500, f"Error deleting user: {error_message}")