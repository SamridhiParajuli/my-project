# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, insert
from typing import List
from ..database.database import get_db
from ..models.reflected_models import users  # Use reflected table
from ..schemas import schemas
from ..utils.security import get_password_hash

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

@router.get("/", response_model=List[schemas.User])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Updated for SQLAlchemy 2.0: removed square brackets
    query = select(users).offset(skip).limit(limit)
    result = db.execute(query).fetchall()
    # Updated for SQLAlchemy 2.0: use _mapping
    users_list = [dict(row._mapping) for row in result]
    return users_list

@router.post("/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Create a new user matching your database schema
    new_user = {
        "username": user.username,
        "password_hash": get_password_hash(user.password),  # In production, hash this password!
        "user_type": user.user_type,
        "employee_id": user.employee_id,
        "department_id": user.department_id,
        "role": user.role,
        "is_active": user.is_active
    }
    
    # Insert the new user - using insert() function explicitly
    insert_stmt = insert(users).values(**new_user)
    result = db.execute(insert_stmt)
    db.commit()
    
    # Get the new user's ID
    user_id = result.inserted_primary_key[0]
    
    # Fetch and return the new user - updated for SQLAlchemy 2.0
    query = select(users).where(users.c.id == user_id)
    result = db.execute(query).fetchone()
    created_user = dict(result._mapping)
    return created_user