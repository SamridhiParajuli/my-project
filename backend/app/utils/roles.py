# app/utils/roles.py
from fastapi import Depends
from sqlalchemy.orm import Session
from ..database.database import get_db
from ..utils.auth_utils import get_current_active_user  # Updated import
from .error_handling import raise_api_error

async def admin_only(current_user: dict = Depends(get_current_active_user)):
    """
    Dependency that ensures the current user has admin role.
    Raises an exception if the user is not an admin.
    """
    if current_user["role"] != "admin":
        raise_api_error(403, "This operation requires admin privileges")
    return current_user

async def manager_or_admin(current_user: dict = Depends(get_current_active_user)):
    """
    Dependency that ensures the current user has manager or admin role.
    Raises an exception if the user is not a manager or admin.
    """
    if current_user["role"] not in ["manager", "admin"]:
        raise_api_error(403, "This operation requires manager or admin privileges")
    return current_user