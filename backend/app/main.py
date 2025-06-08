from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from .database.database import get_db
from .models.reflected_models import departments

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Store Management API"}

# Test endpoint to verify database connection
@app.get("/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    # Get first 5 departments - FIXED SYNTAX FOR SQLALCHEMY 2.0
    query = select(departments).limit(5)
    result = db.execute(query).fetchall()
    
    # Convert to list of dictionaries
    dept_list = [dict(row._mapping) for row in result]
    
    return {"message": "Database connection successful", "departments": dept_list}