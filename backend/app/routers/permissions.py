
# app/routers/permissions.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from typing import List, Dict, Optional
from datetime import datetime

from ..database.database import get_db
from ..models.reflected_models import permissions, role_permissions
from ..schemas import schemas
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/permissions",
    tags=["permissions"],
)
@router.get("/", response_model=List[dict])
def get_permissions(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(permissions).offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    permissions_list = [dict(row._mapping) for row in result]
    return permissions_list

# In a file: app/routers/roles.py
@router.get("/permissions", response_model=dict)
def get_roles_and_permissions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Get all role_permissions
    query = select(role_permissions)
    result = db.execute(query).fetchall()
    role_permissions_list = [dict(row._mapping) for row in result]
    
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
            perm_dict = dict(perm_result._mapping)
            
            roles_dict[role].append({
                "permission_id": rp["permission_id"],
                "permission_name": perm_dict["permission_name"],
                "can_view": rp["can_view"],
                "can_create": rp["can_create"],
                "can_edit": rp["can_edit"],
                "can_delete": rp["can_delete"]
            })
    
    return {"roles": roles_dict}