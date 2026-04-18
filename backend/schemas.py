from pydantic import BaseModel
from typing import Optional


class SimulateRequest(BaseModel):
    sector: str
    intervention: dict[str, float]


class BatchSimulateRequest(BaseModel):
    intervention: dict[str, float]
    district: Optional[str] = None


class CompareRequest(BaseModel):
    district: Optional[str] = None
