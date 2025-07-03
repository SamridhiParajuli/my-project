# app/routers/preorders.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from typing import List, Optional, Dict
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import pre_orders
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/preorders",
    tags=["pre-orders"],
)

@router.get("/", response_model=Dict)
def get_preorders(
    skip: int = 0, 
    limit: int = 20, 
    status: Optional[str] = None,
    target_department: Optional[int] = None,
    assigned_to: Optional[int] = None,
    sort: str = "created_at",
    order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(pre_orders)
    count_query = select(func.count()).select_from(pre_orders)
    
    # Add filters if provided
    if status:
        query = query.where(pre_orders.c.status == status)
        count_query = count_query.where(pre_orders.c.status == status)
    if target_department:
        query = query.where(pre_orders.c.target_department == target_department)
        count_query = count_query.where(pre_orders.c.target_department == target_department)
    if assigned_to:
        query = query.where(pre_orders.c.assigned_to == assigned_to)
        count_query = count_query.where(pre_orders.c.assigned_to == assigned_to)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            pre_orders.c.customer_name.ilike(search_pattern),
            pre_orders.c.customer_email.ilike(search_pattern),
            pre_orders.c.description.ilike(search_pattern),
            pre_orders.c.order_type.ilike(search_pattern),
            pre_orders.c.special_instructions.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(pre_orders.c, sort):
        sort_column = getattr(pre_orders.c, sort)
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
    preorders_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": preorders_list,
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

@router.get("/{preorder_id}", response_model=schemas.PreOrder)
def get_preorder(
    preorder_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(pre_orders).where(pre_orders.c.id == preorder_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Pre-order not found")
    return row_to_dict(result)

@router.post("/", response_model=schemas.PreOrder)
def create_preorder(
    preorder: schemas.PreOrderCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    new_preorder = {
        "customer_name": preorder.customer_name,
        "customer_email": preorder.customer_email,
        "customer_phone": preorder.customer_phone,
        "order_type": preorder.order_type,
        "description": preorder.description,
        "target_department": preorder.target_department,
        "requested_by": preorder.requested_by or current_user["employee_id"],
        "assigned_to": preorder.assigned_to,
        "quantity": preorder.quantity,
        "estimated_price": preorder.estimated_price,
        "pickup_date": preorder.pickup_date,
        "special_instructions": preorder.special_instructions,
        "status": preorder.status
    }
    
    insert_stmt = insert(pre_orders).values(**new_preorder)
    result = db.execute(insert_stmt)
    db.commit()
    
    preorder_id = result.inserted_primary_key[0]
    query = select(pre_orders).where(pre_orders.c.id == preorder_id)
    result = db.execute(query).fetchone()
    created_preorder = row_to_dict(result)
    return created_preorder

@router.put("/{preorder_id}", response_model=schemas.PreOrder)
def update_preorder(
    preorder_id: int, 
    preorder: schemas.PreOrderUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if preorder exists
    query = select(pre_orders).where(pre_orders.c.id == preorder_id)
    existing_preorder = db.execute(query).fetchone()
    if existing_preorder is None:
        raise_api_error(404, "Pre-order not found")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in preorder.dict(exclude_unset=True).items():
        if value is not None:
            update_values[key] = value
    
    # Set completed_at timestamp if status is changing to completed
    if "status" in update_values and update_values["status"] == "completed":
        update_values["completed_at"] = datetime.now()
    
    # Update preorder
    update_stmt = update(pre_orders).where(pre_orders.c.id == preorder_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated preorder
    query = select(pre_orders).where(pre_orders.c.id == preorder_id)
    result = db.execute(query).fetchone()
    updated_preorder = row_to_dict(result)
    return updated_preorder

@router.patch("/{preorder_id}/status", response_model=schemas.PreOrder)
def update_preorder_status(
    preorder_id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if preorder exists
    query = select(pre_orders).where(pre_orders.c.id == preorder_id)
    existing_preorder = db.execute(query).fetchone()
    if existing_preorder is None:
        raise_api_error(404, "Pre-order not found")
    
    # Validate status
    if "status" not in status_update:
        raise_api_error(400, "Status field is required")
    
    # Update status
    update_values = {"status": status_update.get("status")}
    
    # If status is "completed", set completed_at timestamp
    if status_update.get("status") == "completed":
        update_values["completed_at"] = datetime.now()
    
    update_stmt = update(pre_orders).where(pre_orders.c.id == preorder_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated preorder
    query = select(pre_orders).where(pre_orders.c.id == preorder_id)
    result = db.execute(query).fetchone()
    updated_preorder = row_to_dict(result)
    return updated_preorder

@router.delete("/{preorder_id}", response_model=dict)
def delete_preorder(
    preorder_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can delete preorders
):
    # Check if preorder exists
    query = select(pre_orders).where(pre_orders.c.id == preorder_id)
    existing_preorder = db.execute(query).fetchone()
    if existing_preorder is None:
        raise_api_error(404, "Pre-order not found")
    
    # Delete preorder
    delete_stmt = delete(pre_orders).where(pre_orders.c.id == preorder_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Pre-order deleted successfully"}