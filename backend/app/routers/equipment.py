# app/routers/equipment.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from typing import List, Optional, Dict
from datetime import datetime, date
from ..database.database import get_db
from ..models.reflected_models import equipment, equipment_maintenance, equipment_repair_requests
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/equipment",
    tags=["equipment"],
)

# Equipment endpoints
@router.get("", response_model=Dict)
def get_equipment(
    skip: int = 0, 
    limit: int = 20, 
    status: Optional[str] = None,
    department_id: Optional[int] = None,
    equipment_type: Optional[str] = None,
    sort: str = "equipment_name",
    order: str = "asc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(equipment)
    count_query = select(func.count()).select_from(equipment)
    
    # Apply filters if provided
    if status:
        query = query.where(equipment.c.status == status)
        count_query = count_query.where(equipment.c.status == status)
    if department_id:
        query = query.where(equipment.c.department_id == department_id)
        count_query = count_query.where(equipment.c.department_id == department_id)
    if equipment_type:
        query = query.where(equipment.c.equipment_type == equipment_type)
        count_query = count_query.where(equipment.c.equipment_type == equipment_type)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            equipment.c.equipment_name.ilike(search_pattern),
            equipment.c.equipment_id.ilike(search_pattern),
            equipment.c.equipment_type.ilike(search_pattern),
            equipment.c.location.ilike(search_pattern),
            equipment.c.notes.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(equipment.c, sort):
        sort_column = getattr(equipment.c, sort)
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
    equipment_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": equipment_list,
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

# Equipment Maintenance endpoints
@router.get("/maintenance", response_model=Dict)
def get_maintenance_records(
    skip: int = 0, 
    limit: int = 20, 
    equipment_id: Optional[int] = None,
    status: Optional[str] = None,
    maintenance_type: Optional[str] = None,
    sort: str = "scheduled_date",
    order: str = "desc",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(equipment_maintenance)
    count_query = select(func.count()).select_from(equipment_maintenance)
    
    # Apply filters if provided
    if equipment_id:
        query = query.where(equipment_maintenance.c.equipment_id == equipment_id)
        count_query = count_query.where(equipment_maintenance.c.equipment_id == equipment_id)
    if status:
        query = query.where(equipment_maintenance.c.status == status)
        count_query = count_query.where(equipment_maintenance.c.status == status)
    if maintenance_type:
        query = query.where(equipment_maintenance.c.maintenance_type == maintenance_type)
        count_query = count_query.where(equipment_maintenance.c.maintenance_type == maintenance_type)
    
    # Add sorting
    if hasattr(equipment_maintenance.c, sort):
        sort_column = getattr(equipment_maintenance.c, sort)
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
    maintenance_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": maintenance_list,
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


# Equipment Repair Request endpoints
@router.get("/repairs", response_model=Dict)
def get_repair_requests(
    skip: int = 0, 
    limit: int = 20, 
    equipment_id: Optional[int] = None,
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    sort: str = "reported_date",
    order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(equipment_repair_requests)
    count_query = select(func.count()).select_from(equipment_repair_requests)
    
    # Apply filters if provided
    if equipment_id:
        query = query.where(equipment_repair_requests.c.equipment_id == equipment_id)
        count_query = count_query.where(equipment_repair_requests.c.equipment_id == equipment_id)
    if status:
        query = query.where(equipment_repair_requests.c.status == status)
        count_query = count_query.where(equipment_repair_requests.c.status == status)
    if urgency:
        query = query.where(equipment_repair_requests.c.urgency == urgency)
        count_query = count_query.where(equipment_repair_requests.c.urgency == urgency)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            equipment_repair_requests.c.issue_description.ilike(search_pattern),
            equipment_repair_requests.c.repair_notes.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(equipment_repair_requests.c, sort):
        sort_column = getattr(equipment_repair_requests.c, sort)
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
    repairs_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": repairs_list,
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

@router.get("/{equipment_id}", response_model=schemas.Equipment)
def get_equipment_by_id(
    equipment_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(equipment).where(equipment.c.id == equipment_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Equipment not found")
    return row_to_dict(result)

@router.post("", response_model=schemas.Equipment)
def create_equipment(
    equipment_data: schemas.EquipmentCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can create equipment
):
    # Check if equipment_id already exists if provided
    if equipment_data.equipment_id:
        check_query = select(equipment).where(equipment.c.equipment_id == equipment_data.equipment_id)
        existing_equipment = db.execute(check_query).fetchone()
        if existing_equipment:
            raise_api_error(400, f"Equipment with ID '{equipment_data.equipment_id}' already exists")
    
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
    created_equipment = row_to_dict(result)
    return created_equipment

@router.put("/{equipment_id}", response_model=schemas.Equipment)
def update_equipment(
    equipment_id: int, 
    equipment_data: schemas.EquipmentUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can update equipment
):
    # Check if equipment exists
    query = select(equipment).where(equipment.c.id == equipment_id)
    existing_equipment = db.execute(query).fetchone()
    if existing_equipment is None:
        raise_api_error(404, "Equipment not found")
    
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
    updated_equipment = row_to_dict(result)
    return updated_equipment

@router.delete("/{equipment_id}", response_model=dict)
def delete_equipment(
    equipment_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can delete equipment
):
    # Check if equipment exists
    query = select(equipment).where(equipment.c.id == equipment_id)
    existing_equipment = db.execute(query).fetchone()
    if existing_equipment is None:
        raise_api_error(404, "Equipment not found")
    
    # Delete equipment
    delete_stmt = delete(equipment).where(equipment.c.id == equipment_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Equipment deleted successfully"}



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
        raise_api_error(404, "Equipment not found")
    
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
            equipment_type = row_to_dict(existing_equipment)["equipment_type"]
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
    created_maintenance = row_to_dict(result)
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
        raise_api_error(404, "Maintenance record not found")
    
    existing_maintenance = row_to_dict(existing_maintenance)
    
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
            equipment_details = row_to_dict(equipment_details)
            
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
    updated_maintenance = row_to_dict(result)
    return updated_maintenance

@router.patch("/maintenance/{maintenance_id}/status", response_model=dict)
def update_maintenance_status(
    maintenance_id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if maintenance record exists
    query = select(equipment_maintenance).where(equipment_maintenance.c.id == maintenance_id)
    existing_maintenance = db.execute(query).fetchone()
    if existing_maintenance is None:
        raise_api_error(404, "Maintenance record not found")
    
    existing_maintenance = row_to_dict(existing_maintenance)
    
    # Validate status
    if "status" not in status_update:
        raise_api_error(400, "Status field is required")
    
    new_status = status_update.get("status")
    
    # Update values
    update_values = {"status": new_status}
    
    # If status is "completed", set completed_date if not already set
    if new_status == "completed" and existing_maintenance["status"] != "completed":
        update_values["completed_date"] = datetime.now().date()
        
        # Update equipment's last_maintenance and next_maintenance_due
        equipment_update_values = {
            "last_maintenance": update_values["completed_date"]
        }
        
        # Get equipment details for calculating next maintenance
        equipment_query = select(equipment).where(equipment.c.id == existing_maintenance["equipment_id"])
        equipment_details = db.execute(equipment_query).fetchone()
        
        if equipment_details:
            equipment_details = row_to_dict(equipment_details)
            
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
    updated_maintenance = row_to_dict(result)
    return updated_maintenance


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
        raise_api_error(404, "Equipment not found")
    
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
    created_repair = row_to_dict(result)
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
        raise_api_error(404, "Repair request not found")
    
    existing_repair = row_to_dict(existing_repair)
    
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
    updated_repair = row_to_dict(result)
    return updated_repair

@router.patch("/repairs/{repair_id}/status", response_model=dict)
def update_repair_status(
    repair_id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if repair request exists
    query = select(equipment_repair_requests).where(equipment_repair_requests.c.id == repair_id)
    existing_repair = db.execute(query).fetchone()
    if existing_repair is None:
        raise_api_error(404, "Repair request not found")
    
    existing_repair = row_to_dict(existing_repair)
    
    # Validate status
    if "status" not in status_update:
        raise_api_error(400, "Status field is required")
    
    new_status = status_update.get("status")
    
    # Update values
    update_values = {"status": new_status}
    
    # If status is "completed", set completed_date
    if new_status == "completed" and existing_repair["status"] != "completed":
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
    updated_repair = row_to_dict(result)
    return updated_repair