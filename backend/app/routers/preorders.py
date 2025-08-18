# app/routers/preorders.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_, and_
from typing import List, Optional, Dict
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import pre_orders, employees, departments
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/preorders",
    tags=["pre-orders"],
)

@router.get("", response_model=Dict)
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
    # Base query with joins to get names
    base_query = select(
        pre_orders,
        employees.c.first_name.label("assigned_to_first_name"),
        employees.c.last_name.label("assigned_to_last_name"),
        departments.c.name.label("department_name")
    ).select_from(
        pre_orders.outerjoin(
            employees, pre_orders.c.assigned_to == employees.c.id
        ).outerjoin(
            departments, pre_orders.c.target_department == departments.c.id
        )
    )
    
    # Apply role-based filtering
    if current_user["role"] == "admin":
        # Admins can see all pre-orders
        pass
    elif current_user["role"] == "manager" and current_user.get("department_id"):
        # Managers can see all pre-orders for their department
        base_query = base_query.where(pre_orders.c.target_department == current_user["department_id"])
    else:
        # Staff can only see pre-orders from their department that are assigned to them
        base_query = base_query.where(
            and_(
                pre_orders.c.target_department == current_user.get("department_id"),
                pre_orders.c.assigned_to == current_user.get("employee_id")
            )
        )
    
    # Count query - needs to match the filters above
    count_query = select(func.count()).select_from(pre_orders)
    
    # Apply the same role-based filtering to count query
    if current_user["role"] == "admin":
        # Admins can see all pre-orders
        pass
    elif current_user["role"] == "manager" and current_user.get("department_id"):
        # Managers can see all pre-orders for their department
        count_query = count_query.where(pre_orders.c.target_department == current_user["department_id"])
    else:
        # Staff can only see pre-orders from their department that are assigned to them
        count_query = count_query.where(
            and_(
                pre_orders.c.target_department == current_user.get("department_id"),
                pre_orders.c.assigned_to == current_user.get("employee_id")
            )
        )
    
    # Add filters if provided
    if status:
        base_query = base_query.where(pre_orders.c.status == status)
        count_query = count_query.where(pre_orders.c.status == status)
    if target_department and current_user["role"] == "admin":
        # Only apply department filter if user is an admin (managers and staff already filtered by department)
        base_query = base_query.where(pre_orders.c.target_department == target_department)
        count_query = count_query.where(pre_orders.c.target_department == target_department)
    if assigned_to:
        base_query = base_query.where(pre_orders.c.assigned_to == assigned_to)
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
        base_query = base_query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(pre_orders.c, sort):
        sort_column = getattr(pre_orders.c, sort)
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
    preorders_list = []
    for row in result:
        preorder_dict = {}
        for key in pre_orders.columns.keys():
            preorder_dict[key] = getattr(row, key)
        
        # Add the joined names
        if row.assigned_to_first_name and row.assigned_to_last_name:
            preorder_dict["assigned_to_name"] = f"{row.assigned_to_first_name} {row.assigned_to_last_name}"
        preorder_dict["target_department_name"] = row.department_name
        
        preorders_list.append(preorder_dict)
    
    # Add requested_by names in a separate query to avoid complex joins
    if preorders_list:
        # Get all unique requested_by IDs
        requested_by_ids = set(preorder["requested_by"] for preorder in preorders_list if preorder["requested_by"])
        
        if requested_by_ids:
            # Query to get all employee names at once
            employees_query = select(
                employees.c.id,
                employees.c.first_name,
                employees.c.last_name
            ).where(employees.c.id.in_(requested_by_ids))
            
            employees_result = db.execute(employees_query).fetchall()
            
            # Create a map of employee ID to name
            employee_map = {
                row.id: f"{row.first_name} {row.last_name}" 
                for row in employees_result
            }
            
            # Update preorders with employee names
            for preorder in preorders_list:
                if preorder["requested_by"] and preorder["requested_by"] in employee_map:
                    preorder["requested_by_name"] = employee_map[preorder["requested_by"]]
    
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

