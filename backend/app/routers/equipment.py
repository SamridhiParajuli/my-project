# app/routers/equipment.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete
from typing import List, Optional
from datetime import datetime, date
from ..database.database import get_db
from ..models.reflected_models import equipment, equipment_maintenance, equipment_repair_requests
from ..schemas import schemas
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/equipment",
    tags=["equipment"],
)

# Equipment endpoints
@router.get("/", response_model=List[schemas.Equipment])
def get_equipment(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    department_id: Optional[int] = None,
    equipment_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(equipment)
    
    # Apply filters if provided
    if status:
        query = query.where(equipment.c.status == status)
    if department_id:
        query = query.where(equipment.c.department_id == department_id)
    if equipment_type:
        query = query.where(equipment.c.equipment_type == equipment_type)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    equipment_list = [dict(row._mapping) for row in result]
    return equipment_list

@router.get("/{equipment_id}", response_model=schemas.Equipment)
def get_equipment_by_id(
    equipment_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(equipment).where(equipment.c.id == equipment_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return dict(result._mapping)

@router.post("/", response_model=schemas.Equipment)
def create_equipment(
    equipment_data: schemas.EquipmentCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    new_equipment = {
        "equipment_name": equipment_data.equipment_name,
        "equipment_type": equipment_data.equipment_type,
        "equipment_id": equipment_data.equipment_id,
        "department_id": equipment_data.department_id,
        "location": equipment_data.location,
        "purchase_date": equipment_data.purchase_date,
        "warranty_expires": equipment_data.warranty_expires,
        "assigned_to": equipment_data.assigned_to,
        "status": equipment_data.status,
        "last_maintenance": equipment_data.last_maintenance,
        "next_maintenance_due": equipment_data.next_maintenance_due,
        "notes": equipment_data.notes
    }
    
    insert_stmt = insert(equipment).values(**new_equipment)
    result = db.execute(insert_stmt)
    db.commit()
    
    equipment_id = result.inserted_primary_key[0]
    query = select(equipment).where(equipment.c.id == equipment_id)
    result = db.execute(query).fetchone()
    created_equipment = dict(result._mapping)
    return created_equipment

@router.put("/{equipment_id}", response_model=schemas.Equipment)
def update_equipment(
    equipment_id: int, 
    equipment_data: schemas.EquipmentUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if equipment exists
    query = select(equipment).where(equipment.c.id == equipment_id)
    existing_equipment = db.execute(query).fetchone()
    if existing_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in equipment_data.dict(exclude_unset=True).items():
        if value is not None:
            update_values[key] = value
    
    # Update equipment
    update_stmt = update(equipment).where(equipment.c.id == equipment_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated equipment
    query = select(equipment).where(equipment.c.id == equipment_id)
    result = db.execute(query).fetchone()
    updated_equipment = dict(result._mapping)
    return updated_equipment

@router.delete("/{equipment_id}", response_model=dict)
def delete_equipment(
    equipment_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if equipment exists
    query = select(equipment).where(equipment.c.id == equipment_id)
    existing_equipment = db.execute(query).fetchone()
    if existing_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    # Delete equipment
    delete_stmt = delete(equipment).where(equipment.c.id == equipment_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Equipment deleted successfully"}

# Equipment Maintenance endpoints
@router.get("/maintenance", response_model=List[dict])
def get_maintenance_records(
    skip: int = 0, 
    limit: int = 100, 
    equipment_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(equipment_maintenance)
    
    # Apply filters if provided
    if equipment_id:
        query = query.where(equipment_maintenance.c.equipment_id == equipment_id)
    if status:
        query = query.where(equipment_maintenance.c.status == status)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    maintenance_list = [dict(row._mapping) for row in result]
    return maintenance_list

@router.post("/maintenance", response_model=dict)
def create_maintenance_record(
    maintenance_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if equipment exists
    query = select(equipment).where(equipment.c.id == maintenance_data["equipment_id"])
    existing_equipment = db.execute(query).fetchone()
    if existing_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    new_maintenance = {
        "equipment_id": maintenance_data["equipment_id"],
        "maintenance_type": maintenance_data["maintenance_type"],
        "scheduled_date": maintenance_data["scheduled_date"],
        "completed_date": maintenance_data.get("completed_date"),
        "performed_by": maintenance_data.get("performed_by"),
        "maintenance_notes": maintenance_data.get("maintenance_notes"),
        "status": maintenance_data.get("status", "scheduled"),
        "created_by": current_user["id"]
    }
    
    insert_stmt = insert(equipment_maintenance).values(**new_maintenance)
    result = db.execute(insert_stmt)
    db.commit()
    
    maintenance_id = result.inserted_primary_key[0]
    
    # Update equipment's last_maintenance and next_maintenance_due if maintenance is completed
    if new_maintenance.get("status") == "completed" and new_maintenance.get("completed_date"):
        update_values = {
            "last_maintenance": new_maintenance["completed_date"]
        }
        
        # If maintenance_type is 'regular', schedule next maintenance based on equipment type
        if new_maintenance["maintenance_type"] == "regular":
            # This is a simplification - in a real app you might have more complex logic
            # to determine the next maintenance date based on equipment type, usage, etc.
            next_maintenance = date.fromisoformat(str(new_maintenance["completed_date"])) 
            
            # Add appropriate interval based on equipment type
            equipment_type = dict(existing_equipment._mapping)["equipment_type"]
            if equipment_type == "refrigeration":
                # Every 3 months for refrigeration
                next_maintenance = next_maintenance.replace(month=next_maintenance.month + 3)
            elif equipment_type == "heating":
                # Every 6 months for heating
                next_maintenance = next_maintenance.replace(month=next_maintenance.month + 6)
            else:
                # Default to annual maintenance
                next_maintenance = next_maintenance.replace(year=next_maintenance.year + 1)
            
            update_values["next_maintenance_due"] = next_maintenance
        
        update_stmt = update(equipment).where(equipment.c.id == new_maintenance["equipment_id"]).values(**update_values)
        db.execute(update_stmt)
        db.commit()
    
    # Fetch created maintenance record
    query = select(equipment_maintenance).where(equipment_maintenance.c.id == maintenance_id)
    result = db.execute(query).fetchone()
    created_maintenance = dict(result._mapping)
    return created_maintenance

@router.put("/maintenance/{maintenance_id}", response_model=dict)
def update_maintenance_record(
    maintenance_id: int, 
    maintenance_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if maintenance record exists
    query = select(equipment_maintenance).where(equipment_maintenance.c.id == maintenance_id)
    existing_maintenance = db.execute(query).fetchone()
    if existing_maintenance is None:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    
    existing_maintenance = dict(existing_maintenance._mapping)
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in maintenance_data.items():
        if value is not None:
            update_values[key] = value
    
    # Handle status change to completed
    if "status" in update_values and update_values["status"] == "completed" and existing_maintenance["status"] != "completed":
        # Set completed_date if not provided
        if "completed_date" not in update_values:
            update_values["completed_date"] = datetime.now().date()
        
        # Update equipment's last_maintenance and next_maintenance_due
        equipment_update_values = {
            "last_maintenance": update_values["completed_date"]
        }
        
        # Get equipment details for calculating next maintenance
        equipment_query = select(equipment).where(equipment.c.id == existing_maintenance["equipment_id"])
        equipment_details = db.execute(equipment_query).fetchone()
        
        if equipment_details:
            equipment_details = dict(equipment_details._mapping)
            
            # Calculate next maintenance date if this is a regular maintenance
            if existing_maintenance["maintenance_type"] == "regular":
                next_maintenance = date.fromisoformat(str(update_values["completed_date"]))
                
                # Add appropriate interval based on equipment type
                if equipment_details["equipment_type"] == "refrigeration":
                    next_maintenance = next_maintenance.replace(month=next_maintenance.month + 3)
                elif equipment_details["equipment_type"] == "heating":
                    next_maintenance = next_maintenance.replace(month=next_maintenance.month + 6)
                else:
                    next_maintenance = next_maintenance.replace(year=next_maintenance.year + 1)
                
                equipment_update_values["next_maintenance_due"] = next_maintenance
            
            # Update equipment record
            equipment_update_stmt = update(equipment).where(equipment.c.id == existing_maintenance["equipment_id"]).values(**equipment_update_values)
            db.execute(equipment_update_stmt)
    
    # Update maintenance record
    update_stmt = update(equipment_maintenance).where(equipment_maintenance.c.id == maintenance_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated maintenance record
    query = select(equipment_maintenance).where(equipment_maintenance.c.id == maintenance_id)
    result = db.execute(query).fetchone()
    updated_maintenance = dict(result._mapping)
    return updated_maintenance

# Equipment Repair Request endpoints
@router.get("/repairs", response_model=List[dict])
def get_repair_requests(
    skip: int = 0, 
    limit: int = 100, 
    equipment_id: Optional[int] = None,
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(equipment_repair_requests)
    
    # Apply filters if provided
    if equipment_id:
        query = query.where(equipment_repair_requests.c.equipment_id == equipment_id)
    if status:
        query = query.where(equipment_repair_requests.c.status == status)
    if urgency:
        query = query.where(equipment_repair_requests.c.urgency == urgency)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    repairs_list = [dict(row._mapping) for row in result]
    return repairs_list

@router.post("/repairs", response_model=dict)
def create_repair_request(
    repair_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if equipment exists
    query = select(equipment).where(equipment.c.id == repair_data["equipment_id"])
    existing_equipment = db.execute(query).fetchone()
    if existing_equipment is None:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    new_repair = {
        "equipment_id": repair_data["equipment_id"],
        "reported_by": repair_data.get("reported_by", current_user["id"]),
        "issue_description": repair_data["issue_description"],
        "urgency": repair_data.get("urgency", "medium"),
        "status": repair_data.get("status", "reported"),
        "assigned_to": repair_data.get("assigned_to"),
        "estimated_cost": repair_data.get("estimated_cost"),
        "repair_notes": repair_data.get("repair_notes")
    }
    
    insert_stmt = insert(equipment_repair_requests).values(**new_repair)
    result = db.execute(insert_stmt)
    db.commit()
    
    repair_id = result.inserted_primary_key[0]
    
    # Update equipment status to reflect repair is needed
    update_stmt = update(equipment).where(equipment.c.id == new_repair["equipment_id"]).values({"status": "needs_repair"})
    db.execute(update_stmt)
    db.commit()
    
    # Fetch created repair request
    query = select(equipment_repair_requests).where(equipment_repair_requests.c.id == repair_id)
    result = db.execute(query).fetchone()
    created_repair = dict(result._mapping)
    return created_repair

@router.put("/repairs/{repair_id}", response_model=dict)
def update_repair_request(
    repair_id: int, 
    repair_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if repair request exists
    query = select(equipment_repair_requests).where(equipment_repair_requests.c.id == repair_id)
    existing_repair = db.execute(query).fetchone()
    if existing_repair is None:
        raise HTTPException(status_code=404, detail="Repair request not found")
    
    existing_repair = dict(existing_repair._mapping)
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in repair_data.items():
        if value is not None:
            update_values[key] = value
    
    # Handle status change to completed
    if "status" in update_values and update_values["status"] == "completed" and existing_repair["status"] != "completed":
        # Set completed_date if not provided
        update_values["completed_date"] = datetime.now()
        
        # Update equipment status back to operational
        update_stmt = update(equipment).where(equipment.c.id == existing_repair["equipment_id"]).values({"status": "operational"})
        db.execute(update_stmt)
    
    # Update repair request
    update_stmt = update(equipment_repair_requests).where(equipment_repair_requests.c.id == repair_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated repair request
    query = select(equipment_repair_requests).where(equipment_repair_requests.c.id == repair_id)
    result = db.execute(query).fetchone()
    updated_repair = dict(result._mapping)
    return updated_repair