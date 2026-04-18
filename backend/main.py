from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import national, districts, sectors, simulation

app = FastAPI(
    title="SLDS API",
    description="Sector-Level Development Simulator — Rwanda",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(national.router,    prefix="/api")
app.include_router(districts.router,   prefix="/api")
app.include_router(sectors.router,     prefix="/api")
app.include_router(simulation.router,  prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SLDS API"}
