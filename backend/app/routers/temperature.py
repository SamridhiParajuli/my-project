# app/routers/temperature.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete, func, or_
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from ..database.database import get_db
from ..models.reflected_models import temperature_monitoring_points, temperature_logs, temperature_violations
from ..schemas import schemas
from ..utils.auth_utils import get_current_active_user
from ..utils.roles import admin_only, manager_or_admin
from ..utils.error_handling import raise_api_error
from ..utils.db_helpers import row_to_dict, rows_to_list

router = APIRouter(
    prefix="/temperature",
    tags=["temperature monitoring"],
)

# Temperature Monitoring Points endpoints
@router.get("/monitoring-points", response_model=Dict)
def get_monitoring_points(
    skip: int = 0, 
    limit: int = 20, 
    department_id: Optional[int] = None,
    equipment_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    sort: str = "id",
    order: str = "asc",
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(temperature_monitoring_points)
    count_query = select(func.count()).select_from(temperature_monitoring_points)
    
    # Apply filters if provided
    if department_id:
        query = query.where(temperature_monitoring_points.c.department_id == department_id)
        count_query = count_query.where(temperature_monitoring_points.c.department_id == department_id)
    if equipment_id:
        query = query.where(temperature_monitoring_points.c.equipment_id == equipment_id)
        count_query = count_query.where(temperature_monitoring_points.c.equipment_id == equipment_id)
    if is_active is not None:
        query = query.where(temperature_monitoring_points.c.is_active == is_active)
        count_query = count_query.where(temperature_monitoring_points.c.is_active == is_active)
    
    # Add search if provided
    if search:
        search_pattern = f"%{search}%"
        search_filter = or_(
            temperature_monitoring_points.c.equipment_type.ilike(search_pattern)
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    
    # Add sorting
    if hasattr(temperature_monitoring_points.c, sort):
        sort_column = getattr(temperature_monitoring_points.c, sort)
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
    points_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": points_list,
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

@router.get("/monitoring-points/{point_id}", response_model=schemas.TempMonitoringPoint)
def get_monitoring_point(
    point_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(temperature_monitoring_points).where(temperature_monitoring_points.c.id == point_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise_api_error(404, "Temperature monitoring point not found")
    return row_to_dict(result)

@router.post("/monitoring-points", response_model=schemas.TempMonitoringPoint)
def create_monitoring_point(
    point_data: schemas.TempMonitoringPointCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can create monitoring points
):
    new_point = {
        "equipment_type": point_data.equipment_type,
        "department_id": point_data.department_id,
        "min_temp_fahrenheit": point_data.min_temp_fahrenheit,
        "max_temp_fahrenheit": point_data.max_temp_fahrenheit,
        "check_frequency_hours": point_data.check_frequency_hours,
        "is_active": point_data.is_active,
        "equipment_id": point_data.equipment_id
    }
    
    insert_stmt = insert(temperature_monitoring_points).values(**new_point)
    result = db.execute(insert_stmt)
    db.commit()
    
    point_id = result.inserted_primary_key[0]
    query = select(temperature_monitoring_points).where(temperature_monitoring_points.c.id == point_id)
    result = db.execute(query).fetchone()
    created_point = row_to_dict(result)
    return created_point

@router.put("/monitoring-points/{point_id}", response_model=schemas.TempMonitoringPoint)
def update_monitoring_point(
    point_id: int, 
    point_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(manager_or_admin)  # Only managers or admins can update monitoring points
):
    # Check if monitoring point exists
    query = select(temperature_monitoring_points).where(temperature_monitoring_points.c.id == point_id)
    existing_point = db.execute(query).fetchone()
    if existing_point is None:
        raise_api_error(404, "Temperature monitoring point not found")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in point_data.items():
        if value is not None:
            update_values[key] = value
    
    # Update monitoring point
    update_stmt = update(temperature_monitoring_points).where(temperature_monitoring_points.c.id == point_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated monitoring point
    query = select(temperature_monitoring_points).where(temperature_monitoring_points.c.id == point_id)
    result = db.execute(query).fetchone()
    updated_point = row_to_dict(result)
    return updated_point

@router.delete("/monitoring-points/{point_id}", response_model=dict)
def delete_monitoring_point(
    point_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(admin_only)  # Only admins can delete monitoring points
):
    # Check if monitoring point exists
    query = select(temperature_monitoring_points).where(temperature_monitoring_points.c.id == point_id)
    existing_point = db.execute(query).fetchone()
    if existing_point is None:
        raise_api_error(404, "Temperature monitoring point not found")
    
    # Delete monitoring point
    delete_stmt = delete(temperature_monitoring_points).where(temperature_monitoring_points.c.id == point_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Temperature monitoring point deleted successfully"}

# Temperature Logs endpoints
@router.get("/logs", response_model=Dict)
def get_temperature_logs(
    skip: int = 0, 
    limit: int = 20, 
    monitoring_point_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    is_within_range: Optional[bool] = None,
    sort: str = "recorded_at",
    order: str = "desc",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(temperature_logs)
    count_query = select(func.count()).select_from(temperature_logs)
    
    # Apply filters if provided
    if monitoring_point_id:
        query = query.where(temperature_logs.c.monitoring_point_id == monitoring_point_id)
        count_query = count_query.where(temperature_logs.c.monitoring_point_id == monitoring_point_id)
    if start_date:
        query = query.where(temperature_logs.c.recorded_at >= start_date)
        count_query = count_query.where(temperature_logs.c.recorded_at >= start_date)
    if end_date:
        query = query.where(temperature_logs.c.recorded_at <= end_date)
        count_query = count_query.where(temperature_logs.c.recorded_at <= end_date)
    if is_within_range is not None:
        query = query.where(temperature_logs.c.is_within_range == is_within_range)
        count_query = count_query.where(temperature_logs.c.is_within_range == is_within_range)
    
    # Add sorting
    if hasattr(temperature_logs.c, sort):
        sort_column = getattr(temperature_logs.c, sort)
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
    logs_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": logs_list,
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

@router.post("/logs", response_model=schemas.TempLog)
def create_temperature_log(
    log_data: schemas.TempLogCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if monitoring point exists
    query = select(temperature_monitoring_points).where(temperature_monitoring_points.c.id == log_data.monitoring_point_id)
    monitoring_point = db.execute(query).fetchone()
    if monitoring_point is None:
        raise_api_error(404, "Temperature monitoring point not found")
    
    monitoring_point = row_to_dict(monitoring_point)
    
    # Determine if temperature is within range
    is_within_range = (
        monitoring_point["min_temp_fahrenheit"] <= log_data.recorded_temp_fahrenheit <= monitoring_point["max_temp_fahrenheit"]
    )
    
    # Create temperature log
    new_log = {
        "monitoring_point_id": log_data.monitoring_point_id,
        "recorded_temp_fahrenheit": log_data.recorded_temp_fahrenheit,
        "recorded_by": log_data.recorded_by or current_user["id"],
        "is_within_range": is_within_range,
        "notes": log_data.notes,
        "shift": log_data.shift
    }
    
    insert_stmt = insert(temperature_logs).values(**new_log)
    result = db.execute(insert_stmt)
    db.commit()
    
    log_id = result.inserted_primary_key[0]
    
    # If temperature is out of range, create a violation record
    if not is_within_range:
        violation_type = "too_cold" if log_data.recorded_temp_fahrenheit < monitoring_point["min_temp_fahrenheit"] else "too_hot"
        
        new_violation = {
            "log_id": log_id,
            "monitoring_point_id": log_data.monitoring_point_id,
            "violation_type": violation_type,
            "severity": "high" if abs(log_data.recorded_temp_fahrenheit - (monitoring_point["min_temp_fahrenheit"] + monitoring_point["max_temp_fahrenheit"]) / 2) > 10 else "medium",
            "status": "open"
        }
        
        insert_stmt = insert(temperature_violations).values(**new_violation)
        db.execute(insert_stmt)
        db.commit()
    
    # Fetch created temperature log
    query = select(temperature_logs).where(temperature_logs.c.id == log_id)
    result = db.execute(query).fetchone()
    created_log = row_to_dict(result)
    return created_log

# Temperature Violations endpoints
@router.get("/violations", response_model=Dict)
def get_temperature_violations(
    skip: int = 0, 
    limit: int = 20, 
    monitoring_point_id: Optional[int] = None,
    status: Optional[str] = None,
    violation_type: Optional[str] = None,
    severity: Optional[str] = None,
    sort: str = "created_at",
    order: str = "desc",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Base query
    query = select(temperature_violations)
    count_query = select(func.count()).select_from(temperature_violations)
    
    # Apply filters if provided
    if monitoring_point_id:
        query = query.where(temperature_violations.c.monitoring_point_id == monitoring_point_id)
        count_query = count_query.where(temperature_violations.c.monitoring_point_id == monitoring_point_id)
    if status:
        query = query.where(temperature_violations.c.status == status)
        count_query = count_query.where(temperature_violations.c.status == status)
    if violation_type:
        query = query.where(temperature_violations.c.violation_type == violation_type)
        count_query = count_query.where(temperature_violations.c.violation_type == violation_type)
    if severity:
        query = query.where(temperature_violations.c.severity == severity)
        count_query = count_query.where(temperature_violations.c.severity == severity)
    
    # Add sorting
    if hasattr(temperature_violations.c, sort):
        sort_column = getattr(temperature_violations.c, sort)
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
    violations_list = rows_to_list(result)
    
    # Return with pagination metadata
    return {
        "items": violations_list,
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

@router.put("/violations/{violation_id}", response_model=dict)
def update_temperature_violation(
    violation_id: int, 
    violation_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if violation exists
    query = select(temperature_violations).where(temperature_violations.c.id == violation_id)
    existing_violation = db.execute(query).fetchone()
    if existing_violation is None:
        raise_api_error(404, "Temperature violation not found")
    
    existing_violation = row_to_dict(existing_violation)
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in violation_data.items():
        if value is not None:
            update_values[key] = value
    
    # Handle status change to resolved
    if "status" in update_values and update_values["status"] == "resolved" and existing_violation["status"] != "resolved":
        update_values["resolved_at"] = datetime.now()
        update_values["resolved_by"] = current_user["id"]
    
    # Update violation
    update_stmt = update(temperature_violations).where(temperature_violations.c.id == violation_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated violation
    query = select(temperature_violations).where(temperature_violations.c.id == violation_id)
    result = db.execute(query).fetchone()
    updated_violation = row_to_dict(result)
    return updated_violation

@router.patch("/violations/{violation_id}/resolve", response_model=dict)
def resolve_temperature_violation(
    violation_id: int,
    resolution_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if violation exists
    query = select(temperature_violations).where(temperature_violations.c.id == violation_id)
    existing_violation = db.execute(query).fetchone()
    if existing_violation is None:
        raise_api_error(404, "Temperature violation not found")
    
    existing_violation = row_to_dict(existing_violation)
    
    # Check if violation is already resolved
    if existing_violation["status"] == "resolved":
        raise_api_error(400, "Violation is already resolved")
    
    # Update values
    update_values = {
        "status": "resolved",
        "resolved_at": datetime.now(),
        "resolved_by": current_user["id"],
        "corrective_action": resolution_data.get("corrective_action", "Violation resolved")
    }
    
    # Update violation
    update_stmt = update(temperature_violations).where(temperature_violations.c.id == violation_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated violation
    query = select(temperature_violations).where(temperature_violations.c.id == violation_id)
    result = db.execute(query).fetchone()
    updated_violation = row_to_dict(result)
    return updated_violation

@router.get("/due-checks", response_model=List[dict])
def get_due_temperature_checks(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Get all active monitoring points
    points_query = select(temperature_monitoring_points).where(temperature_monitoring_points.c.is_active == True)
    monitoring_points = db.execute(points_query).fetchall()
    monitoring_points = rows_to_list(monitoring_points)
    
    due_checks = []
    
    for point in monitoring_points:
        # Get the most recent log for this monitoring point
        logs_query = select(temperature_logs).where(
            temperature_logs.c.monitoring_point_id == point["id"]
        ).order_by(temperature_logs.c.recorded_at.desc()).limit(1)
        
        latest_log = db.execute(logs_query).fetchone()
        
        # Calculate when next check is due
        if latest_log:
            latest_log = row_to_dict(latest_log)
            last_check_time = latest_log["recorded_at"]
            check_frequency = point["check_frequency_hours"]
            next_check_due = last_check_time + timedelta(hours=check_frequency)
            
            # If next check is due (or overdue)
            if next_check_due <= datetime.now():
                due_checks.append({
                    "monitoring_point_id": point["id"],
                    "equipment_type": point["equipment_type"],
                    "department_id": point["department_id"],
                    "equipment_id": point["equipment_id"],
                    "last_checked": last_check_time,
                    "check_frequency_hours": check_frequency,
                    "next_check_due": next_check_due,
                    "is_overdue": True
                })
        else:
            # If no logs exist yet, this check is due immediately
            due_checks.append({
                "monitoring_point_id": point["id"],
                "equipment_type": point["equipment_type"],
                "department_id": point["department_id"],
                "equipment_id": point["equipment_id"],
                "last_checked": None,
                "check_frequency_hours": point["check_frequency_hours"],
                "next_check_due": datetime.now(),
                "is_overdue": True
            })
    
    return due_checks