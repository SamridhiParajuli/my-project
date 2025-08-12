# app/routers/inventory.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from typing import List, Optional, Dict
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import inventory_requests, inventory_request_updates
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"],
)

@router.get("/requests", response_model=Dict)
def get_inventory_requests(
    skip: int = 0, 
    limit: int = 20, 
    status: Optional[str] = None,
    requesting_department: Optional[int] = None,
    fulfilling_department: Optional[int] = None,
    priority: Optional[str] = None,
    sort: str = "requested_date",
    order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(inventory_requests)
    count_query = select(func.count()).select_from(inventory_requests)
    
    # Add filters if provided
    if status:
        query = query.where(inventory_requests.c.status == status)
        count_query = count_query.where(inventory_requests.c.status == status)
    if requesting_department:
        query = query.where(inventory_requests.c.requesting_department == requesting_department)
        count_query = count_query.where(inventory_requests.c.requesting_department == requesting_department)
    if fulfilling_department:
        query = query.where(inventory_requests.c.fulfilling_department == fulfilling_department)
        count_query = count_query.where(inventory_requests.c.fulfilling_department == fulfilling_department)
    if priority:
        query = query.where(inventory_requests.c.priority == priority)
        count_query = count_query.where(inventory_requests.c.priority == priority)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            inventory_requests.c.request_title.ilike(search_pattern),
            inventory_requests.c.description.ilike(search_pattern),
            inventory_requests.c.item_category.ilike(search_pattern),
            inventory_requests.c.notes.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(inventory_requests.c, sort):
        sort_column = getattr(inventory_requests.c, sort)
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
    requests_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": requests_list,
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

@router.get("/requests/{request_id}", response_model=schemas.InventoryRequest)
def get_inventory_request(
    request_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(inventory_requests).where(inventory_requests.c.id == request_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Inventory request not found")
    return row_to_dict(result)

@router.post("/requests", response_model=schemas.InventoryRequest)
def create_inventory_request(
    inventory_request: schemas.InventoryRequestCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    new_request = {
        "request_title": inventory_request.request_title,
        "description": inventory_request.description,
        "requesting_department": inventory_request.requesting_department,
        "fulfilling_department": inventory_request.fulfilling_department,
        "requested_by": inventory_request.requested_by or current_user["employee_id"],
        "assigned_to": inventory_request.assigned_to,
        "item_category": inventory_request.item_category,
        "quantity_requested": inventory_request.quantity_requested,
        "priority": inventory_request.priority,
        "status": inventory_request.status,
        "needed_by_date": inventory_request.needed_by_date,
        "notes": inventory_request.notes
    }
    
    insert_stmt = insert(inventory_requests).values(**new_request)
    result = db.execute(insert_stmt)
    db.commit()
    
    request_id = result.inserted_primary_key[0]
    query = select(inventory_requests).where(inventory_requests.c.id == request_id)
    result = db.execute(query).fetchone()
    created_request = row_to_dict(result)
    return created_request

@router.put("/requests/{request_id}", response_model=schemas.InventoryRequest)
def update_inventory_request(
    request_id: int, 
    inventory_request: schemas.InventoryRequestUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if request exists
    query = select(inventory_requests).where(inventory_requests.c.id == request_id)
    existing_request = db.execute(query).fetchone()
    if existing_request is None:
        raise_api_error(404, "Inventory request not found")
    
    existing_request = row_to_dict(existing_request)
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in inventory_request.dict(exclude_unset=True).items():
        if value is not None:
            update_values[key] = value
    
    # If status is changing, log the update
    if "status" in update_values and update_values["status"] != existing_request["status"]:
        update_log = {
            "request_id": request_id,
            "updated_by": current_user["employee_id"],
            "old_status": existing_request["status"],
            "new_status": update_values["status"],
            "update_message": f"Status changed from {existing_request['status']} to {update_values['status']}"
        }
        insert_stmt = insert(inventory_request_updates).values(**update_log)
        db.execute(insert_stmt)
        
        # Set fulfilled_date if status is changing to fulfilled
        if update_values["status"] == "fulfilled":
            update_values["fulfilled_date"] = datetime.now()
    
    # Update request
    update_stmt = update(inventory_requests).where(inventory_requests.c.id == request_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated request
    query = select(inventory_requests).where(inventory_requests.c.id == request_id)
    result = db.execute(query).fetchone()
    updated_request = row_to_dict(result)
    return updated_request

@router.patch("/requests/{request_id}/status", response_model=schemas.InventoryRequest)
def update_inventory_request_status(
    request_id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if request exists
    query = select(inventory_requests).where(inventory_requests.c.id == request_id)
    existing_request = db.execute(query).fetchone()
    if existing_request is None:
        raise_api_error(404, "Inventory request not found")
    
    existing_request = row_to_dict(existing_request)
    
    # Validate status
    if "status" not in status_update:
        raise_api_error(400, "Status field is required")
    
    new_status = status_update.get("status")
    
    # Create status update log
    update_log = {
        "request_id": request_id,
        "updated_by": current_user["employee_id"],
        "old_status": existing_request["status"],
        "new_status": new_status,
        "update_message": status_update.get("message", f"Status changed to {new_status}")
    }
    insert_stmt = insert(inventory_request_updates).values(**update_log)
    db.execute(insert_stmt)
    
    # Update request status
    update_values = {"status": new_status}
    
    # Set fulfilled_date if status is changing to fulfilled
    if new_status == "fulfilled":
        update_values["fulfilled_date"] = datetime.now()
    
    update_stmt = update(inventory_requests).where(inventory_requests.c.id == request_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated request
    query = select(inventory_requests).where(inventory_requests.c.id == request_id)
    result = db.execute(query).fetchone()
    updated_request = row_to_dict(result)
    return updated_request

@router.get("/requests/{request_id}/updates", response_model=List[schemas.InventoryRequestUpdateLog])
def get_inventory_request_updates(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if request exists
    query = select(inventory_requests).where(inventory_requests.c.id == request_id)
    existing_request = db.execute(query).fetchone()
    if existing_request is None:
        raise_api_error(404, "Inventory request not found")
    
    # Get updates for this request
    query = select(inventory_request_updates).where(inventory_request_updates.c.request_id == request_id)
    result = db.execute(query).fetchall()
    updates_list = rows_to_list(result)
    return updates_list

@router.post("/requests/{request_id}/updates", response_model=schemas.InventoryRequestUpdateLog)
def add_inventory_request_update(
    request_id: int,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if request exists
    query = select(inventory_requests).where(inventory_requests.c.id == request_id)
    existing_request = db.execute(query).fetchone()
    if existing_request is None:
        raise_api_error(404, "Inventory request not found")
    
    existing_request = row_to_dict(existing_request)
    
    # Create update log
    new_update = {
        "request_id": request_id,
        "updated_by": current_user["employee_id"],
        "old_status": existing_request["status"],
        "new_status": update_data.get("new_status", existing_request["status"]),
        "update_message": update_data.get("message", "Status updated")
    }
    
    insert_stmt = insert(inventory_request_updates).values(**new_update)
    result = db.execute(insert_stmt)
    db.commit()
    
    # Update the request status if needed
    if "new_status" in update_data and update_data["new_status"] != existing_request["status"]:
        update_stmt = update(inventory_requests).where(
            inventory_requests.c.id == request_id
        ).values({"status": update_data["new_status"]})
        db.execute(update_stmt)
        db.commit()
    
    # Fetch created update
    update_id = result.inserted_primary_key[0]
    query = select(inventory_request_updates).where(inventory_request_updates.c.id == update_id)
    result = db.execute(query).fetchone()
    created_update = row_to_dict(result)
    return created_update

@router.delete("/requests/{request_id}", response_model=dict)
def delete_inventory_request(
    request_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can delete requests
):
    # Check if request exists
    query = select(inventory_requests).where(inventory_requests.c.id == request_id)
    existing_request = db.execute(query).fetchone()
    if existing_request is None:
        raise_api_error(404, "Inventory request not found")
    
    try:
        # First, delete any related update records
        delete_updates_stmt = delete(inventory_request_updates).where(inventory_request_updates.c.request_id == request_id)
        db.execute(delete_updates_stmt)
        
        # Then delete the request itself
        delete_stmt = delete(inventory_requests).where(inventory_requests.c.id == request_id)
        db.execute(delete_stmt)
        
        db.commit()
        return {"message": "Inventory request deleted successfully"}
    except Exception as e:
        db.rollback()
        raise_api_error(500, f"Error deleting inventory request: {str(e)}")