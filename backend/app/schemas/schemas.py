# app/schemas/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Union, Dict, Any, Generic, TypeVar
from datetime import date, datetime

# Pagination schemas
class PaginationMeta(BaseModel):
    total: int
    limit: int
    offset: int
    has_more: bool

class SortInfo(BaseModel):
    field: str
    order: str

# User Schemas
class UserBase(BaseModel):
    username: str
    user_type: str
    employee_id: Optional[int] = None
    department_id: Optional[int] = None
    role: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str  # This will be converted to password_hash in the database

class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True

# Department Schemas
class DepartmentBase(BaseModel):
    name: str
    department_code: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[int] = None
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    pass

class Department(DepartmentBase):
    id: int
    
    class Config:
        from_attributes = True

# Employee Schemas
class EmployeeBase(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    position: Optional[str] = None
    status: str = "active"
    hire_date: Optional[date] = None

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: int
    
    class Config:
        from_attributes = True

# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    department_id: Optional[int] = None
    assigned_by: Optional[int] = None
    assigned_to: Optional[int] = None
    assigned_to_department: Optional[int] = None
    is_urgent: bool = False
    due_date: Optional[date] = None
    status: str = "pending"

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    is_urgent: Optional[bool] = None
    due_date: Optional[date] = None
    status: Optional[str] = None

class Task(TaskBase):
    id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Customer Complaint Schemas
class ComplaintBase(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    complaint_type: str
    description: str
    department_involved: Optional[int] = None
    reported_by: Optional[int] = None
    severity: str = "medium"
    status: str = "open"
    resolution: Optional[str] = None

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    complaint_type: Optional[str] = None
    description: Optional[str] = None
    department_involved: Optional[int] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    resolution: Optional[str] = None

class Complaint(ComplaintBase):
    id: int
    created_at: datetime
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Pre-Order Schemas
class PreOrderBase(BaseModel):
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: str
    order_type: str
    description: str
    target_department: Optional[int] = None
    requested_by: Optional[int] = None
    assigned_to: Optional[int] = None
    quantity: Optional[int] = None
    estimated_price: Optional[float] = None
    pickup_date: Optional[date] = None
    special_instructions: Optional[str] = None
    status: str = "pending"

class PreOrderCreate(PreOrderBase):
    pass

class PreOrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    order_type: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    quantity: Optional[int] = None
    estimated_price: Optional[float] = None
    pickup_date: Optional[date] = None
    special_instructions: Optional[str] = None
    status: Optional[str] = None

class PreOrder(PreOrderBase):
    id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Inventory Request Schemas
class InventoryRequestBase(BaseModel):
    request_title: str
    description: str
    requesting_department: Optional[int] = None
    fulfilling_department: Optional[int] = None
    requested_by: Optional[int] = None
    assigned_to: Optional[int] = None
    item_category: Optional[str] = None
    quantity_requested: Optional[str] = None
    priority: str = "normal"
    status: str = "pending"
    needed_by_date: Optional[date] = None
    notes: Optional[str] = None

class InventoryRequestCreate(InventoryRequestBase):
    pass

class InventoryRequestUpdate(BaseModel):
    request_title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    needed_by_date: Optional[date] = None
    notes: Optional[str] = None

class InventoryRequest(InventoryRequestBase):
    id: int
    requested_date: datetime
    fulfilled_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class InventoryRequestUpdateLog(BaseModel):
    id: int
    request_id: int
    updated_by: int
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    update_message: Optional[str] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Equipment Schemas
class EquipmentBase(BaseModel):
    equipment_name: str
    equipment_type: str
    equipment_id: Optional[str] = None
    department_id: Optional[int] = None
    location: Optional[str] = None
    purchase_date: Optional[date] = None
    warranty_expires: Optional[date] = None
    assigned_to: Optional[int] = None
    status: str = "operational"
    last_maintenance: Optional[date] = None
    next_maintenance_due: Optional[date] = None
    notes: Optional[str] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentUpdate(BaseModel):
    equipment_name: Optional[str] = None
    equipment_type: Optional[str] = None
    department_id: Optional[int] = None
    location: Optional[str] = None
    assigned_to: Optional[int] = None
    status: Optional[str] = None
    last_maintenance: Optional[date] = None
    next_maintenance_due: Optional[date] = None
    notes: Optional[str] = None

class Equipment(EquipmentBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Temperature Monitoring Schemas
class TempMonitoringPointBase(BaseModel):
    equipment_type: str
    department_id: Optional[int] = None
    min_temp_fahrenheit: float
    max_temp_fahrenheit: float
    check_frequency_hours: int = 4
    is_active: bool = True
    equipment_id: Optional[int] = None

class TempMonitoringPointCreate(TempMonitoringPointBase):
    pass

class TempMonitoringPoint(TempMonitoringPointBase):
    id: int
    created_at: datetime
    
    class Config:
       from_attributes = True

class TempLogBase(BaseModel):
    monitoring_point_id: int
    recorded_temp_fahrenheit: float
    recorded_by: int
    is_within_range: Optional[bool] = None
    notes: Optional[str] = None
    shift: Optional[str] = None

class TempLogCreate(TempLogBase):
    pass

class TempLog(TempLogBase):
    id: int
    recorded_at: datetime
    
    class Config:
        from_attributes = True

# Training Schemas
class TrainingTypeBase(BaseModel):
    training_name: str
    description: Optional[str] = None
    required_for_departments: List[int] = []
    required_for_positions: List[str] = []
    validity_period_months: Optional[int] = None
    is_mandatory: bool = False
    created_by: Optional[int] = None

class TrainingTypeCreate(TrainingTypeBase):
    pass

class TrainingType(TrainingTypeBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TrainingRecordBase(BaseModel):
    employee_id: int
    training_type_id: int
    completed_date: date
    expiration_date: Optional[date] = None
    instructor_name: Optional[str] = None
    certificate_number: Optional[str] = None
    training_score: Optional[int] = None
    notes: Optional[str] = None
    status: str = "completed"
    recorded_by: int

class TrainingRecordCreate(TrainingRecordBase):
    pass

class TrainingRecord(TrainingRecordBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Announcement Schemas
class AnnouncementBase(BaseModel):
    title: str
    message: str
    announcement_type: str
    target_department: Optional[int] = None
    created_by: int
    priority: str = "normal"
    is_active: bool = True
    expires_at: Optional[datetime] = None
    target_roles: Optional[List[str]] = None

class AnnouncementCreate(AnnouncementBase):
    pass

class Announcement(AnnouncementBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class AnnouncementRead(BaseModel):
    announcement_id: int
    employee_id: int
    department_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# Pagination response model for any type of item
class PaginatedResponse(BaseModel):
    items: List[Any]
    pagination: PaginationMeta
    sort: SortInfo