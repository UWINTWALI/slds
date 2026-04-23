from contextlib import asynccontextmanager

# Load .env before anything else so os.getenv() picks up all variables
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import national, districts, sectors, simulation
from routers import auth, users
from routers import assistant


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (no-op if they already exist)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="SLDS API",
    description="Sector-Level Development Simulator — Rwanda",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SLDS API"}