@router.get("/department/{department_id}", response_model=Dict)
def get_department_preorders(
    department_id: int,
    skip: int = 0, 
    limit: int = 20,
    status: Optional[str] = None,
    sort: str = "created_at",
    order: str = "desc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get all pre-orders for a specific department.
    Department managers can access all their department's pre-orders.
    Staff can only see pre-orders assigned to them.
    """
    # Verify access rights (admin, department manager, or department staff)
    if current_user["role"] != "admin" and current_user.get("department_id") != department_id:
        raise_api_error(403, "Not authorized to view department pre-orders")
    
    # Base query with joins for name resolution
    base_query = select(
        pre_orders,
        employees.c.first_name.label("assigned_to_first_name"),
        employees.c.last_name.label("assigned_to_last_name"),
        departments.c.name.label("department_name")
    ).select_from(
        pre_orders.outerjoin(
            employees, pre_orders.c.assigned_to == employees.c.id
        ).outerjoin(
            departments, pre_orders.c.target_department == departments.c.id
        )
    ).where(pre_orders.c.target_department == department_id)
    
    # Apply role-based filtering
    if current_user["role"] != "admin" and current_user["role"] != "manager":
        # Regular staff can only see pre-orders assigned to them
        base_query = base_query.where(pre_orders.c.assigned_to == current_user.get("employee_id"))
    
    # Count query - needs to match the filters above
    count_query = select(func.count()).select_from(pre_orders)
    count_query = count_query.where(pre_orders.c.target_department == department_id)
    
    # Apply the same role-based filtering to count query
    if current_user["role"] != "admin" and current_user["role"] != "manager":
        # Regular staff can only see pre-orders assigned to them
        count_query = count_query.where(pre_orders.c.assigned_to == current_user.get("employee_id"))
    
    # Add filters if provided
    if status:
        base_query = base_query.where(pre_orders.c.status == status)
        count_query = count_query.where(pre_orders.c.status == status)
    
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
        base_query = base_query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(pre_orders.c, sort):
        sort_column = getattr(pre_orders.c, sort)
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
    preorders_list = []
    for row in result:
        preorder_dict = {}
        for key in pre_orders.columns.keys():
            preorder_dict[key] = getattr(row, key)
        
        # Add the joined names
        if row.assigned_to_first_name and row.assigned_to_last_name:
            preorder_dict["assigned_to_name"] = f"{row.assigned_to_first_name} {row.assigned_to_last_name}"
        preorder_dict["target_department_name"] = row.department_name
        
        preorders_list.append(preorder_dict)
    
    # Add requested_by names in a separate query to avoid complex joins
    if preorders_list:
        # Get all unique requested_by IDs
        requested_by_ids = set(preorder["requested_by"] for preorder in preorders_list if preorder["requested_by"])
        
        if requested_by_ids:
            # Query to get all employee names at once
            employees_query = select(
                employees.c.id,
                employees.c.first_name,
                employees.c.last_name
            ).where(employees.c.id.in_(requested_by_ids))
            
            employees_result = db.execute(employees_query).fetchall()
            
            # Create a map of employee ID to name
            employee_map = {
                row.id: f"{row.first_name} {row.last_name}" 
                for row in employees_result
            }
            
            # Update preorders with employee names
            for preorder in preorders_list:
                if preorder["requested_by"] and preorder["requested_by"] in employee_map:
                    preorder["requested_by_name"] = employee_map[preorder["requested_by"]]
    
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

@router.get("/department-managers/{department_id}", response_model=List[dict])
def get_department_managers(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get managers for a specific department.
    Used for automatically assigning pre-orders to department managers.
    """
    query = select(
        employees.c.id, 
        employees.c.first_name,
        employees.c.last_name,
        employees.c.position
    ).where(
        (employees.c.department_id == department_id) &
        (employees.c.status == "active") &
        (or_(
            employees.c.position.ilike("%manager%"),
            employees.c.position.ilike("%lead%")
        ))
    )
    
    result = db.execute(query).fetchall()
    managers_list = [dict(row._mapping) for row in result]
    
    return managers_list

@router.get("/{preorder_id}", response_model=schemas.PreOrderWithNames)
def get_preorder(
    preorder_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Create a join query to get preorder with employee and department names
    query = select(
        pre_orders,
        employees.c.first_name.label("assigned_to_first_name"),
        employees.c.last_name.label("assigned_to_last_name"),
        departments.c.name.label("department_name")
    ).select_from(
        pre_orders.outerjoin(
            employees, pre_orders.c.assigned_to == employees.c.id
        ).outerjoin(
            departments, pre_orders.c.target_department == departments.c.id
        )
    ).where(pre_orders.c.id == preorder_id)
    
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Pre-order not found")
    
    # Check access permissions
    preorder_dict = {}
    for key in pre_orders.columns.keys():
        preorder_dict[key] = getattr(result, key)
    
    if current_user["role"] == "admin":
        # Admins can see all pre-orders
        pass
    elif current_user["role"] == "manager" and current_user.get("department_id") == preorder_dict["target_department"]:
        # Managers can see all pre-orders for their department
        pass
    elif current_user.get("employee_id") == preorder_dict["assigned_to"]:
        # Staff can see pre-orders assigned to them
        pass
    else:
        # Other users cannot see this pre-order
        raise_api_error(403, "You don't have permission to view this pre-order")
    
    # Add the joined names
    if result.assigned_to_first_name and result.assigned_to_last_name:
        preorder_dict["assigned_to_name"] = f"{result.assigned_to_first_name} {result.assigned_to_last_name}"
    preorder_dict["target_department_name"] = result.department_name
    
    # Get requested_by name
    if preorder_dict["requested_by"]:
        requested_by_query = select(employees.c.first_name, employees.c.last_name).where(
            employees.c.id == preorder_dict["requested_by"]
        )
        requested_by_result = db.execute(requested_by_query).fetchone()
        if requested_by_result:
            preorder_dict["requested_by_name"] = f"{requested_by_result.first_name} {requested_by_result.last_name}"
    
    return preorder_dict

@router.post("", response_model=schemas.PreOrderWithNames)
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
        "requested_by": preorder.requested_by or current_user.get("employee_id"),
        "assigned_to": preorder.assigned_to,
        "quantity": preorder.quantity,
        "estimated_price": preorder.estimated_price,
        "pickup_date": preorder.pickup_date,
        "special_instructions": preorder.special_instructions,
        "status": preorder.status
    }
    
    # If department is specified but no assignee, try to auto-assign to department manager
    if preorder.target_department and not preorder.assigned_to:
        # Find a manager or lead in the target department
        manager_query = select(employees.c.id).where(
            (employees.c.department_id == preorder.target_department) &
            (employees.c.status == "active") &
            (or_(
                employees.c.position.ilike("%manager%"),
                employees.c.position.ilike("%lead%")
            ))
        ).limit(1)
        
        manager_result = db.execute(manager_query).fetchone()
        if manager_result:
            new_preorder["assigned_to"] = manager_result[0]
    
    insert_stmt = insert(pre_orders).values(**new_preorder)
    result = db.execute(insert_stmt)
    db.commit()
    
    preorder_id = result.inserted_primary_key[0]
    
    # Use the get_preorder endpoint to fetch the preorder with names
    return get_preorder(preorder_id, db, current_user)

@router.put("/{preorder_id}", response_model=schemas.PreOrderWithNames)
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
    
    existing_preorder_dict = row_to_dict(existing_preorder)
    
    # Check permissions to update
    is_admin = current_user["role"] == "admin"
    is_manager = current_user["role"] == "manager" and current_user.get("department_id") == existing_preorder_dict["target_department"]
    is_assigned = current_user.get("employee_id") == existing_preorder_dict.get("assigned_to")
    
    if not (is_admin or is_manager or is_assigned):
        raise_api_error(403, "You don't have permission to update this pre-order")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in preorder.dict(exclude_unset=True).items():
        if value is not None:
            update_values[key] = value
    
    # Set completed_at timestamp if status is changing to completed
    if "status" in update_values and update_values["status"] == "completed":
        update_values["completed_at"] = datetime.now()
    
    # If changing department but not assigned_to, try to auto-assign to department manager
    if "target_department" in update_values and update_values["target_department"] and "assigned_to" not in update_values:
        # Find a manager or lead in the target department
        manager_query = select(employees.c.id).where(
            (employees.c.department_id == update_values["target_department"]) &
            (employees.c.status == "active") &
            (or_(
                employees.c.position.ilike("%manager%"),
                employees.c.position.ilike("%lead%")
            ))
        ).limit(1)
        
        manager_result = db.execute(manager_query).fetchone()
        if manager_result:
            update_values["assigned_to"] = manager_result[0]
    
    # Update preorder
    update_stmt = update(pre_orders).where(pre_orders.c.id == preorder_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Use the get_preorder endpoint to fetch the updated preorder with names
    return get_preorder(preorder_id, db, current_user)

@router.patch("/{preorder_id}/status", response_model=schemas.PreOrderWithNames)
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
    
    existing_preorder_dict = row_to_dict(existing_preorder)
    
    # Check permissions to update status
    is_admin = current_user["role"] == "admin"
    is_manager = current_user["role"] == "manager" and current_user.get("department_id") == existing_preorder_dict["target_department"]
    is_assigned = current_user.get("employee_id") == existing_preorder_dict.get("assigned_to")
    
    if not (is_admin or is_manager or is_assigned):
        raise_api_error(403, "You don't have permission to update this pre-order's status")
    
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
    
    # Use the get_preorder endpoint to fetch the updated preorder with names
    return get_preorder(preorder_id, db, current_user)

@router.patch("/{preorder_id}/assign", response_model=schemas.PreOrderWithNames)
def assign_preorder(
    preorder_id: int,
    assignment: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Assign a pre-order to an employee.
    Only managers, admins, or the requestor can assign pre-orders.
    """
    # Check if preorder exists
    query = select(pre_orders).where(pre_orders.c.id == preorder_id)
    existing_preorder = db.execute(query).fetchone()
    if existing_preorder is None:
        raise_api_error(404, "Pre-order not found")
    
    existing_preorder_dict = row_to_dict(existing_preorder)
    
    # Check authorization based on role and department
    is_admin = current_user["role"] == "admin"
    is_manager = current_user["role"] == "manager" and current_user.get("department_id") == existing_preorder_dict["target_department"]
    is_requestor = current_user.get("employee_id") == existing_preorder_dict.get("requested_by")
    
    if not (is_admin or is_manager or is_requestor):
        raise_api_error(403, "You do not have permission to assign this pre-order")
    
    # Validate assignment
    if "assigned_to" not in assignment:
        raise_api_error(400, "assigned_to field is required")
    
    # Update assignment
    update_values = {"assigned_to": assignment.get("assigned_to")}
    
    update_stmt = update(pre_orders).where(pre_orders.c.id == preorder_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Use the get_preorder endpoint to fetch the updated preorder with names
    return get_preorder(preorder_id, db, current_user)

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