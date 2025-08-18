# app/schemas/schemas.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import validator
from typing import Union

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
    email: Optional[str] = None
    role: str = "staff"
    employee_id: Optional[int] = None
    department_id: Optional[int] = None
    user_type: Optional[str] = "employee"
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    employee_id: Optional[int] = None
    department_id: Optional[int] = None
    user_type: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Department Schemas
class DepartmentBase(BaseModel):
    name: str
    department_code: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[int] = None
    is_active: bool = True

    @validator('manager_id', pre=True)
    def validate_manager_id(cls, v):
        if v == "" or v == 0:
            return None
        return v
    
class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    department_code: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None

    @validator('manager_id', pre=True)
    def validate_manager_id(cls, v):
        if v == "" or v == 0:
            return None
        return v

class Department(DepartmentBase):
    id: int
    created_at: datetime  # Now required
    updated_at: datetime  # Now required

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

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
    hire_date: Optional[Union[datetime, date, str]] = None
    
    # Add validators
    @validator('email', pre=True)
    def validate_email(cls, v):
        if v == "":
            return None
        return v
        
    @validator('department_id', pre=True)
    def validate_department_id(cls, v):
        if v == "" or v == 0:
            return None
        return v
        
    @validator('hire_date', pre=True)
    def validate_hire_date(cls, v):
        if not v:
            return None
        if isinstance(v, (datetime, date)):
            return v
        try:
            return datetime.strptime(v, "%Y-%m-%d")
        except (ValueError, TypeError):
            try:
                return datetime.fromisoformat(v)
            except (ValueError, TypeError):
                raise ValueError("Invalid date format. Expected YYYY-MM-DD")
        return v


class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    position: Optional[str] = None
    status: Optional[str] = None
    hire_date: Optional[Union[datetime, date, str]] = None
    
    # Add validators (same as in EmployeeBase)
    @validator('email', pre=True)
    def validate_email(cls, v):
        if v == "":
            return None
        return v
        
    @validator('department_id', pre=True)
    def validate_department_id(cls, v):
        if v == "" or v == 0:
            return None
        return v
        
    @validator('hire_date', pre=True)
    def validate_hire_date(cls, v):
        if not v:
            return None
        if isinstance(v, (datetime, date)):
            return v
        try:
            return datetime.strptime(v, "%Y-%m-%d")
        except (ValueError, TypeError):
            try:
                return datetime.fromisoformat(v)
            except (ValueError, TypeError):
                raise ValueError("Invalid date format. Expected YYYY-MM-DD")
        return v

class Employee(EmployeeBase):
    id: int
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True
        # This ensures the validation doesn't fail when encountering None values
        validate_assignment = True
        
class EmployeeWithDepartment(Employee):
    department_name: Optional[str] = None

# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    department_id: Optional[int] = None
    assigned_by: Optional[int] = None
    assigned_to: Optional[int] = None
    assigned_to_department: Optional[int] = None
    is_urgent: bool = False
    due_date: Optional[datetime] = None
    status: str = "pending"

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[int] = None
    assigned_by: Optional[int] = None
    assigned_to: Optional[int] = None
    assigned_to_department: Optional[int] = None
    is_urgent: Optional[bool] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None

