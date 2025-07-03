# app/utils/db_helpers.py

def row_to_dict(row):
    """Convert a SQLAlchemy RowMapping to a dictionary"""
    if row is None:
        return None
    return dict(row._mapping)

def rows_to_list(rows):
    """Convert a list of SQLAlchemy RowMapping objects to a list of dictionaries"""
    return [dict(row._mapping) for row in rows]