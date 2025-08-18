from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
import os
from dotenv import load_dotenv

# Import your routers
from app.routers import tasks, users, training, announcements, auth, complaints, departments, employees, equipment, inventory, permissions, preorders, temperature, reminders

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Store Management API",
    description="API for store management and task tracking system",
    version="1.0.0",
    docs_url=None,  # Disable default docs
    redoc_url=None,  # Disable default redoc
    redirect_slashes=False
)

# Configure CORS - FIXED VERSION
origins = [
    "http://localhost:3000",  # Local development
    "http://localhost:3001",  # Alternative local port
    "https://summerhill.up.railway.app",  # Production frontend
    "https://summerhill-frontend.up.railway.app",  # Alternative production URL
]

# Get environment variable for additional origins if needed
additional_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
if additional_origins and additional_origins[0]:  # Check if not empty
    origins.extend([origin.strip() for origin in additional_origins if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # ✅ Explicit origins instead of "*"
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

# Include all routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(employees.router)
app.include_router(tasks.router)
app.include_router(complaints.router)
app.include_router(preorders.router)
app.include_router(announcements.router)
app.include_router(permissions.router)
app.include_router(inventory.router)
app.include_router(equipment.router)
app.include_router(temperature.router)
app.include_router(training.router)
app.include_router(reminders.router)

# Custom OpenAPI and documentation endpoints
@app.get("/docs", include_in_schema=False)
async def get_documentation():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=f"{app.title} - API Documentation",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
    )

@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_schema():
    return get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

@app.get("/")
async def root():
    return {
        "message": "Welcome to the Store Management API",
        "documentation": "/docs",
        "status": "online"
    }