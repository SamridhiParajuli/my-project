# app/routers/permissions.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from typing import List, Dict, Optional
from datetime import datetime

from ..database.database import get_db
from ..models.reflected_models import permissions, role_permissions
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/permissions",
    tags=["permissions"],
)

@router.get("/", response_model=Dict)
def get_permissions(
    skip: int = 0, 
    limit: int = 20, 
    search: Optional[str] = None,
    sort: str = "permission_name",
    order: str = "asc",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(permissions)
    count_query = select(func.count()).select_from(permissions)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            permissions.c.permission_name.ilike(search_pattern),
            permissions.c.description.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(permissions.c, sort):
        sort_column = getattr(permissions.c, sort)
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
    permissions_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": permissions_list,
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

@router.get("/roles", response_model=Dict)
def get_roles_and_permissions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Get all role_permissions
    query = select(role_permissions)
    result = db.execute(query).fetchall()
    role_permissions_list = rows_to_list(result)
    
    # Organize by role
    roles_dict = {}
    for rp in role_permissions_list:
        role = rp["role"]
        if role not in roles_dict:
            roles_dict[role] = []
        
        # Get permission name
        perm_query = select(permissions).where(permissions.c.id == rp["permission_id"])
        perm_result = db.execute(perm_query).fetchone()
        if perm_result:
            perm_dict = row_to_dict(perm_result)
            
            roles_dict[role].append({
                "permission_id": rp["permission_id"],
                "permission_name": perm_dict["permission_name"],
                "can_view": rp["can_view"],
                "can_create": rp["can_create"],
                "can_edit": rp["can_edit"],
                "can_delete": rp["can_delete"]
            })
    
    return {"roles": roles_dict}

@router.get("/{permission_id}", response_model=dict)
def get_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(permissions).where(permissions.c.id == permission_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Permission not found")
    return row_to_dict(result)

@router.post("/", response_model=dict)
def create_permission(
    permission_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can create permissions
):
    new_permission = {
        "permission_name": permission_data["permission_name"],
        "description": permission_data.get("description"),
         "category": permission_data.get("category", "general")
    }
    
    insert_stmt = insert(permissions).values(**new_permission)
    result = db.execute(insert_stmt)
    db.commit()
    
    permission_id = result.inserted_primary_key[0]
    query = select(permissions).where(permissions.c.id == permission_id)
    result = db.execute(query).fetchone()
    created_permission = row_to_dict(result)
    return created_permission

@router.put("/{permission_id}", response_model=dict)
def update_permission(
    permission_id: int,
    permission_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can update permissions
):
    # Check if permission exists
    query = select(permissions).where(permissions.c.id == permission_id)
    existing_permission = db.execute(query).fetchone()
    if existing_permission is None:
        raise_api_error(404, "Permission not found")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    if "permission_name" in permission_data:
        update_values["permission_name"] = permission_data["permission_name"]
    if "description" in permission_data:
        update_values["description"] = permission_data["description"]
    
    # Update permission
    update_stmt = update(permissions).where(permissions.c.id == permission_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated permission
    query = select(permissions).where(permissions.c.id == permission_id)
    result = db.execute(query).fetchone()
    updated_permission = row_to_dict(result)
    return updated_permission

@router.delete("/{permission_id}", response_model=dict)
def delete_permission(
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can delete permissions
):
    # Check if permission exists
    query = select(permissions).where(permissions.c.id == permission_id)
    existing_permission = db.execute(query).fetchone()
    if existing_permission is None:
        raise_api_error(404, "Permission not found")
    
    # Check if this permission is used in any role_permissions
    role_perms_query = select(role_permissions).where(role_permissions.c.permission_id == permission_id)
    used_in_roles = db.execute(role_perms_query).fetchone()
    
    if used_in_roles:
        raise_api_error(400, "Cannot delete permission that is assigned to roles. Remove from roles first.")
    
    # Delete permission
    delete_stmt = delete(permissions).where(permissions.c.id == permission_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Permission deleted successfully"}


@router.post("/roles", response_model=dict)
def assign_permission_to_role(
    role_permission_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can assign permissions to roles
):
    # Check if permission exists
    perm_query = select(permissions).where(permissions.c.id == role_permission_data["permission_id"])
    existing_permission = db.execute(perm_query).fetchone()
    if existing_permission is None:
        raise_api_error(404, "Permission not found")
    
    # Check if this role-permission combination already exists
    existing_query = select(role_permissions).where(
        (role_permissions.c.role == role_permission_data["role"]) &
        (role_permissions.c.permission_id == role_permission_data["permission_id"])
    )
    existing_role_perm = db.execute(existing_query).fetchone()
    
    if existing_role_perm:
        raise_api_error(400, "This permission is already assigned to this role")
    
    # Create new role permission
    new_role_perm = {
        "role": role_permission_data["role"],
        "permission_id": role_permission_data["permission_id"],
        "can_view": role_permission_data.get("can_view", True),
        "can_create": role_permission_data.get("can_create", False),
        "can_edit": role_permission_data.get("can_edit", False),
        "can_delete": role_permission_data.get("can_delete", False)
    }
    
    insert_stmt = insert(role_permissions).values(**new_role_perm)
    result = db.execute(insert_stmt)
    db.commit()
    
    return {"message": "Permission assigned to role successfully"}

@router.put("/roles/{role}/{permission_id}", response_model=dict)
def update_role_permission(
    role: str,
    permission_id: int,
    role_permission_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can update role permissions
):
    # Check if this role-permission combination exists
    existing_query = select(role_permissions).where(
        (role_permissions.c.role == role) &
        (role_permissions.c.permission_id == permission_id)
    )
    existing_role_perm = db.execute(existing_query).fetchone()
    
    if not existing_role_perm:
        raise_api_error(404, "This role-permission combination does not exist")
    
    # Prepare update values
    update_values = {}
    if "can_view" in role_permission_data:
        update_values["can_view"] = role_permission_data["can_view"]
    if "can_create" in role_permission_data:
        update_values["can_create"] = role_permission_data["can_create"]
    if "can_edit" in role_permission_data:
        update_values["can_edit"] = role_permission_data["can_edit"]
    if "can_delete" in role_permission_data:
        update_values["can_delete"] = role_permission_data["can_delete"]
    
    # Update role permission
    update_stmt = update(role_permissions).where(
        (role_permissions.c.role == role) &
        (role_permissions.c.permission_id == permission_id)
    ).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    return {"message": "Role permission updated successfully"}

@router.delete("/roles/{role}/{permission_id}", response_model=dict)
def delete_role_permission(
    role: str,
    permission_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can delete role permissions
):
    # Check if this role-permission combination exists
    existing_query = select(role_permissions).where(
        (role_permissions.c.role == role) &
        (role_permissions.c.permission_id == permission_id)
    )
    existing_role_perm = db.execute(existing_query).fetchone()
    
    if not existing_role_perm:
        raise_api_error(404, "This role-permission combination does not exist")
    
    # Delete role permission
    delete_stmt = delete(role_permissions).where(
        (role_permissions.c.role == role) &
        (role_permissions.c.permission_id == permission_id)
    )
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Permission removed from role successfully"}