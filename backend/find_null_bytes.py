# find_null_bytes.py
import os

def check_file_for_null_bytes(filepath):
    try:
        with open(filepath, 'rb') as file:
            content = file.read()
            if b'\x00' in content:
                print(f"Found null bytes in: {filepath}")
                return True
    except Exception as e:
        print(f"Error checking {filepath}: {e}")
    return False

def scan_directory(directory):
    found = False
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                if check_file_for_null_bytes(filepath):
                    found = True
    return found

if __name__ == "__main__":
    if not scan_directory("app"):
        print("No null bytes found in Python files.")