# app/scripts/seed_data.py
from sqlalchemy import insert, text, select
from datetime import datetime, date, timedelta
import random
import string

from ..database.database import SessionLocal
from ..models.reflected_models import (
    departments, employees, users, 
    tasks, customer_complaints, pre_orders
)
from ..utils.security import get_password_hash

def generate_unique_id(length=4):
    """Generate a random ID of specified length"""
    return ''.join(random.choices(string.digits, k=length))

def seed_database():
    """Populate database with initial test data"""
    print("Starting database seeding...")
    
    with SessionLocal() as db:
        # Create departments
        departments_data = [
            {"name": "Bakery", "department_code": "BAK", "description": "Bakery department", "is_active": True},
            {"name": "Produce", "department_code": "PRD", "description": "Fresh produce department", "is_active": True},
            {"name": "Meat", "department_code": "MET", "description": "Meat department", "is_active": True},
            {"name": "Dairy", "department_code": "DAI", "description": "Dairy department", "is_active": True},
            {"name": "Management", "department_code": "MGT", "description": "Management department", "is_active": True}
        ]
        
        department_ids = []
        for dept in departments_data:
            # Check if department already exists using SQLAlchemy Core
            existing = db.execute(
                select(departments.c.id).where(departments.c.name == dept["name"])
            ).fetchone()
            
            if not existing:
                result = db.execute(insert(departments).values(**dept))
                db.commit()
                department_ids.append(result.inserted_primary_key[0])
            else:
                department_ids.append(existing[0])
        
        print(f"Created {len(department_ids)} departments")
        
        # Create employees
        employees_data = [
            {"employee_id": "1001", "first_name": "John", "last_name": "Admin", "email": "admin@example.com", 
             "phone": "555-1234", "department_id": department_ids[4], "position": "Admin", "status": "active", "hire_date": date.today() - timedelta(days=365)},
            {"employee_id": "1002", "first_name": "Jane", "last_name": "Manager", "email": "manager@example.com", 
             "phone": "555-5678", "department_id": department_ids[4], "position": "Manager", "status": "active", "hire_date": date.today() - timedelta(days=300)},
            {"employee_id": "1003", "first_name": "Bob", "last_name": "Baker", "email": "baker@example.com", 
             "phone": "555-9012", "department_id": department_ids[0], "position": "Staff", "status": "active", "hire_date": date.today() - timedelta(days=200)},
            {"employee_id": "1004", "first_name": "Alice", "last_name": "Produce", "email": "produce@example.com", 
             "phone": "555-3456", "department_id": department_ids[1], "position": "Staff", "status": "active", "hire_date": date.today() - timedelta(days=150)},
            {"employee_id": "1005", "first_name": "Charlie", "last_name": "Butcher", "email": "butcher@example.com", 
             "phone": "555-7890", "department_id": department_ids[2], "position": "Staff", "status": "active", "hire_date": date.today() - timedelta(days=100)}
        ]
        
        employee_ids = []
        for emp in employees_data:
            # Check if employee already exists using SQLAlchemy Core
            existing = db.execute(
                select(employees.c.id).where(employees.c.employee_id == emp["employee_id"])
            ).fetchone()
            
            if not existing:
                result = db.execute(insert(employees).values(**emp))
                db.commit()
                employee_ids.append(result.inserted_primary_key[0])
            else:
                employee_ids.append(existing[0])
        
        print(f"Created {len(employee_ids)} employees")
        
        # Create users
        users_data = [
            {"username": "admin", "password_hash": get_password_hash("admin123"), "user_type": "staff", 
             "employee_id": employee_ids[0], "department_id": department_ids[4], "role": "admin", "is_active": True},
            {"username": "manager", "password_hash": get_password_hash("manager123"), "user_type": "staff", 
             "employee_id": employee_ids[1], "department_id": department_ids[4], "role": "manager", "is_active": True},
            {"username": "baker", "password_hash": get_password_hash("baker123"), "user_type": "staff", 
             "employee_id": employee_ids[2], "department_id": department_ids[0], "role": "staff", "is_active": True},
            {"username": "produce", "password_hash": get_password_hash("produce123"), "user_type": "staff", 
             "employee_id": employee_ids[3], "department_id": department_ids[1], "role": "staff", "is_active": True},
            {"username": "butcher", "password_hash": get_password_hash("butcher123"), "user_type": "staff", 
             "employee_id": employee_ids[4], "department_id": department_ids[2], "role": "staff", "is_active": True}
        ]
        
        for user_data in users_data:
            # Check if user already exists using SQLAlchemy Core
            existing = db.execute(
                select(users.c.id).where(users.c.username == user_data["username"])
            ).fetchone()
            
            if not existing:
                db.execute(insert(users).values(**user_data))
                db.commit()
        
        print("Created users")
        
        # Create tasks
        task_statuses = ["pending", "in_progress", "completed"]
        task_titles = [
            "Clean display cases", "Restock shelves", "Inventory check", "Customer order preparation",
            "Equipment cleaning", "Weekly report", "Monthly inspection", "Training new staff",
            "Quality check", "Maintenance request"
        ]
        
        for i in range(20):
            due_date = date.today() + timedelta(days=random.randint(-5, 14))
            status = random.choice(task_statuses)
            department_id = random.choice(department_ids)
            assigned_to = random.choice(employee_ids)
            
            task_data = {
                "title": random.choice(task_titles),
                "description": f"Task description {i+1}",
                "department_id": department_id,
                "assigned_by": employee_ids[0],  # Admin assigns all tasks
                "assigned_to": assigned_to,
                "assigned_to_department": department_id,
                "is_urgent": random.choice([True, False]),
                "due_date": due_date,
                "status": status,
                "is_completed": status == "completed",
                "created_at": datetime.now() - timedelta(days=random.randint(0, 30))
            }
            
            if status == "completed":
                task_data["completed_at"] = datetime.now() - timedelta(days=random.randint(0, 5))
            
            db.execute(insert(tasks).values(**task_data))
        
        db.commit()
        print("Created 20 tasks")
        
        # Create customer complaints
        complaint_types = ["Product Quality", "Service", "Pricing", "Cleanliness", "Staff Behavior"]
        complaint_statuses = ["open", "in_progress", "resolved"]
        
        for i in range(10):
            status = random.choice(complaint_statuses)
            
            complaint_data = {
                "customer_name": f"Customer {i+1}",
                "customer_email": f"customer{i+1}@example.com",
                "customer_phone": f"555-{1000+i}",
                "complaint_type": random.choice(complaint_types),
                "description": f"Complaint description {i+1}",
                "department_involved": random.choice(department_ids),
                "reported_by": random.choice(employee_ids),
                "severity": random.choice(["low", "medium", "high"]),
                "status": status,
                "resolution": "Issue resolved" if status == "resolved" else None,
                "created_at": datetime.now() - timedelta(days=random.randint(0, 30))
            }
            
            if status == "resolved":
                complaint_data["resolved_at"] = datetime.now() - timedelta(days=random.randint(0, 5))
            
            db.execute(insert(customer_complaints).values(**complaint_data))
        
        db.commit()
        print("Created 10 customer complaints")
        
        # Create pre-orders
        order_types = ["Cake", "Specialty Bread", "Party Tray", "Custom Cut Meat", "Gift Basket"]
        order_statuses = ["pending", "processing", "ready", "completed"]
        
        for i in range(15):
            status = random.choice(order_statuses)
            
            preorder_data = {
                "customer_name": f"Customer {i+1}",
                "customer_email": f"customer{i+1}@example.com",
                "customer_phone": f"555-{2000+i}",
                "order_type": random.choice(order_types),
                "description": f"Pre-order description {i+1}",
                "target_department": random.choice(department_ids[:3]),  # Only first 3 departments for pre-orders
                "requested_by": random.choice(employee_ids),
                "assigned_to": random.choice(employee_ids[:3]),
                "quantity": random.randint(1, 10),
                "estimated_price": round(random.uniform(10.0, 100.0), 2),
                "pickup_date": date.today() + timedelta(days=random.randint(1, 14)),
                "special_instructions": f"Special instructions for order {i+1}",
                "status": status,
                "created_at": datetime.now() - timedelta(days=random.randint(0, 30))
            }
            
            if status == "completed":
                preorder_data["completed_at"] = datetime.now() - timedelta(days=random.randint(0, 5))
            
            db.execute(insert(pre_orders).values(**preorder_data))
        
        db.commit()
        print("Created 15 pre-orders")
        
        print("Database seeding completed successfully!")
        print("\nTest Credentials:")
        print("Username: admin | Password: admin123 | Role: admin")
        print("Username: manager | Password: manager123 | Role: manager")
        print("Username: baker | Password: baker123 | Role: staff")
        print("Username: produce | Password: produce123 | Role: staff")
        print("Username: butcher | Password: butcher123 | Role: staff")

if __name__ == "__main__":
    seed_database()