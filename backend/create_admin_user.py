# raw_sql_admin_user.py
# Uses direct SQL commands to avoid SQLAlchemy issues

import os
import psycopg2
from passlib.context import CryptContext
from dotenv import load_dotenv

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

# Load environment variables
load_dotenv()

# Get database connection parameters from DATABASE_URL
db_url = os.getenv("DATABASE_URL", "postgresql://username:password@localhost:5432/store_management")

# Parse DATABASE_URL into components
# Format is: postgresql://username:password@hostname:port/database
try:
    # Split by ://
    db_type, rest = db_url.split("://", 1)
    
    # Split credentials and location
    credentials, location = rest.split("@", 1)
    
    # Get username and password
    if ":" in credentials:
        username, password = credentials.split(":", 1)
    else:
        username = credentials
        password = ""
    
    # Get hostname, port, and database
    if "/" in location:
        host_port, database = location.split("/", 1)
    else:
        host_port = location
        database = ""
    
    # Split hostname and port
    if ":" in host_port:
        hostname, port = host_port.split(":", 1)
        port = int(port)
    else:
        hostname = host_port
        port = 5432  # Default PostgreSQL port
    
    print(f"Connecting to database:")
    print(f"  Host: {hostname}")
    print(f"  Port: {port}")
    print(f"  Database: {database}")
    print(f"  Username: {username}")
    
except Exception as e:
    print(f"Error parsing DATABASE_URL: {str(e)}")
    print("Please provide connection parameters manually.")
    hostname = input("Database hostname (default: localhost): ") or "localhost"
    port = int(input("Database port (default: 5432): ") or "5432")
    database = input("Database name: ")
    username = input("Database username: ")
    password = input("Database password: ")

def create_admin_user():
    """Create a new admin user in the database using raw SQL"""
    try:
        # Connect to the database
        print("Connecting to database...")
        conn = psycopg2.connect(
            host=hostname,
            port=port,
            database=database,
            user=username,
            password=password
        )
        
        # Create a cursor
        cursor = conn.cursor()
        
        # New admin user details
        admin_username = "admin"
        admin_password = "admin123"
        admin_password_hash = get_password_hash(admin_password)
        
        # Check if the users table exists
        cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')")
        if not cursor.fetchone()[0]:
            print("Error: users table does not exist in the database")
            conn.close()
            return
        
        # Get column information for users table
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        print("\nUsers table columns:")
        for col in columns:
            print(f"  {col[0]} ({col[1]}), Nullable: {col[2]}")
        
        # Check if username already exists
        cursor.execute("SELECT id FROM users WHERE username = %s", (admin_username,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            # User exists, update to admin
            user_id = existing_user[0]
            print(f"\nUser '{admin_username}' already exists with ID {user_id}")
            
            # Update to admin
            cursor.execute("""
                UPDATE users 
                SET password_hash = %s, 
                    role = 'admin'
                WHERE id = %s
            """, (admin_password_hash, user_id))
            
            # Also update is_active if the column exists
            cursor.execute("SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active'")
            if cursor.fetchone():
                cursor.execute("UPDATE users SET is_active = TRUE WHERE id = %s", (user_id,))
            
            print(f"Updated user '{admin_username}' to admin role with new password")
        else:
            # Create new admin user with minimal required fields
            print("\nCreating new admin user...")
            
            # Build the column list and value placeholders dynamically
            column_names = []
            placeholders = []
            values = []
            
            # Always include username and password_hash
            column_names.extend(["username", "password_hash"])
            placeholders.extend(["%s", "%s"])
            values.extend([admin_username, admin_password_hash])
            
            # Add role if it exists
            cursor.execute("SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role'")
            if cursor.fetchone():
                column_names.append("role")
                placeholders.append("%s")
                values.append("admin")
            
            # Add is_active if it exists
            cursor.execute("SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active'")
            if cursor.fetchone():
                column_names.append("is_active")
                placeholders.append("TRUE")  # Direct SQL boolean value
            
            # Add user_type if it exists
            cursor.execute("SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_type'")
            if cursor.fetchone():
                column_names.append("user_type")
                placeholders.append("%s")
                values.append("admin")
            
            # Add created_at if it exists
            cursor.execute("SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at'")
            if cursor.fetchone():
                column_names.append("created_at")
                placeholders.append("CURRENT_TIMESTAMP")
            
            # Add email if it exists and is required (not nullable)
            cursor.execute("SELECT is_nullable FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email'")
            email_nullable = cursor.fetchone()
            if email_nullable and email_nullable[0] == 'NO':  # Not nullable
                column_names.append("email")
                placeholders.append("%s")
                values.append("admin@example.com")
            
            # Construct the INSERT query
            columns_str = ", ".join(column_names)
            placeholders_str = ", ".join(placeholders)
            
            insert_query = f"INSERT INTO users ({columns_str}) VALUES ({placeholders_str}) RETURNING id"
            
            print(f"Executing: {insert_query} with values {values}")
            cursor.execute(insert_query, values)
            
            # Get the inserted ID
            new_user_id = cursor.fetchone()[0]
            print(f"Created new admin user '{admin_username}' with ID {new_user_id}")
        
        # Commit changes
        conn.commit()
        
        print("\nSuccess! Admin user is ready.")
        print(f"Username: {admin_username}")
        print(f"Password: {admin_password}")
        print("\nYou can now log in with these credentials.")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        if 'conn' in locals() and conn:
            conn.rollback()
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    print("Emergency Admin User Creation Script")
    print("====================================")
    create_admin_user()