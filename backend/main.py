# backend/main.py
import os
import sys
from contextlib import asynccontextmanager

print("=== STARTING SLDS BACKEND ===")
print(f"Python path: {sys.path}")
print(f"Current directory: {os.getcwd()}")
print(f"Files in current directory: {os.listdir('.')}")

# Load .env before anything else
from dotenv import load_dotenv
load_dotenv()

print(f"DATABASE_URL set: {'DATABASE_URL' in os.environ}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Try importing database
try:
    print("Attempting to import database...")
    from database import Base, engine
    print("✅ Database imported successfully")
except Exception as e:
    print(f"❌ Failed to import database: {e}")
    raise

# Try importing routers
try:
    print("Attempting to import routers...")
    from routers import national, districts, sectors, simulation
    from routers import auth, users
    from routers import assistant
    from routers import reports
    import models.report
    print("✅ Routers imported successfully")
except Exception as e:
    print(f"❌ Failed to import routers: {e}")
    raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔄 Running lifespan startup...")
    try:
        # Create all tables on startup
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created/verified")
    except Exception as e:
        print(f"❌ Database startup error: {e}")
        raise
    yield
    print("🔄 Running lifespan shutdown...")

print("Creating FastAPI app...")
app = FastAPI(
    title="SLDS API",
    description="Sector-Level Development Simulator — Rwanda",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Existing domain routers
app.include_router(national.router,    prefix="/api")
app.include_router(districts.router,   prefix="/api")
app.include_router(sectors.router,     prefix="/api")
app.include_router(simulation.router,  prefix="/api")

# Auth + user-management routers
app.include_router(auth.router,  prefix="/api")
app.include_router(users.router, prefix="/api")

# AI assistant
app.include_router(assistant.router, prefix="/api")

# Reports & notifications
app.include_router(reports.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SLDS API"}

print("✅ FastAPI app created successfully")
print("=== SLDS BACKEND READY ===")