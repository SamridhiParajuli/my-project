from pydantic import BaseModel
from typing import Optional

# User Schemas
class UserBase(BaseModel):
    username: str
    user_type: str
    employee_id: Optional[int] = None
    department_id: Optional[int] = None
    role: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str  # This will be converted to password_hash in the database

class User(UserBase):
    id: int
    
    class Config:
        orm_mode = True