class Task(TaskBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    completed_at: Optional[datetime] = None
    is_completed: bool = False

    class Config:
        from_attributes = True

class TaskWithNames(Task):
    department_name: Optional[str] = None
    assigned_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_department_name: Optional[str] = None

# Complaint Schemas
class ComplaintBase(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    complaint_type: str
    description: str
    department_involved: Optional[int] = None
    severity: str = "medium"
    status: str = "open"
    resolution: Optional[str] = None
    is_private: bool = False

class ComplaintCreate(ComplaintBase):
    reported_by: Optional[int] = None
    assigned_to: Optional[int] = None

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
    assigned_to: Optional[int] = None
    is_private: Optional[bool] = None

class Complaint(ComplaintBase):
    id: int
    reported_by: Optional[int] = None
    assigned_to: Optional[int] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ComplaintWithNames(Complaint):
    department_involved_name: Optional[str] = None
    reported_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None

# PreOrder Schemas
class PreOrderBase(BaseModel):
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    order_type: str
    description: str
    target_department: Optional[int] = None
    quantity: Optional[int] = None
    estimated_price: Optional[float] = None
    pickup_date: Optional[datetime] = None
    special_instructions: Optional[str] = None
    status: str = "pending"

class PreOrderCreate(PreOrderBase):
    requested_by: Optional[int] = None
    assigned_to: Optional[int] = None

class PreOrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    order_type: Optional[str] = None
    description: Optional[str] = None
    target_department: Optional[int] = None
    requested_by: Optional[int] = None
    assigned_to: Optional[int] = None
    quantity: Optional[int] = None
    estimated_price: Optional[float] = None
    pickup_date: Optional[datetime] = None
    special_instructions: Optional[str] = None
    status: Optional[str] = None

class PreOrder(PreOrderBase):
    id: int
    requested_by: Optional[int] = None
    assigned_to: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PreOrderWithNames(PreOrder):
    target_department_name: Optional[str] = None
    requested_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None

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
    needed_by_date: Optional[datetime] = None
    notes: Optional[str] = None

class InventoryRequestCreate(InventoryRequestBase):
    pass

class InventoryRequestUpdate(BaseModel):
    request_title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    needed_by_date: Optional[datetime] = None
    notes: Optional[str] = None

class InventoryRequest(InventoryRequestBase):
    id: int
    requested_date: datetime
    fulfilled_date: Optional[datetime] = None

    class Config:
        from_attributes = True

class InventoryRequestWithNames(InventoryRequest):
    requesting_department_name: Optional[str] = None
    fulfilling_department_name: Optional[str] = None
    requested_by_name: Optional[str] = None


class InventoryRequestUpdateLog(BaseModel):
    id: int
    request_id: int
    updated_by: int  
    old_status: Optional[str] = None  
    new_status: str
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

class EquipmentWithNames(Equipment):
    department_name: Optional[str] = None
    assigned_to_name: Optional[str] = None

# Temp Monitoring Schemas
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

class TempMonitoringPointWithNames(TempMonitoringPoint):
    department_name: Optional[str] = None
    equipment_name: Optional[str] = None

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

class TempLogWithNames(TempLog):
    monitoring_point_name: Optional[str] = None
    recorded_by_name: Optional[str] = None
    department_name: Optional[str] = None

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

class TrainingRecordWithNames(TrainingRecord):
    employee_name: Optional[str] = None
    training_type_name: Optional[str] = None
    recorded_by_name: Optional[str] = None

# Announcement Schemas
class AnnouncementBase(BaseModel):
    title: str
    message: str  # Changed from content
    announcement_type: Optional[str] = "general"
    target_department: Optional[int] = None  # Changed from department
    created_by: int  # Changed from published_by
    priority: str = "normal"
    is_active: bool = True
    expires_at: Optional[datetime] = None  # Changed from end_date
    target_roles: Optional[List[str]] = None  # Changed from List[int]

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None  # Changed from content
    expires_at: Optional[datetime] = None  # Changed from end_date
    is_active: Optional[bool] = None
    priority: Optional[str] = None
    target_department: Optional[int] = None  # Changed from departments
    announcement_type: Optional[str] = None
    target_roles: Optional[List[str]] = None

class Announcement(AnnouncementBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class AnnouncementWithAuthor(Announcement):
    created_by_name: Optional[str] = None  # Changed from published_by_name
    department_name: Optional[str] = None  # Changed from department_names
    is_read: Optional[bool] = False

# Permission Schemas
class PermissionBase(BaseModel):
    permission_name: str
    description: Optional[str] = None
    category: str = "general"

class PermissionCreate(PermissionBase):
    pass

class PermissionUpdate(BaseModel):
    permission_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None

class Permission(PermissionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Role Permission Schemas
class RolePermissionBase(BaseModel):
    role: str
    permission_id: int
    can_view: bool = True
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False

class RolePermissionCreate(RolePermissionBase):
    pass

class RolePermissionUpdate(BaseModel):
    can_view: Optional[bool] = None
    can_create: Optional[bool] = None
    can_edit: Optional[bool] = None
    can_delete: Optional[bool] = None

class RolePermission(RolePermissionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Pagination response model for any type of item
class PaginatedResponse(BaseModel):
    items: List[Any]
    pagination: PaginationMeta
    sort: SortInfo


# Reminder Schemas
class ReminderBase(BaseModel):
    title: str
    description: Optional[str] = None
    reminder_date: datetime
    priority: str = "medium"  # low, medium, high
    is_completed: bool = False
    repeat_type: Optional[str] = "none"  # none, daily, weekly, monthly

class ReminderCreate(ReminderBase):
    pass

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reminder_date: Optional[datetime] = None
    priority: Optional[str] = None
    is_completed: Optional[bool] = None
    repeat_type: Optional[str] = None

class Reminder(ReminderBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True