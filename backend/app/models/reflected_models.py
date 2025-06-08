from sqlalchemy import MetaData
from ..database.database import engine

# Create metadata object
metadata = MetaData()

# Reflect all tables from the database
metadata.reflect(bind=engine)

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