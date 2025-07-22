# run_migrations.py
import os
import sys
import subprocess
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_command(command):
    """Run a shell command and print output"""
    print(f"Running: {command}")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout)
    
    if result.stderr:
        print(f"Error: {result.stderr}")
    
    if result.returncode != 0:
        print(f"Command failed with return code {result.returncode}")
        sys.exit(1)
    
    return result

def main():
    """Main function to run the migrations"""
    print("Starting database migration process...")
    
    # Ensure we're in the correct directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    print(f"Working directory: {os.getcwd()}")
    
    # Generate a new migration if requested
    if len(sys.argv) > 1 and sys.argv[1] == "generate":
        message = sys.argv[2] if len(sys.argv) > 2 else "Database changes"
        run_command(f"alembic revision --autogenerate -m \"{message}\"")
        print("Migration file generated. Review it before applying!")
        return
    
    # Run the migrations
    run_command("alembic upgrade head")
    print("Database migration completed successfully!")

if __name__ == "__main__":
    main()