# app/models/models.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Float, JSON, Table, ARRAY, Enum,Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

from ..database.database import Base

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    department_code = Column(String, unique=True)
    description = Column(Text)
    manager_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    is_active = Column(Boolean, default=True)
    
    # Timestamp columns
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Define relationships later
    employees = relationship("Employee", back_populates="department")
    users = relationship("User", back_populates="department")
    
# Employee model
class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String)
    phone = Column(String)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    position = Column(String)
    status = Column(String, default="active")
    hire_date = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    user = relationship("User", back_populates="employee", uselist=False)

# User model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    user_type = Column(String, default="staff")
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    role = Column(String, default="staff")
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", back_populates="user")
    department = relationship("Department", back_populates="users")

# Task model
class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    assigned_by = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    assigned_to = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    assigned_to_department = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    is_urgent = Column(Boolean, default=False)
    due_date = Column(DateTime)
    status = Column(String, default="pending")
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = relationship("Department", back_populates="tasks", foreign_keys=[department_id])
    assigned_department = relationship("Department", back_populates="tasks_assigned", foreign_keys=[assigned_to_department])
    assigned_to_employee = relationship("Employee", back_populates="tasks_assigned", foreign_keys=[assigned_to])
    assigned_by_employee = relationship("Employee", back_populates="tasks_created", foreign_keys=[assigned_by])

# Customer Complaint model
class CustomerComplaint(Base):
    __tablename__ = "customer_complaints"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String)
    customer_email = Column(String)
    customer_phone = Column(String)
    complaint_type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    department_involved = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    reported_by = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    assigned_to = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    severity = Column(String, default="medium")
    status = Column(String, default="open")
    resolution = Column(Text)
    is_private = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = relationship("Department")
    reporter = relationship("Employee", foreign_keys=[reported_by])
    assignee = relationship("Employee", foreign_keys=[assigned_to])

# Pre-Order model
class PreOrder(Base):
    __tablename__ = "pre_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    customer_email = Column(String)
    customer_phone = Column(String)
    order_type = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    target_department = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    requested_by = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    assigned_to = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    quantity = Column(Integer)
    estimated_price = Column(Float)
    pickup_date = Column(DateTime)
    special_instructions = Column(Text)
    status = Column(String, default="pending")
    completed_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = relationship("Department")
    requester = relationship("Employee", foreign_keys=[requested_by])
    assignee = relationship("Employee", foreign_keys=[assigned_to])

# Announcement model
class Announcement(Base):
    __tablename__ = "announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    announcement_type = Column(String)
    target_department = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    created_by = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    priority = Column(String, default="normal")
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime)
    target_roles = Column(JSON)  # Array of role names
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = relationship("Department")
    creator = relationship("Employee")
    reads = relationship("AnnouncementRead", back_populates="announcement")

# Announcement Read model
class AnnouncementRead(Base):
    __tablename__ = "announcement_reads"
    
    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"))
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    announcement = relationship("Announcement", back_populates="reads")
    employee = relationship("Employee")
    department = relationship("Department")

# Inventory Request model
class InventoryRequest(Base):
    __tablename__ = "inventory_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    request_title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    requesting_department = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    fulfilling_department = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    requested_by = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    assigned_to = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    item_category = Column(String)
    quantity_requested = Column(String)
    priority = Column(String, default="normal")
    status = Column(String, default="pending")
    needed_by_date = Column(DateTime)
    notes = Column(Text)
    fulfilled_date = Column(DateTime)
    
    # Timestamps
    requested_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    requesting_dept = relationship("Department", foreign_keys=[requesting_department])
    fulfilling_dept = relationship("Department", foreign_keys=[fulfilling_department])
    requester = relationship("Employee", foreign_keys=[requested_by])
    assignee = relationship("Employee", foreign_keys=[assigned_to])
    updates = relationship("InventoryRequestUpdate", back_populates="request")

# Inventory Request Update model
class InventoryRequestUpdate(Base):
    __tablename__ = "inventory_request_updates"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("inventory_requests.id", ondelete="CASCADE"))
    updated_by = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    old_status = Column(String)
    new_status = Column(String)
    update_message = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    request = relationship("InventoryRequest", back_populates="updates")
    updater = relationship("Employee")

# Equipment model
class Equipment(Base):
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_name = Column(String, nullable=False)
    equipment_type = Column(String, nullable=False)
    equipment_id = Column(String, unique=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"))
    location = Column(String)
    purchase_date = Column(Date)
    warranty_expires = Column(Date)
    assigned_to = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    status = Column(String, default="operational")
    last_maintenance = Column(Date)
    next_maintenance_due = Column(Date)
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = relationship("Department")
    assignee = relationship("Employee")
    maintenance_records = relationship("EquipmentMaintenance", back_populates="equipment")
    repair_requests = relationship("EquipmentRepairRequest", back_populates="equipment")
    temperature_points = relationship("TemperatureMonitoringPoint", back_populates="equipment")

# Add more models for other tables as needed...