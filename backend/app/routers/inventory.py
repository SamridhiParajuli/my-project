# app/routers/inventory.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete
from typing import List, Optional
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import inventory_requests, inventory_request_updates
from ..schemas import schemas
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"],
)

@router.get("/requests", response_model=List[schemas.InventoryRequest])
def get_inventory_requests(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    requesting_department: Optional[int] = None,
    fulfilling_department: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(inventory_requests)
    
    # Add filters if provided
    if status:
        query = query.where(inventory_requests.c.status == status)
    if requesting_department:
        query = query.where(inventory_requests.c.requesting_department == requesting_department)
    if fulfilling_department:
        query = query.where(inventory_requests.c.fulfilling_department == fulfilling_department)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    requests_list = [dict(row._mapping) for row in result]
    return requests_list

@router.get("/requests/{request_id}", response_model=schemas.InventoryRequest)
def get_inventory_request(
    request_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(inventory_requests).where(inventory_requests.c.id == request_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Inventory request not found")
    return dict(result._mapping)

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
        "requested_by": inventory_request.requested_by or current_user["id"],
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
    created_request = dict(result._mapping)
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
        raise HTTPException(status_code=404, detail="Inventory request not found")
    
    existing_request = dict(existing_request._mapping)
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in inventory_request.dict(exclude_unset=True).items():
        if value is not None:
            update_values[key] = value
    
    # If status is changing, log the update
    if "status" in update_values and update_values["status"] != existing_request["status"]:
        update_log = {
            "request_id": request_id,
            "updated_by": current_user["id"],
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
    updated_request = dict(result._mapping)
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
        raise HTTPException(status_code=404, detail="Inventory request not found")
    
    # Get updates for this request
    query = select(inventory_request_updates).where(inventory_request_updates.c.request_id == request_id)
    result = db.execute(query).fetchall()
    updates_list = [dict(row._mapping) for row in result]
    return updates_list

@router.delete("/requests/{request_id}", response_model=dict)
def delete_inventory_request(
    request_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if request exists
    query = select(inventory_requests).where(inventory_requests.c.id == request_id)
    existing_request = db.execute(query).fetchone()
    if existing_request is None:
        raise HTTPException(status_code=404, detail="Inventory request not found")
    
    # Delete request
    delete_stmt = delete(inventory_requests).where(inventory_requests.c.id == request_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Inventory request deleted successfully"}

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
        raise HTTPException(status_code=404, detail="Inventory request not found")
    
    existing_request = dict(existing_request._mapping)
    
    # Create update log
    new_update = {
        "request_id": request_id,
        "updated_by": current_user["id"],
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
    created_update = dict(result._mapping)
    return created_update