# app/routers/temperature.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, insert, update, delete
from typing import List, Optional
from datetime import datetime, timedelta
from ..database.database import get_db
from ..models.reflected_models import temperature_monitoring_points, temperature_logs, temperature_violations
from ..schemas import schemas
from ..routers.auth import get_current_active_user

router = APIRouter(
    prefix="/temperature",
    tags=["temperature monitoring"],
)

# Temperature Monitoring Points endpoints
@router.get("/monitoring-points", response_model=List[schemas.TempMonitoringPoint])
def get_monitoring_points(
    skip: int = 0, 
    limit: int = 100, 
    department_id: Optional[int] = None,
    equipment_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(temperature_monitoring_points)
    
    # Apply filters if provided
    if department_id:
        query = query.where(temperature_monitoring_points.c.department_id == department_id)
    if equipment_id:
        query = query.where(temperature_monitoring_points.c.equipment_id == equipment_id)
    if is_active is not None:
        query = query.where(temperature_monitoring_points.c.is_active == is_active)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    points_list = [dict(row._mapping) for row in result]
    return points_list

@router.get("/monitoring-points/{point_id}", response_model=schemas.TempMonitoringPoint)
def get_monitoring_point(
    point_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(temperature_monitoring_points).where(temperature_monitoring_points.c.id == point_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="Temperature monitoring point not found")
    return dict(result._mapping)

@router.post("/monitoring-points", response_model=schemas.TempMonitoringPoint)
def create_monitoring_point(
    point_data: schemas.TempMonitoringPointCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
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
    created_point = dict(result._mapping)
    return created_point

@router.put("/monitoring-points/{point_id}", response_model=schemas.TempMonitoringPoint)
def update_monitoring_point(
    point_id: int, 
    point_data: dict, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if monitoring point exists
    query = select(temperature_monitoring_points).where(temperature_monitoring_points.c.id == point_id)
    existing_point = db.execute(query).fetchone()
    if existing_point is None:
        raise HTTPException(status_code=404, detail="Temperature monitoring point not found")
    
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
    updated_point = dict(result._mapping)
    return updated_point

@router.delete("/monitoring-points/{point_id}", response_model=dict)
def delete_monitoring_point(
    point_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Check if monitoring point exists
    query = select(temperature_monitoring_points).where(temperature_monitoring_points.c.id == point_id)
    existing_point = db.execute(query).fetchone()
    if existing_point is None:
        raise HTTPException(status_code=404, detail="Temperature monitoring point not found")
    
    # Delete monitoring point
    delete_stmt = delete(temperature_monitoring_points).where(temperature_monitoring_points.c.id == point_id)
    db.execute(delete_stmt)
    db.commit()
    
    return {"message": "Temperature monitoring point deleted successfully"}

# Temperature Logs endpoints
@router.get("/logs", response_model=List[schemas.TempLog])
def get_temperature_logs(
    skip: int = 0, 
    limit: int = 100, 
    monitoring_point_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    is_within_range: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(temperature_logs)
    
    # Apply filters if provided
    if monitoring_point_id:
        query = query.where(temperature_logs.c.monitoring_point_id == monitoring_point_id)
    if start_date:
        query = query.where(temperature_logs.c.recorded_at >= start_date)
    if end_date:
        query = query.where(temperature_logs.c.recorded_at <= end_date)
    if is_within_range is not None:
        query = query.where(temperature_logs.c.is_within_range == is_within_range)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    logs_list = [dict(row._mapping) for row in result]
    return logs_list

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
        raise HTTPException(status_code=404, detail="Temperature monitoring point not found")
    
    monitoring_point = dict(monitoring_point._mapping)
    
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
    created_log = dict(result._mapping)
    return created_log

# Temperature Violations endpoints
@router.get("/violations", response_model=List[dict])
def get_temperature_violations(
    skip: int = 0, 
    limit: int = 100, 
    monitoring_point_id: Optional[int] = None,
    status: Optional[str] = None,
    violation_type: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    query = select(temperature_violations)
    
    # Apply filters if provided
    if monitoring_point_id:
        query = query.where(temperature_violations.c.monitoring_point_id == monitoring_point_id)
    if status:
        query = query.where(temperature_violations.c.status == status)
    if violation_type:
        query = query.where(temperature_violations.c.violation_type == violation_type)
    if severity:
        query = query.where(temperature_violations.c.severity == severity)
    
    query = query.offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    violations_list = [dict(row._mapping) for row in result]
    return violations_list

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
        raise HTTPException(status_code=404, detail="Temperature violation not found")
    
    # Prepare update values (only include fields that were provided)
    update_values = {}
    for key, value in violation_data.items():
        if value is not None:
            update_values[key] = value
    
    # Handle status change to resolved
    if "status" in update_values and update_values["status"] == "resolved" and dict(existing_violation._mapping)["status"] != "resolved":
        update_values["resolved_at"] = datetime.now()
        update_values["resolved_by"] = current_user["id"]
    
    # Update violation
    update_stmt = update(temperature_violations).where(temperature_violations.c.id == violation_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated violation
    query = select(temperature_violations).where(temperature_violations.c.id == violation_id)
    result = db.execute(query).fetchone()
    updated_violation = dict(result._mapping)
    return updated_violation

@router.get("/due-checks", response_model=List[dict])
def get_due_temperature_checks(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    # Get all active monitoring points
    points_query = select(temperature_monitoring_points).where(temperature_monitoring_points.c.is_active == True)
    monitoring_points = db.execute(points_query).fetchall()
    
    due_checks = []
    
    for point in monitoring_points:
        point_dict = dict(point._mapping)
        
        # Get the most recent log for this monitoring point
        logs_query = select(temperature_logs).where(
            temperature_logs.c.monitoring_point_id == point_dict["id"]
        ).order_by(temperature_logs.c.recorded_at.desc()).limit(1)
        
        latest_log = db.execute(logs_query).fetchone()
        
        # Calculate when next check is due
        if latest_log:
            latest_log = dict(latest_log._mapping)
            last_check_time = latest_log["recorded_at"]
            check_frequency = point_dict["check_frequency_hours"]
            next_check_due = last_check_time + timedelta(hours=check_frequency)
            
            # If next check is due (or overdue)
            if next_check_due <= datetime.now():
                due_checks.append({
                    "monitoring_point_id": point_dict["id"],
                    "equipment_type": point_dict["equipment_type"],
                    "department_id": point_dict["department_id"],
                    "equipment_id": point_dict["equipment_id"],
                    "last_checked": last_check_time,
                    "check_frequency_hours": check_frequency,
                    "next_check_due": next_check_due,
                    "is_overdue": True
                })
        else:
            # If no logs exist yet, this check is due immediately
            due_checks.append({
                "monitoring_point_id": point_dict["id"],
                "equipment_type": point_dict["equipment_type"],
                "department_id": point_dict["department_id"],
                "equipment_id": point_dict["equipment_id"],
                "last_checked": None,
                "check_frequency_hours": point_dict["check_frequency_hours"],
                "next_check_due": datetime.now(),
                "is_overdue": True
            })
    
    return due_checks