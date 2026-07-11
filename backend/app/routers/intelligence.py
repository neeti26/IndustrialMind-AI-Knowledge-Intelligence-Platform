"""
Intelligence Router — RCA, Lessons Learned, Maintenance Intelligence endpoints.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.rca_engine import (
    generate_rca,
    generate_lessons_learned,
    get_maintenance_intelligence,
)

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


class RCARequest(BaseModel):
    asset_id: Optional[str] = None
    incident_id: Optional[str] = None


@router.post("/rca")
async def run_rca(req: RCARequest):
    """Generate a full Root Cause Analysis report for an asset or incident."""
    try:
        return generate_rca(req.asset_id, req.incident_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lessons-learned")
async def get_lessons_learned():
    """Mine all documents for systemic failure patterns and lessons learned."""
    try:
        return generate_lessons_learned()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/maintenance")
async def get_maintenance():
    """Get predictive maintenance intelligence, schedules, and risk-ranked asset list."""
    try:
        return get_maintenance_intelligence()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def intelligence_health():
    return {"status": "ready", "modules": ["rca", "lessons_learned", "maintenance_intelligence"]}
