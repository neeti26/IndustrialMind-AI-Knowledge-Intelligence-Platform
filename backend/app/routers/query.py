from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.ai_agent import answer_query, run_compliance_check, analyze_risk_scenario

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    question: str
    asset_filter: Optional[str] = None


class ComplianceRequest(BaseModel):
    asset_id: Optional[str] = None


class RiskScenarioRequest(BaseModel):
    scenario: str


@router.post("/ask")
async def ask_question(req: QueryRequest):
    """Answer a natural language question using RAG + knowledge graph."""
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    try:
        result = answer_query(req.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compliance")
async def compliance_check(req: ComplianceRequest):
    """Run compliance gap analysis."""
    try:
        result = run_compliance_check(req.asset_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk-scenario")
async def risk_scenario_analysis(req: RiskScenarioRequest):
    """Analyze a risk scenario against plant history and regulations."""
    if not req.scenario.strip():
        raise HTTPException(status_code=400, detail="Scenario cannot be empty")
    try:
        result = analyze_risk_scenario(req.scenario)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Suggested demo queries endpoint
@router.get("/suggestions")
async def get_suggested_queries():
    return {
        "suggestions": [
            "What is the maintenance status of Pump P-101 and are there any open work orders?",
            "What are the OISD-116 requirements for hot work permits near gas detection zones?",
            "Summarize all compliance gaps that are currently open and their regulatory impact.",
            "What were the root causes of incident IR-2024-047 and what lessons were identified?",
            "Is it safe to issue a hot work permit in Area 3 right now given current conditions?",
            "What spare parts are critically low and which assets are at risk?",
            "What is the inspection status of HE-301 and when is the next NDT due?",
            "Show me all compound risk conditions currently active in the plant.",
        ]
    }
