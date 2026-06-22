"""
AI Agent — Handles query answering, compliance analysis, and risk assessment.
Uses OpenAI GPT-4o or Groq Llama as the LLM backbone.
"""
import os
from typing import Optional
from openai import OpenAI
from app.config import get_settings
from app.services import rag_engine
from app.services import knowledge_graph as kg

settings = get_settings()

# Lazy client init
_openai_client: Optional[OpenAI] = None
_groq_client = None


def _get_llm_client():
    global _openai_client, _groq_client
    if settings.model_provider == "groq":
        if _groq_client is None:
            from groq import Groq
            _groq_client = Groq(api_key=settings.groq_api_key)
        return _groq_client, "llama-3.3-70b-versatile"
    else:
        if _openai_client is None:
            _openai_client = OpenAI(api_key=settings.openai_api_key)
        return _openai_client, "gpt-4o"


def _call_llm(messages: list[dict], temperature: float = 0.2) -> str:
    client, model = _get_llm_client()
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=1500,
    )
    return response.choices[0].message.content or ""


SYSTEM_PROMPT = """You are IndustrialMind, an AI Knowledge Intelligence Copilot for
Visakhapatnam Fertilizer Complex (VFC). You have access to maintenance procedures,
incident reports, work orders, regulatory standards (OISD-116, Factory Act 1948),
and compliance audit findings.

Your job is to provide precise, evidence-based answers that help engineers,
safety officers, and maintenance teams make better decisions.

Rules:
1. ALWAYS cite the source document and specific clause/section when referencing regulations.
2. Flag any safety concerns or compliance gaps you detect, even if not directly asked.
3. If you detect compound risks (e.g., open work orders + active permits + sensor alerts),
   explicitly call them out as COMPOUND RISK ALERTS.
4. Be concise but complete. Use bullet points for multi-part answers.
5. If the context doesn't contain enough information to answer, say so clearly.
6. For maintenance queries, always include: last maintenance date, next due date,
   any open work orders, and relevant regulatory requirements.
"""


def answer_query(query: str) -> dict:
    """
    Main RAG-powered query answering with graph context injection.
    Returns answer + sources + graph context + any detected risks.
    """
    # Step 1: Retrieve relevant document chunks
    chunks = rag_engine.retrieve(query, n_results=6)

    if not chunks:
        return {
            "answer": "No documents have been ingested yet. Please run document ingestion first.",
            "sources": [],
            "graph_context": [],
            "risk_alerts": [],
            "confidence": 0.0,
        }

    # Step 2: Build graph context for any mentioned assets
    graph = kg.get_graph()
    graph_context_lines = []
    asset_ids = ["P-101", "P-103", "HE-301", "GD-303", "V-101A"]
    mentioned_assets = [a for a in asset_ids if a.lower() in query.lower()]

    for asset in mentioned_assets:
        if asset in graph:
            data = graph.nodes[asset]
            open_wos = [
                t for _, t, d in graph.out_edges(asset, data=True)
                if d.get("relation") == "HAS_OPEN_WO"
            ]
            graph_context_lines.append(
                f"Asset {asset} ({data.get('subtype', '')}): "
                f"Status={data.get('status')}, "
                f"Last maintained={data.get('last_maintained', 'N/A')}, "
                f"Open WOs={open_wos}"
            )

    # Step 3: Add active hazards context if query seems safety-related
    safety_keywords = ["safety", "risk", "hazard", "permit", "gas", "nh3", "h2s",
                       "hot work", "seal", "leak", "incident", "near miss", "compliance"]
    is_safety_query = any(kw in query.lower() for kw in safety_keywords)

    risk_alerts = []
    if is_safety_query:
        hazards = kg.get_active_hazards()
        for h in hazards:
            if h["risk_score"] >= 7.0:
                risk_alerts.append({
                    "id": h["id"],
                    "label": h["label"],
                    "description": h["description"],
                    "severity": h["severity"],
                    "risk_score": h["risk_score"],
                })

    # Step 4: Build context string for LLM
    context_parts = []
    for chunk in chunks:
        meta = chunk["metadata"]
        context_parts.append(
            f"[Source: {meta.get('filename', 'Unknown')} | "
            f"Type: {meta.get('doc_type', 'Unknown')} | "
            f"Asset: {meta.get('asset_tag', 'N/A')} | "
            f"Relevance: {chunk['relevance_score']}]\n"
            f"{chunk['content']}"
        )

    context_str = "\n\n---\n\n".join(context_parts)

    if graph_context_lines:
        context_str += "\n\n[KNOWLEDGE GRAPH CONTEXT]\n" + "\n".join(graph_context_lines)

    if risk_alerts:
        context_str += "\n\n[ACTIVE RISK ALERTS]\n" + "\n".join(
            f"• {r['label']} (Risk Score: {r['risk_score']}/10): {r['description']}"
            for r in risk_alerts
        )

    # Step 5: Generate answer
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"""Query: {query}

Retrieved Context:
{context_str}

Please provide a comprehensive answer with source citations."""
        }
    ]

    answer = _call_llm(messages)
    avg_relevance = sum(c["relevance_score"] for c in chunks) / len(chunks) if chunks else 0

    # Format sources
    sources = []
    seen = set()
    for chunk in chunks:
        fname = chunk["metadata"].get("filename", "")
        if fname not in seen:
            seen.add(fname)
            sources.append({
                "filename": fname,
                "doc_type": chunk["metadata"].get("doc_type", ""),
                "asset_tag": chunk["metadata"].get("asset_tag", ""),
                "relevance_score": chunk["relevance_score"],
            })

    return {
        "answer": answer,
        "sources": sources,
        "graph_context": graph_context_lines,
        "risk_alerts": risk_alerts,
        "confidence": round(avg_relevance, 3),
    }


