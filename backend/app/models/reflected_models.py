from sqlalchemy import MetaData, Table, Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Float, Date
from sqlalchemy.sql import func
from ..database.database import engine

# Create metadata object
metadata = MetaData()

# Reflect all tables from the database
metadata.reflect(bind=engine)

# Define reminders table if it doesn't exist yet
if 'reminders' not in metadata.tables:
    reminders = Table(
        'reminders',
        metadata,
        Column('id', Integer, primary_key=True, autoincrement=True),
        Column('user_id', Integer, ForeignKey('users.id'), nullable=False),
        Column('title', String(255), nullable=False),
        Column('description', Text, nullable=True),
        Column('reminder_date', DateTime, nullable=False),
        Column('priority', String(50), default='medium'),
        Column('is_completed', Boolean, default=False),
        Column('repeat_type', String(50), default='none'),
        Column('created_at', DateTime, default=func.now()),
        Column('updated_at', DateTime, default=func.now(), onupdate=func.now()),
    )
    metadata.create_all(bind=engine, tables=[reminders])
else:
    reminders = metadata.tables['reminders']

# Access all tables from your database
departments = metadata.tables['departments']
employees = metadata.tables['employees']
users = metadata.tables['users']
tasks = metadata.tables['tasks']
customer_complaints = metadata.tables['customer_complaints']
pre_orders = metadata.tables['pre_orders']
permissions = metadata.tables['permissions']
role_permissions = metadata.tables['role_permissions']
announcements = metadata.tables['announcements']
announcement_reads = metadata.tables['announcement_reads']
inventory_requests = metadata.tables['inventory_requests']
inventory_request_updates = metadata.tables['inventory_request_updates']
equipment = metadata.tables['equipment']
equipment_maintenance = metadata.tables['equipment_maintenance']
equipment_repair_requests = metadata.tables['equipment_repair_requests']
temperature_logs = metadata.tables['temperature_logs']
temperature_violations = metadata.tables['temperature_violations']
temperature_monitoring_points = metadata.tables['temperature_monitoring_points']
training_types = metadata.tables['training_types']
employee_training_records = metadata.tables['employee_training_records']
training_requirements = metadata.tables['training_requirements']
# Make sure we reference reminders here
if 'reminders' in metadata.tables:
    reminders = metadata.tables['reminders']