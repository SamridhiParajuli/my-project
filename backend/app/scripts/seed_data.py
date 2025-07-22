# Path: Backend/App/scripts/seed_data.py
from datetime import datetime
from ..database.database import get_db
from ..models.reflected_models import users, roles, departments, permissions, user_permissions
from ..utils.auth_utils import hash_password
from sqlalchemy import insert, select

def seed_roles():
    db = next(get_db())
    
    # Check if roles already exist
    existing_roles = db.execute(select(roles)).fetchall()
    if existing_roles:
        print("Roles already exist. Skipping role seeding.")
        return
    
    # Define roles
    roles_data = [
        {"name": "admin", "description": "Store administrator"},
        {"name": "manager", "description": "Department manager"},
        {"name": "lead", "description": "Department lead"},
        {"name": "staff", "description": "Regular staff member"}
    ]
    
    for role_data in roles_data:
        db.execute(insert(roles).values(**role_data))
    
    db.commit()
    print("Roles seeded successfully.")

def seed_departments():
    db = next(get_db())
    
    # Check if departments already exist
    existing_departments = db.execute(select(departments)).fetchall()
    if existing_departments:
        print("Departments already exist. Skipping department seeding.")
        return
    
    # Define departments
    departments_data = [
        {"name": "Grocery", "description": "Grocery department"},
        {"name": "Produce", "description": "Produce department"},
        {"name": "Bakery", "description": "Bakery department"},
        {"name": "Meat", "description": "Meat department"},
        {"name": "Cash", "description": "Cashier department"},
        {"name": "Prepared Foods", "description": "Prepared foods department"},
        {"name": "Dairy", "description": "Dairy department"},
        {"name": "Bulk", "description": "Bulk foods department"}
    ]
    
    for dept_data in departments_data:
        db.execute(insert(departments).values(**dept_data))
    
    db.commit()
    print("Departments seeded successfully.")

def seed_permissions():
    db = next(get_db())
    
    # Check if permissions already exist
    existing_permissions = db.execute(select(permissions)).fetchall()
    if existing_permissions:
        print("Permissions already exist. Skipping permission seeding.")
        return
    
    # Define permissions
    permissions_data = [
        {"name": "view_employees", "description": "View employee records"},
        {"name": "add_employees", "description": "Add new employee records"},
        {"name": "edit_employees", "description": "Edit employee records"},
        {"name": "delete_employees", "description": "Delete employee records"},
        
        {"name": "view_tasks", "description": "View tasks"},
        {"name": "add_tasks", "description": "Add new tasks"},
        {"name": "edit_tasks", "description": "Edit tasks"},
        {"name": "delete_tasks", "description": "Delete tasks"},
        
        {"name": "view_departments", "description": "View departments"},
        {"name": "add_departments", "description": "Add new departments"},
        {"name": "edit_departments", "description": "Edit departments"},
        {"name": "delete_departments", "description": "Delete departments"},
        
        {"name": "view_inventory", "description": "View inventory"},
        {"name": "add_inventory", "description": "Add inventory items"},
        {"name": "edit_inventory", "description": "Edit inventory items"},
        {"name": "delete_inventory", "description": "Delete inventory items"},
        
        {"name": "view_equipment", "description": "View equipment"},
        {"name": "add_equipment", "description": "Add equipment"},
        {"name": "edit_equipment", "description": "Edit equipment"},
        {"name": "delete_equipment", "description": "Delete equipment"},
        
        {"name": "view_users", "description": "View user accounts"},
        {"name": "add_users", "description": "Add user accounts"},
        {"name": "edit_users", "description": "Edit user accounts"},
        {"name": "delete_users", "description": "Delete user accounts"},
        
        {"name": "view_announcements", "description": "View announcements"},
        {"name": "add_announcements", "description": "Add announcements"},
        {"name": "edit_announcements", "description": "Edit announcements"},
        {"name": "delete_announcements", "description": "Delete announcements"},
        
        {"name": "view_complaints", "description": "View complaints"},
        {"name": "add_complaints", "description": "Add complaints"},
        {"name": "edit_complaints", "description": "Edit complaints"},
        {"name": "delete_complaints", "description": "Delete complaints"},
        
        {"name": "view_permissions", "description": "View permissions"},
        {"name": "edit_permissions", "description": "Edit permissions"},
        
        {"name": "view_preorders", "description": "View preorders"},
        {"name": "add_preorders", "description": "Add preorders"},
        {"name": "edit_preorders", "description": "Edit preorders"},
        {"name": "delete_preorders", "description": "Delete preorders"},
        
        {"name": "view_temperature", "description": "View temperature logs"},
        {"name": "add_temperature", "description": "Add temperature logs"},
        
        {"name": "view_training", "description": "View training records"},
        {"name": "add_training", "description": "Add training records"},
        {"name": "edit_training", "description": "Edit training records"}
    ]
    
    for perm_data in permissions_data:
        db.execute(insert(permissions).values(**perm_data))
    
    db.commit()
    print("Permissions seeded successfully.")

def seed_admin_users():
    db = next(get_db())
    
    # Check if admin users already exist
    existing_admins = db.execute(
        select(users).where(users.c.username.in_(["store_manager", "assistant_manager1", "assistant_manager2"]))
    ).fetchall()
    
    if existing_admins and len(existing_admins) == 3:
        print("Admin users already exist. Skipping admin seeding.")
        return
    
    # Get admin role ID
    admin_role = db.execute(
        select(roles.c.id).where(roles.c.name == "admin")
    ).fetchone()
    
    if not admin_role:
        print("Admin role not found. Seeding roles first.")
        seed_roles()
        admin_role = db.execute(
            select(roles.c.id).where(roles.c.name == "admin")
        ).fetchone()
        
    admin_role_id = admin_role[0]
    
    # Admin users data
    admin_users = [
        {
            "username": "store_manager",
            "password": hash_password("storemanager123"),
            "email": "store.manager@grocerystore.com",
            "name": "Store Manager",
            "role_id": admin_role_id,
            "is_active": True,
            "created_at": datetime.now()
        },
        {
            "username": "assistant_manager1",
            "password": hash_password("assistant1pass"),
            "email": "assistant1@grocerystore.com",
            "name": "Assistant Manager 1",
            "role_id": admin_role_id,
            "is_active": True,
            "created_at": datetime.now()
        },
        {
            "username": "assistant_manager2",
            "password": hash_password("assistant2pass"),
            "email": "assistant2@grocerystore.com",
            "name": "Assistant Manager 2",
            "role_id": admin_role_id,
            "is_active": True,
            "created_at": datetime.now()
        }
    ]
    
    for user_data in admin_users:
        db.execute(insert(users).values(**user_data))
    
    db.commit()
    print("Admin users seeded successfully.")