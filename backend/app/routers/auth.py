# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select
from passlib.context import CryptContext
from jose import JWTError
from jose import jwt
from datetime import datetime, timedelta
from typing import Optional
from ..utils.security import verify_password, get_password_hash
from sqlalchemy import select, insert, update, delete
from ..database.database import get_db
from ..models.reflected_models import users
from ..schemas import schemas

# Constants for JWT
SECRET_KEY = "your-secret-key"  # In production, use a secure key stored in env vars
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(db: Session, username: str, password: str):
    query = select(users).where(users.c.username == username)
    user = db.execute(query).fetchone()
    if not user:
        return False
    if not verify_password(password, user._mapping["password_hash"]):
        return False
    return user._mapping

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    query = select(users).where(users.c.username == username)
    user = db.execute(query).fetchone()
    if user is None:
        raise credentials_exception
    return user._mapping

async def get_current_active_user(current_user: dict = Depends(get_current_user)):
    if not current_user["is_active"]:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@router.post("/token", response_model=dict)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Add to auth.py
@router.post("/logout", response_model=dict)
async def logout():
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=schemas.User)
async def get_current_user_info(current_user: dict = Depends(get_current_active_user)):
    return current_user

@router.get("/{user_id}", response_model=schemas.User)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_active_user)):
    query = select(users).where(users.c.id == user_id)
    result = db.execute(query).fetchone()
    if result is None:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(result._mapping)

@router.put("/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user: schemas.UserCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_active_user)):
    # Check if user exists
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user
    update_values = {
        "username": user.username,
        "user_type": user.user_type,
        "employee_id": user.employee_id,
        "department_id": user.department_id,
        "role": user.role,
        "is_active": user.is_active
    }
    
    # Only update password if provided
    if hasattr(user, 'password') and user.password:
        update_values["password_hash"] = get_password_hash(user.password)
    
    update_stmt = update(users).where(users.c.id == user_id).values(**update_values)
    db.execute(update_stmt)
    db.commit()
    
    # Fetch updated user
    query = select(users).where(users.c.id == user_id)
    result = db.execute(query).fetchone()
    updated_user = dict(result._mapping)
    return updated_user

@router.delete("/{user_id}", response_model=dict)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_active_user)):
    # Check if user exists
    query = select(users).where(users.c.id == user_id)
    existing_user = db.execute(query).fetchone()
    if existing_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Instead of deleting, deactivate the user
    update_stmt = update(users).where(users.c.id == user_id).values({"is_active": False})
    db.execute(update_stmt)
    db.commit()
    
    return {"message": "User deactivated successfully"}