def run_compliance_check(asset_id: Optional[str] = None) -> dict:
    """
    Run a compliance check across all open findings,
    optionally filtered by asset.
    """
    gaps = kg.get_compliance_gaps()

    if asset_id:
        graph = kg.get_graph()
        relevant_gaps = []
        for gap in gaps:
            # Check if asset is mentioned in linked entities
            if asset_id in gap.get("linked_to", []) or asset_id in gap.get("description", ""):
                relevant_gaps.append(gap)
        gaps = relevant_gaps if relevant_gaps else gaps

    # Generate LLM summary of compliance status
    gaps_text = "\n".join(
        f"- [{g['severity']}] {g['id']}: {g['description']} "
        f"(Regulation: {g['regulation']}, Due: {g['target_date']})"
        for g in gaps
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"""Generate a concise compliance status summary for VFC plant.
Focus on: risk prioritization, regulatory exposure, and immediate action recommendations.

Open Compliance Findings:
{gaps_text}

Asset filter: {asset_id or 'All assets'}"""
        }
    ]

    summary = _call_llm(messages)

    return {
        "summary": summary,
        "gaps": gaps,
        "critical_count": sum(1 for g in gaps if g["severity"] == "CRITICAL"),
        "major_count": sum(1 for g in gaps if g["severity"] == "MAJOR"),
        "total_open": len(gaps),
    }


def analyze_risk_scenario(scenario: str) -> dict:
    """
    Analyze a described risk scenario against known incidents and regulations.
    """
    # Retrieve relevant context
    chunks = rag_engine.retrieve(scenario, n_results=8)
    hazards = kg.get_active_hazards()
    gaps = kg.get_compliance_gaps()

    context_str = "\n\n---\n\n".join(
        f"[{c['metadata'].get('filename')}]: {c['content']}" for c in chunks
    )

    hazard_str = "\n".join(
        f"• {h['label']} (Score {h['risk_score']}/10): {h['description']}"
        for h in hazards
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"""Analyze this risk scenario against our plant's history,
current conditions, and regulatory requirements:

SCENARIO: {scenario}

RELEVANT DOCUMENT CONTEXT:
{context_str}

KNOWN ACTIVE HAZARDS:
{hazard_str}

Provide:
1. Risk assessment (severity, likelihood, regulatory exposure)
2. Historical precedent from our incident records
3. Specific regulatory clauses that apply
4. Immediate recommended actions
5. Any compound risk conditions this scenario creates"""
        }
    ]

    analysis = _call_llm(messages, temperature=0.1)

    return {
        "scenario": scenario,
        "analysis": analysis,
        "related_hazards": hazards[:3],
        "sources_consulted": len(chunks),
    }
