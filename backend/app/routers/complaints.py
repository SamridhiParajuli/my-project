# app/routers/complaints.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_, and_
from typing import List, Optional, Dict
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import customer_complaints, employees, departments
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/complaints",
    tags=["customer complaints"],
)

@router.get("/", response_model=Dict)
def get_complaints(
    skip: int = 0, 
    limit: int = 20, 
    status: Optional[str] = None,
    severity: Optional[str] = None,
    department_involved: Optional[int] = None,
    sort: str = "created_at",
    order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query with joins to get names
    base_query = select(
        customer_complaints,
        employees.c.first_name.label("assigned_to_first_name"),
        employees.c.last_name.label("assigned_to_last_name"),
        departments.c.name.label("department_name")
    ).select_from(
        customer_complaints.outerjoin(
            employees, customer_complaints.c.assigned_to == employees.c.id
        ).outerjoin(
            departments, customer_complaints.c.department_involved == departments.c.id
        )
    )
    
    # Apply role-based filtering
    if current_user["role"] == "admin":
        # Admins can see all complaints
        pass
    elif current_user["role"] == "manager" and current_user.get("department_id"):
        # Managers can see all complaints for their department
        base_query = base_query.where(customer_complaints.c.department_involved == current_user["department_id"])
    else:
        # Staff can only see non-severe complaints from their department
        base_query = base_query.where(
            and_(
                customer_complaints.c.department_involved == current_user.get("department_id"),
                customer_complaints.c.severity != "high",
                customer_complaints.c.is_private != True
            )
        )
    
    # Count query - needs to match the filters above
    count_query = select(func.count()).select_from(customer_complaints)
    
    # Apply the same role-based filtering to count query
    if current_user["role"] == "admin":
        # Admins can see all complaints
        pass
    elif current_user["role"] == "manager" and current_user.get("department_id"):
        # Managers can see all complaints for their department
        count_query = count_query.where(customer_complaints.c.department_involved == current_user["department_id"])
    else:
        # Staff can only see non-severe complaints from their department
        count_query = count_query.where(
            and_(
                customer_complaints.c.department_involved == current_user.get("department_id"),
                customer_complaints.c.severity != "high",
                customer_complaints.c.is_private != True
            )
        )
    
    # Add filters if provided
    if status:
        base_query = base_query.where(customer_complaints.c.status == status)
        count_query = count_query.where(customer_complaints.c.status == status)
    if severity:
        base_query = base_query.where(customer_complaints.c.severity == severity)
        count_query = count_query.where(customer_complaints.c.severity == severity)
    if department_involved:
        # Only apply department filter if user is an admin (managers and staff already filtered by department)
        if current_user["role"] == "admin":
            base_query = base_query.where(customer_complaints.c.department_involved == department_involved)
            count_query = count_query.where(customer_complaints.c.department_involved == department_involved)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            customer_complaints.c.customer_name.ilike(search_pattern),
            customer_complaints.c.customer_email.ilike(search_pattern),
            customer_complaints.c.description.ilike(search_pattern),
            customer_complaints.c.complaint_type.ilike(search_pattern)
        )
        base_query = base_query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(customer_complaints.c, sort):
        sort_column = getattr(customer_complaints.c, sort)
        if order.lower() == "asc":
            base_query = base_query.order_by(sort_column.asc())
        else:
            base_query = base_query.order_by(sort_column.desc())
    
    # Get total count for pagination
    total_count = db.execute(count_query).scalar()
    
    # Apply pagination
    query = base_query.offset(skip).limit(limit)
    
    # Execute query
    result = db.execute(query).fetchall()
    
    # Process the results to add name fields
    complaints_list = []
    for row in result:
        complaint_dict = {}
        for key in customer_complaints.columns.keys():
            complaint_dict[key] = getattr(row, key)
        
        # Add the joined names
        if row.assigned_to_first_name and row.assigned_to_last_name:
            complaint_dict["assigned_to_name"] = f"{row.assigned_to_first_name} {row.assigned_to_last_name}"
        complaint_dict["department_involved_name"] = row.department_name
        
        complaints_list.append(complaint_dict)
    
    # Add reported_by names in a separate query to avoid complex joins
    if complaints_list:
        # Get all unique reported_by IDs
        reported_by_ids = set(complaint["reported_by"] for complaint in complaints_list if complaint["reported_by"])
        
        if reported_by_ids:
            # Query to get all employee names at once
            employees_query = select(
                employees.c.id,
                employees.c.first_name,
                employees.c.last_name
            ).where(employees.c.id.in_(reported_by_ids))
            
            employees_result = db.execute(employees_query).fetchall()
            
            # Create a map of employee ID to name
            employee_map = {
                row.id: f"{row.first_name} {row.last_name}" 
                for row in employees_result
            }
            
            # Update complaints with employee names
            for complaint in complaints_list:
                if complaint["reported_by"] and complaint["reported_by"] in employee_map:
                    complaint["reported_by_name"] = employee_map[complaint["reported_by"]]
    
    # Return with pagination metadata
    return {
        "items": complaints_list,
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

@router.get("/department/{department_id}", response_model=Dict)
def get_department_complaints(
    department_id: int,
    skip: int = 0, 
    limit: int = 20,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    sort: str = "created_at",
    order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get all complaints for a specific department.
    Department managers can access their department's complaints.
    """
    # Verify access rights (admin or department manager/staff)
    if current_user["role"] != "admin" and current_user.get("department_id") != department_id:
        raise_api_error(403, "Not authorized to view department complaints")
    
    # Base query with joins for name resolution
    base_query = select(
        customer_complaints,
        employees.c.first_name.label("assigned_to_first_name"),
        employees.c.last_name.label("assigned_to_last_name"),
        departments.c.name.label("department_name")
    ).select_from(
        customer_complaints.outerjoin(
            employees, customer_complaints.c.assigned_to == employees.c.id
        ).outerjoin(
            departments, customer_complaints.c.department_involved == departments.c.id
        )
    ).where(customer_complaints.c.department_involved == department_id)
    
    # Apply visibility filtering based on role
    if current_user["role"] != "admin" and current_user["role"] != "manager":
        # Regular staff can't see private or high severity complaints
        base_query = base_query.where(
            and_(
                customer_complaints.c.severity != "high",
                customer_complaints.c.is_private != True
            )
        )
    
    # Count query - needs to match the filters above
    count_query = select(func.count()).select_from(customer_complaints)
    count_query = count_query.where(customer_complaints.c.department_involved == department_id)
    
    # Apply the same visibility filtering to count query
    if current_user["role"] != "admin" and current_user["role"] != "manager":
        # Regular staff can't see private or high severity complaints
        count_query = count_query.where(
            and_(
                customer_complaints.c.severity != "high",
                customer_complaints.c.is_private != True
            )
        )
    
    # Add filters if provided
    if status:
        base_query = base_query.where(customer_complaints.c.status == status)
        count_query = count_query.where(customer_complaints.c.status == status)
    if severity:
        base_query = base_query.where(customer_complaints.c.severity == severity)
        count_query = count_query.where(customer_complaints.c.severity == severity)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            customer_complaints.c.customer_name.ilike(search_pattern),
            customer_complaints.c.customer_email.ilike(search_pattern),
            customer_complaints.c.description.ilike(search_pattern),
            customer_complaints.c.complaint_type.ilike(search_pattern)
        )
        base_query = base_query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(customer_complaints.c, sort):
        sort_column = getattr(customer_complaints.c, sort)
        if order.lower() == "asc":
            base_query = base_query.order_by(sort_column.asc())
        else:
            base_query = base_query.order_by(sort_column.desc())
    
    # Get total count for pagination
    total_count = db.execute(count_query).scalar()
    
    # Apply pagination
    query = base_query.offset(skip).limit(limit)
    
    # Execute query
    result = db.execute(query).fetchall()
    
    # Process the results to add name fields
    complaints_list = []
    for row in result:
        complaint_dict = {}
        for key in customer_complaints.columns.keys():
            complaint_dict[key] = getattr(row, key)
        
        # Add the joined names
        if row.assigned_to_first_name and row.assigned_to_last_name:
            complaint_dict["assigned_to_name"] = f"{row.assigned_to_first_name} {row.assigned_to_last_name}"
        complaint_dict["department_involved_name"] = row.department_name
        
        complaints_list.append(complaint_dict)
    
    # Add reported_by names in a separate query to avoid complex joins
    if complaints_list:
        # Get all unique reported_by IDs
        reported_by_ids = set(complaint["reported_by"] for complaint in complaints_list if complaint["reported_by"])
        
        if reported_by_ids:
            # Query to get all employee names at once
            employees_query = select(
                employees.c.id,
                employees.c.first_name,
                employees.c.last_name
            ).where(employees.c.id.in_(reported_by_ids))
            
            employees_result = db.execute(employees_query).fetchall()
            
            # Create a map of employee ID to name
            employee_map = {
                row.id: f"{row.first_name} {row.last_name}" 
                for row in employees_result
            }
            
            # Update complaints with employee names
            for complaint in complaints_list:
                if complaint["reported_by"] and complaint["reported_by"] in employee_map:
                    complaint["reported_by_name"] = employee_map[complaint["reported_by"]]
    
    # Return with pagination metadata
    return {
        "items": complaints_list,
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

@router.get("/department-handlers/{department_id}", response_model=List[dict])
def get_department_handlers(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get employees who can handle complaints for a specific department.
    Used for assigning complaints to appropriate handlers.
    """
    query = select(
        employees.c.id, 
        employees.c.first_name,
        employees.c.last_name,
        employees.c.position
    ).where(
        (employees.c.department_id == department_id) &
        (employees.c.status == "active")
    )
    
    result = db.execute(query).fetchall()
    handlers_list = [dict(row._mapping) for row in result]
    
    return handlers_list

@router.get("/{complaint_id}", response_model=schemas.ComplaintWithNames)
def get_complaint(
    complaint_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Create a join query to get complaint with employee and department names
    query = select(
        customer_complaints,
        employees.c.first_name.label("assigned_to_first_name"),
        employees.c.last_name.label("assigned_to_last_name"),
        departments.c.name.label("department_name")
    ).select_from(
        customer_complaints.outerjoin(
            employees, customer_complaints.c.assigned_to == employees.c.id
        ).outerjoin(
            departments, customer_complaints.c.department_involved == departments.c.id
        )
    ).where(customer_complaints.c.id == complaint_id)
    
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Complaint not found")
    
    # Convert SQLAlchemy row to dict
    complaint_dict = {}
    for key in customer_complaints.columns.keys():
        complaint_dict[key] = getattr(result, key)
    
    # Check access permissions
    if current_user["role"] == "admin":
        # Admins can see all complaints
        pass
    elif current_user["role"] == "manager" and current_user.get("department_id") == complaint_dict["department_involved"]:
        # Managers can see all complaints for their department
        pass
    elif current_user.get("department_id") == complaint_dict["department_involved"]:
        # Staff can only see non-private and non-high severity complaints from their department
        if complaint_dict.get("is_private") or complaint_dict.get("severity") == "high":
            raise_api_error(403, "You don't have permission to view this complaint")
    else:
        # Other users cannot see complaints from other departments
        raise_api_error(403, "You don't have permission to view this complaint")
    
    # Add the joined names
    if result.assigned_to_first_name and result.assigned_to_last_name:
        complaint_dict["assigned_to_name"] = f"{result.assigned_to_first_name} {result.assigned_to_last_name}"
    complaint_dict["department_involved_name"] = result.department_name
    
    # Get reported_by name
    if complaint_dict["reported_by"]:
        reported_by_query = select(employees.c.first_name, employees.c.last_name).where(
            employees.c.id == complaint_dict["reported_by"]
        )
        reported_by_result = db.execute(reported_by_query).fetchone()
        if reported_by_result:
            complaint_dict["reported_by_name"] = f"{reported_by_result.first_name} {reported_by_result.last_name}"
    
    return complaint_dict

@router.post("/", response_model=schemas.ComplaintWithNames)
def create_complaint(
    complaint: schemas.ComplaintCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    new_complaint = {
        "customer_name": complaint.customer_name,
        "customer_email": complaint.customer_email,
        "customer_phone": complaint.customer_phone,
        "complaint_type": complaint.complaint_type,
        "description": complaint.description,
        "department_involved": complaint.department_involved,
        "reported_by": complaint.reported_by or current_user["id"],
        "severity": complaint.severity,
        "status": complaint.status,
        "resolution": complaint.resolution,
        "assigned_to": complaint.assigned_to,
        "is_private": complaint.is_private or (complaint.severity == "high")  # Automatically make high severity complaints private
    }
    
    # If department is specified but no assignee, try to auto-assign to department manager
    if complaint.department_involved and not complaint.assigned_to:
        # Find a manager or lead in the department
        manager_query = select(employees.c.id).where(
            (employees.c.department_id == complaint.department_involved) &
            (employees.c.status == "active") &
            (or_(
                employees.c.position.ilike("%manager%"),
                employees.c.position.ilike("%lead%")
            ))
        ).limit(1)
        
        manager_result = db.execute(manager_query).fetchone()
        if manager_result:
            new_complaint["assigned_to"] = manager_result[0]
    
    insert_stmt = insert(customer_complaints).values(**new_complaint)
    result = db.execute(insert_stmt)
    db.commit()
    
    complaint_id = result.inserted_primary_key[0]
    
    # Use the get_complaint endpoint to fetch the complaint with names
    return get_complaint(complaint_id, db, current_user)

@router.put("/{complaint_id}", response_model=schemas.ComplaintWithNames)
def update_complaint(
    complaint_id: int, 
    complaint: schemas.ComplaintUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if complaint exists
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    existing_complaint = db.execute(query).fetchone()
    if existing_complaint is None:
        raise_api_error(404, "Complaint not found")
    
    existing_complaint_dict = row_to_dict(existing_complaint)
    
    # Check permissions to update
    is_admin = current_user["role"] == "admin"
    is_manager = current_user["role"] == "manager" and current_user.get("department_id") == existing_complaint_dict["department_involved"]
    is_handler = current_user.get("id") == existing_complaint_dict.get("assigned_to")
    
    if not (is_admin or is_manager or is_handler):
        raise_api_error(403, "You don't have permission to update this complaint")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in complaint.dict(exclude_unset=True).items():
        if value is not None:
            update_values[key] = value
    
    # Set resolved_at timestamp if status is changing to resolved
    if "status" in update_values and update_values["status"] == "resolved":
        update_values["resolved_at"] = datetime.now()
    
    # If changing department but not assigned_to, try to auto-assign to department manager
    if "department_involved" in update_values and update_values["department_involved"] and "assigned_to" not in update_values:
        # Find a manager or lead in the department
        manager_query = select(employees.c.id).where(
            (employees.c.department_id == update_values["department_involved"]) &
            (employees.c.status == "active") &
            (or_(
                employees.c.position.ilike("%manager%"),
                employees.c.position.ilike("%lead%")
            ))
        ).limit(1)
        
        manager_result = db.execute(manager_query).fetchone()
        if manager_result:
            update_values["assigned_to"] = manager_result[0]
    
    # Update complaint
    update_stmt = update(customer_complaints).where(customer_complaints.c.id == complaint_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Use the get_complaint endpoint to fetch the updated complaint with names
    return get_complaint(complaint_id, db, current_user)

@router.patch("/{complaint_id}/status", response_model=schemas.ComplaintWithNames)
def update_complaint_status(
    complaint_id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if complaint exists
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    existing_complaint = db.execute(query).fetchone()
    if existing_complaint is None:
        raise_api_error(404, "Complaint not found")
    
    existing_complaint_dict = row_to_dict(existing_complaint)
    
    # Check permissions to update status
    is_admin = current_user["role"] == "admin"
    is_manager = current_user["role"] == "manager" and current_user.get("department_id") == existing_complaint_dict["department_involved"]
    is_handler = current_user.get("id") == existing_complaint_dict.get("assigned_to")
    
    if not (is_admin or is_manager or is_handler):
        raise_api_error(403, "You don't have permission to update this complaint's status")
    
    # Validate status
    if "status" not in status_update:
        raise_api_error(400, "Status field is required")
    
    # Update status
    update_values = {"status": status_update.get("status")}
    
    # If status is "resolved", set resolved_at timestamp
    if status_update.get("status") == "resolved":
        update_values["resolved_at"] = datetime.now()
    
    update_stmt = update(customer_complaints).where(customer_complaints.c.id == complaint_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Use the get_complaint endpoint to fetch the updated complaint with names
    return get_complaint(complaint_id, db, current_user)

@router.patch("/{complaint_id}/assign", response_model=schemas.ComplaintWithNames)
def assign_complaint(
    complaint_id: int,
    assignment: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Assign a complaint to an employee for handling.
    Only managers, admins, or department staff can assign complaints.
    """
    # Check if complaint exists
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    existing_complaint = db.execute(query).fetchone()
    if existing_complaint is None:
        raise_api_error(404, "Complaint not found")
    
    existing_complaint_dict = row_to_dict(existing_complaint)
    
    # Check authorization based on role and department
    is_admin_or_manager = current_user["role"] in ["admin", "manager"]
    is_same_department = current_user.get("department_id") == existing_complaint_dict["department_involved"]
    
    if not (is_admin_or_manager or is_same_department):
        raise_api_error(403, "You do not have permission to assign this complaint")
    
    # Validate assignment
    if "assigned_to" not in assignment:
        raise_api_error(400, "assigned_to field is required")
    
    # Update assignment
    update_values = {"assigned_to": assignment.get("assigned_to")}
    
    # If changing to "in_progress" status
    if existing_complaint_dict["status"] == "open":
        update_values["status"] = "in_progress"
    
    update_stmt = update(customer_complaints).where(customer_complaints.c.id == complaint_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Use the get_complaint endpoint to fetch the updated complaint with names
    return get_complaint(complaint_id, db, current_user)

@router.patch("/{complaint_id}/privacy", response_model=schemas.ComplaintWithNames)
def update_complaint_privacy(
    complaint_id: int,
    privacy_update: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can update privacy
):
    """
    Update the privacy settings of a complaint.
    Only managers or admins can modify the privacy settings.
    """
    # Check if complaint exists
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    existing_complaint = db.execute(query).fetchone()
    if existing_complaint is None:
        raise_api_error(404, "Complaint not found")
    
    # Validate privacy update
    if "is_private" not in privacy_update:
        raise_api_error(400, "is_private field is required")
    
    # Update privacy setting
    update_values = {"is_private": privacy_update.get("is_private")}
    
    update_stmt = update(customer_complaints).where(customer_complaints.c.id == complaint_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Use the get_complaint endpoint to fetch the updated complaint with names
    return get_complaint(complaint_id, db, current_user)

@router.delete("/{complaint_id}", response_model=dict)
def delete_complaint(
    complaint_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can delete complaints
):
    # Check if complaint exists
    query = select(customer_complaints).where(customer_complaints.c.id == complaint_id)
    existing_complaint = db.execute(query).fetchone()
    if existing_complaint is None:
        raise_api_error(404, "Complaint not found")
    
    # Delete complaint
    delete_stmt = delete(customer_complaints).where(customer_complaints.c.id == complaint_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Complaint deleted successfully"}