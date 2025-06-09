# app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from .database.database import get_db
from .models.reflected_models import departments
from .routers import (
    users, 
    departments, 
    employees, 
    tasks, 
    complaints, 
    preorders, 
    inventory, 
    equipment,
    temperature,
    training,
    announcements,
    auth
)

app = FastAPI(title="Store Management API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(employees.router)
app.include_router(tasks.router)
app.include_router(complaints.router)
app.include_router(preorders.router)
app.include_router(inventory.router)
app.include_router(equipment.router)
app.include_router(temperature.router)
app.include_router(training.router)
app.include_router(announcements.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Store Management API", 
        "docs": "/docs",
        "version": "1.0.0"
    }

# Test endpoint to verify database connection
@app.get("/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    # Get first 5 departments
    query = select(departments).limit(5)
    result = db.execute(query).fetchall()
    
    # Convert to list of dictionaries
    dept_list = [dict(row._mapping) for row in result]
    
    return {"message": "Database connection successful", "departments": dept_list}