# app/routers/preorders.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete
from typing import List, Optional
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import pre_orders
from ..schemas import schemas
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/preorders",
    tags=["pre-orders"],
)

@router.get("/", response_model=List[schemas.PreOrder])
def get_preorders(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    target_department: Optional[int] = None,
    assigned_to: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(pre_orders)
    
    # Add filters if provided
    if status:
        query = query.where(pre_orders.c.status == status)
    if target_department:
        query = query.where(pre_orders.c.target_department == target_department)
    if assigned_to:
        query = query.where(pre_orders.c.assigned_to == assigned_to)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    preorders_list = [dict(row._mapping) for row in result]
    return preorders_list

@router.get("/{preorder_id}", response_model=schemas.PreOrder)
def get_preorder(
    preorder_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(pre_orders).where(pre_orders.c.id == preorder_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Pre-order not found")
    return dict(result._mapping)

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
        "requested_by": preorder.requested_by or current_user["id"],
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
    created_preorder = dict(result._mapping)
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
        raise HTTPException(status_code=404, detail="Pre-order not found")
    
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
    updated_preorder = dict(result._mapping)
    return updated_preorder

@router.delete("/{preorder_id}", response_model=dict)
def delete_preorder(
    preorder_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if preorder exists
    query = select(pre_orders).where(pre_orders.c.id == preorder_id)
    existing_preorder = db.execute(query).fetchone()
    if existing_preorder is None:
        raise HTTPException(status_code=404, detail="Pre-order not found")
    
    # Delete preorder
    delete_stmt = delete(pre_orders).where(pre_orders.c.id == preorder_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Pre-order deleted successfully"}