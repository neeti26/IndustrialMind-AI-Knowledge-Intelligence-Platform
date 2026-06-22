"""
AI Agent — Handles query answering, compliance analysis, and risk assessment.
Uses OpenAI GPT-4o or Groq Llama as the LLM backbone.
Gracefully degrades to RAG-only mode if no API key is configured.
"""
from typing import Optional
from app.config import get_settings
from app.services import rag_engine
from app.services import knowledge_graph as kg

settings = get_settings()

_openai_client = None
_groq_client = None


def _get_llm_client():
    global _openai_client, _groq_client
    if settings.model_provider == "groq" and settings.groq_api_key:
        if _groq_client is None:
            from groq import Groq
            _groq_client = Groq(api_key=settings.groq_api_key)
        return _groq_client, "llama-3.3-70b-versatile", "groq"
    elif settings.openai_api_key and not settings.openai_api_key.startswith("your_"):
        if _openai_client is None:
            from openai import OpenAI
            _openai_client = OpenAI(api_key=settings.openai_api_key)
        return _openai_client, "gpt-4o", "openai"
    return None, None, None


def _call_llm(messages: list[dict], temperature: float = 0.2) -> Optional[str]:
    client, model, provider = _get_llm_client()
    if client is None:
        return None
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=1500,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        return f"[LLM Error: {str(e)}]"


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


def _format_rag_fallback(query: str, chunks: list[dict], graph_context_lines: list[str], risk_alerts: list[dict]) -> str:
    """Structured answer from RAG chunks when no LLM is available."""
    parts = [f"**Query:** {query}\n"]
    parts.append("**Retrieved Context** *(AI synthesis unavailable — configure API key for full answers)*\n")
    for i, chunk in enumerate(chunks[:3], 1):
        meta = chunk["metadata"]
        parts.append(
            f"**[{i}] {meta.get('filename', 'Unknown')}** "
            f"(relevance: {int(chunk['relevance_score'] * 100)}%)\n"
            f"{chunk['content'][:500]}...\n"
        )
    if graph_context_lines:
        parts.append("\n**Knowledge Graph Context:**")
        for line in graph_context_lines:
            parts.append(f"- {line}")
    if risk_alerts:
        parts.append("\n⚠️ **Active Risk Alerts:**")
        for r in risk_alerts:
            parts.append(f"- **{r['label']}** (Risk {r['risk_score']}/10): {r['description']}")
    parts.append(
        "\n\n> 💡 *Add `OPENAI_API_KEY` or `GROQ_API_KEY` to environment variables for full AI-generated answers with citations.*"
    )
    return "\n".join(parts)


def answer_query(query: str) -> dict:
    chunks = rag_engine.retrieve(query, n_results=6)

    if not chunks:
        return {
            "answer": "No documents have been ingested yet. The system is initializing.",
            "sources": [],
            "graph_context": [],
            "risk_alerts": [],
            "confidence": 0.0,
        }

    # Build graph context
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

    # Safety keywords check
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

    # Build context string for LLM
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

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Query: {query}\n\nRetrieved Context:\n{context_str}\n\nProvide a comprehensive answer with source citations."
        }
    ]

    llm_answer = _call_llm(messages)
    avg_relevance = sum(c["relevance_score"] for c in chunks) / len(chunks) if chunks else 0

    if llm_answer is None:
        answer = _format_rag_fallback(query, chunks, graph_context_lines, risk_alerts)
    else:
        answer = llm_answer

    seen = set()
    sources = []
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
    gaps = kg.get_compliance_gaps()

    if asset_id:
        relevant_gaps = [
            g for g in gaps
            if asset_id in g.get("linked_to", []) or asset_id in g.get("description", "")
        ]
        if relevant_gaps:
            gaps = relevant_gaps

    gaps_text = "\n".join(
        f"- [{g['severity']}] {g['id']}: {g['description']} "
        f"(Regulation: {g['regulation']}, Due: {g['target_date']})"
        for g in gaps
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Generate a concise compliance status summary for VFC plant.\n"
                       f"Focus on: risk prioritization, regulatory exposure, and immediate action recommendations.\n\n"
                       f"Open Compliance Findings:\n{gaps_text}\n\nAsset filter: {asset_id or 'All assets'}"
        }
    ]

    llm_summary = _call_llm(messages)

    if llm_summary is None:
        summary = (
            f"**Compliance Status — {len(gaps)} Open Findings**\n\n"
            + "\n".join(
                f"**[{g['severity']}] {g['id']}:** {g['description']}  \n"
                f"*Regulation: {g['regulation']} | Due: {g['target_date']}*"
                for g in gaps
            )
            + "\n\n> *Configure API key for AI-generated prioritization and action plan.*"
        )
    else:
        summary = llm_summary

    return {
        "summary": summary,
        "gaps": gaps,
        "critical_count": sum(1 for g in gaps if g["severity"] == "CRITICAL"),
        "major_count": sum(1 for g in gaps if g["severity"] == "MAJOR"),
        "total_open": len(gaps),
    }


def analyze_risk_scenario(scenario: str) -> dict:
    chunks = rag_engine.retrieve(scenario, n_results=8)
    hazards = kg.get_active_hazards()

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
            "content": f"Analyze this risk scenario:\n\nSCENARIO: {scenario}\n\n"
                       f"RELEVANT DOCUMENT CONTEXT:\n{context_str}\n\n"
                       f"KNOWN ACTIVE HAZARDS:\n{hazard_str}\n\n"
                       f"Provide:\n1. Risk assessment (severity, likelihood, regulatory exposure)\n"
                       f"2. Historical precedent from incident records\n"
                       f"3. Specific regulatory clauses that apply\n"
                       f"4. Immediate recommended actions\n"
                       f"5. Any compound risk conditions this scenario creates"
        }
    ]

    llm_analysis = _call_llm(messages, temperature=0.1)

    if llm_analysis is None:
        analysis = (
            f"**Scenario:** {scenario}\n\n"
            f"**Active Hazards Cross-Referenced:**\n"
            + "\n".join(f"- {h['label']} (Risk {h['risk_score']}/10)" for h in hazards)
            + f"\n\n**Retrieved {len(chunks)} relevant document sections.**\n\n"
            f"> *Configure API key for full AI risk analysis.*"
        )
    else:
        analysis = llm_analysis

    return {
        "scenario": scenario,
        "analysis": analysis,
        "related_hazards": hazards[:3],
        "sources_consulted": len(chunks),
    }
