# app/utils/error_handling.py
from fastapi import HTTPException

def raise_api_error(status_code: int, detail: str):
    """Consistent error response helper"""
    raise HTTPException(status_code=status_code, detail=detail)