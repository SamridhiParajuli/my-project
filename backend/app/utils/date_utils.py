# app/utils/date_utils.py
from datetime import datetime, date
from typing import Optional, Union

def parse_date(date_value: Optional[Union[str, datetime, date]]) -> Optional[datetime]:
    """
    Parse a date value from various formats to a datetime object.
    
    Args:
        date_value: The date value to parse, can be a string, datetime, date, or None.
        
    Returns:
        A datetime object, or None if the input was None or couldn't be parsed.
    """
    if date_value is None:
        return None
        
    if isinstance(date_value, datetime):
        return date_value
        
    if isinstance(date_value, date):
        return datetime.combine(date_value, datetime.min.time())
        
    if isinstance(date_value, str):
        # Try various date formats
        formats = [
            "%Y-%m-%d",           # ISO format: 2023-01-31
            "%Y-%m-%dT%H:%M:%S",  # ISO with time: 2023-01-31T14:30:00
            "%Y-%m-%d %H:%M:%S",  # Standard datetime: 2023-01-31 14:30:00
            "%m/%d/%Y",           # US format: 01/31/2023
            "%d/%m/%Y",           # EU format: 31/01/2023
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_value, fmt)
            except ValueError:
                continue
                
        # Try parsing as ISO format with timezone
        try:
            return datetime.fromisoformat(date_value)
        except ValueError:
            pass
            
        # If all parsing attempts fail, log and return None
        print(f"Could not parse date value: {date_value}")
        return None
        
    # For any other type, return None
    return None