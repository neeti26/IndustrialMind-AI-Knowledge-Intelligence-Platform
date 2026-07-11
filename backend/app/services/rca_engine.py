"""
Root Cause Analysis (RCA) Engine
Fuses work order history, incident records, maintenance procedures,
and knowledge graph context to generate structured RCA reports.
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
    if settings.model_provider == "groq" and settings.groq_api_key and not settings.groq_api_key.startswith("your_"):
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


def _call_llm(messages: list[dict], temperature: float = 0.1) -> Optional[str]:
    client, model, _ = _get_llm_client()
    if client is None:
        return None
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=2000,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        return f"[LLM Error: {str(e)}]"


RCA_SYSTEM_PROMPT = """You are an expert Root Cause Analysis (RCA) engineer at an industrial chemical plant.
You apply rigorous 5-Why methodology, Fishbone (Ishikawa) analysis, and Bow-Tie analysis to identify
root causes from maintenance records, incident reports, and equipment failure data.

Your RCA outputs must follow this structure:
1. INCIDENT SUMMARY — What happened, when, where, what was affected
2. IMMEDIATE CAUSE — The direct physical cause of the failure/incident
3. CONTRIBUTING FACTORS — List all factors that enabled the immediate cause (equipment state, process conditions, human factors, organisational factors)
4. ROOT CAUSES (5-WHY) — Trace back to the systemic root causes
5. REGULATORY EXPOSURE — Which standards/regulations were implicated
6. CORRECTIVE ACTIONS — Immediate, short-term, and systemic actions with owners and due dates
7. RECURRENCE PREVENTION — How to prevent similar incidents using system-level changes
8. LESSONS LEARNED — 2-3 key transferable lessons for the organisation

Always cite specific work order numbers, incident IDs, and regulation clauses.
Flag COMPOUND RISKS where multiple contributing factors interact to amplify risk."""


LESSONS_SYSTEM_PROMPT = """You are an industrial safety and reliability engineer specialising in
pattern recognition across incident histories, compliance audits, and maintenance records.

Your task is to identify SYSTEMIC FAILURE PATTERNS — recurring themes that span multiple incidents,
work orders, or compliance findings — that no individual review can see.

For each pattern identified:
- Name it clearly and concisely
- Cite the specific incidents/findings/work orders that share the pattern
- Explain WHY this pattern is systemic (not just a one-off)
- Quantify the risk if left unaddressed
- Provide a specific, actionable recommendation

Focus on patterns that are:
1. Safety-critical or operationally impactful
2. Cross-functional (span maintenance, operations, safety, procurement)
3. Linked to regulatory obligations
4. Indicative of knowledge gaps or organisational weaknesses"""


def generate_rca(asset_id: Optional[str] = None, incident_id: Optional[str] = None) -> dict:
    """Generate a full RCA report for an asset or incident."""
    query = f"root cause analysis {asset_id or ''} {incident_id or ''} failure incident maintenance"
    chunks = rag_engine.retrieve(query.strip(), n_results=8)
    G = kg.get_graph()

    # Build graph context
    graph_ctx = []
    if asset_id and asset_id in G:
        data = G.nodes[asset_id]
        open_wos = [t for _, t, d in G.out_edges(asset_id, data=True) if d.get("relation") == "HAS_OPEN_WO"]
        incidents = [s for s, t, d in G.in_edges(asset_id, data=True) if d.get("relation") in ("INVOLVED_ASSET", "DETECTED_BY")]
        hazards = [s for s, t, d in G.in_edges(asset_id, data=True) if G.nodes[s].get("type") == "Hazard"]
        compliance = [s for s, t, d in G.in_edges(asset_id, data=True) if G.nodes[s].get("type") == "ComplianceFinding"]
        graph_ctx.append(f"Asset: {asset_id} | Status: {data.get('status')} | Last maintained: {data.get('last_maintained','N/A')} | Next due: {data.get('next_due','N/A')}")
        if open_wos:
            graph_ctx.append(f"Open Work Orders: {', '.join(open_wos)}")
        if incidents:
            graph_ctx.append(f"Related Incidents: {', '.join(incidents)}")
        if hazards:
            graph_ctx.append(f"Active Hazards involving this asset: {', '.join(hazards)}")
        if compliance:
            graph_ctx.append(f"Compliance findings linked: {', '.join(compliance)}")

    context_str = "\n\n---\n\n".join(
        f"[{c['metadata'].get('filename')} | {c['metadata'].get('doc_type')}]\n{c['content']}"
        for c in chunks
    )
    if graph_ctx:
        context_str += "\n\n[KNOWLEDGE GRAPH CONTEXT]\n" + "\n".join(graph_ctx)

    messages = [
        {"role": "system", "content": RCA_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Generate a comprehensive RCA report.\n"
                       f"Asset under analysis: {asset_id or 'All assets'}\n"
                       f"Incident reference: {incident_id or 'IR-2024-047 (most recent high-potential near-miss)'}\n\n"
                       f"DOCUMENT CONTEXT:\n{context_str}\n\n"
                       f"Produce the full structured RCA report following the 8-section format."
        }
    ]

    llm_result = _call_llm(messages)

    if llm_result is None:
        # Structured fallback
        llm_result = _build_fallback_rca(asset_id, incident_id, chunks, graph_ctx)

    return {
        "asset_id": asset_id,
        "incident_id": incident_id or "IR-2024-047",
        "report": llm_result,
        "sources_consulted": len(chunks),
        "graph_nodes_analysed": len(graph_ctx),
    }


def _build_fallback_rca(asset_id, incident_id, chunks, graph_ctx) -> str:
    inc = incident_id or "IR-2024-047"
    asset = asset_id or "P-101/HE-301"
    return f"""## Root Cause Analysis Report — {inc}

**Asset:** {asset}  **Generated:** IndustrialMind RCA Engine (Static Mode)

---

### 1. INCIDENT SUMMARY
Near-miss incident IR-2024-047 on 07-August-2024 in Ammonia Synthesis Loop Area 3.  
Gas detector GD-303 alarmed at 45 ppm NH3 while Hot Work Permit HWP-2024-089 was active.

### 2. IMMEDIATE CAUSE
HE-301 inlet flange gasket micro-failure causing NH3 release during concurrent hot work activity.

### 3. CONTRIBUTING FACTORS
- **Equipment:** HE-301 inspection overdue by 2 months at time of incident
- **Process:** NH3 trending upward (3→8 ppm) for 48h pre-incident — not flagged
- **Organisational:** No mechanism to cross-reference gas sensor trends with active PTW zones
- **Procurement:** P-101 critical seal spare (John Crane T21) at zero stock (MNC-2024-02)

### 4. ROOT CAUSES (5-WHY)
1. Why did the incident occur? → Hot work near an NH3 accumulation zone
2. Why was hot work active? → PTW issued without checking 48h sensor trend
3. Why wasn't the trend checked? → PTW system has no real-time sensor integration (CNC-2024-01)
4. Why does the gap exist? → HAZOP last updated 2019; 2022 circuit changes not reflected (CNC-2024-02)
5. Why wasn't HAZOP updated? → No formal management-of-change trigger linked to document system

### 5. REGULATORY EXPOSURE
- OISD-116 Clause 12.4 — PTW-sensor cross-reference requirement **VIOLATED**
- OISD-116 Section 18 — Inspection intervals for HE-301 **EXCEEDED**
- Factory Act 1948 Section 41B — HAZOP currency requirement **NOT MET**

### 6. CORRECTIVE ACTIONS
| # | Action | Owner | Due |
|---|--------|-------|-----|
| CA-01 | Replace HE-301 flange gasket | Maintenance | CLOSED |
| CA-02 | Implement PTW-sensor cross-reference system | Digital Safety | 31-Mar-2025 |
| CA-03 | Update HAZOP documentation | Process Engineering | 30-Jun-2025 |
| CA-04 | Procure John Crane T21 seal spares | Procurement | 01-Feb-2025 |

### 7. RECURRENCE PREVENTION
Deploy an intelligent permit-to-work system that automatically cross-references:
- Active gas detector readings (trending, not just threshold) within 15m of work zone
- Concurrent active permits in the same zone
- Equipment inspection overdue status
This is precisely what IndustrialMind's compound risk detection implements.

### 8. LESSONS LEARNED
1. **Sub-threshold trends are the real early warning** — point-in-time tests miss gradual accumulation
2. **Compound hazards require intelligence layers** — no single person can hold all context simultaneously
3. **Documentation currency is a safety issue** — outdated HAZOP creates invisible blind spots

---
> *Configure API key (OPENAI_API_KEY or GROQ_API_KEY) for AI-generated RCA with full natural language analysis.*"""


def generate_lessons_learned() -> dict:
    """Mine all documents for systemic failure patterns."""
    # Retrieve broad context
    queries = [
        "incident near miss failure root cause",
        "compliance gap non-conformance audit finding",
        "maintenance overdue inspection failure equipment",
        "permit work order concurrent hazard",
    ]
    all_chunks = []
    seen_ids = set()
    for q in queries:
        for c in rag_engine.retrieve(q, n_results=4):
            cid = c["metadata"].get("filename", "") + str(c["metadata"].get("chunk_index", ""))
            if cid not in seen_ids:
                seen_ids.add(cid)
                all_chunks.append(c)

    G = kg.get_graph()
    incidents = [(n, d) for n, d in G.nodes(data=True) if d.get("type") == "Incident"]
    compliance = [(n, d) for n, d in G.nodes(data=True) if d.get("type") == "ComplianceFinding"]
    hazards = [(n, d) for n, d in G.nodes(data=True) if d.get("type") == "Hazard"]
    work_orders = [(n, d) for n, d in G.nodes(data=True) if d.get("type") == "WorkOrder" and d.get("status") == "OPEN"]

    context = "\n\n---\n\n".join(
        f"[{c['metadata'].get('filename')} | {c['metadata'].get('doc_type')}]\n{c['content']}"
        for c in all_chunks[:10]
    )

    summary_lines = [
        f"INCIDENTS: {', '.join(n for n, _ in incidents)}",
        "OPEN COMPLIANCE FINDINGS: " + ", ".join(f"{n} [{d.get('severity')}]" for n, d in compliance),
        "ACTIVE HAZARDS: " + ", ".join(f"{n} [Score {d.get('risk_score')}/10]" for n, d in hazards),
        f"OPEN WORK ORDERS: {', '.join(n for n, _ in work_orders)}",
    ]

    messages = [
        {"role": "system", "content": LESSONS_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Analyse the following industrial plant data for systemic failure patterns.\n\n"
                       f"KNOWLEDGE GRAPH SUMMARY:\n" + "\n".join(summary_lines) +
                       f"\n\nDOCUMENT EXTRACTS:\n{context}\n\n"
                       f"Identify 4-6 distinct systemic patterns. For each: name, evidence, systemic reason, risk quantification, recommendation."
        }
    ]

    llm_result = _call_llm(messages, temperature=0.2)
    if llm_result is None:
        llm_result = _build_fallback_lessons()

    # Build structured patterns for the frontend
    static_patterns = [
        {
            "id": "PATTERN-001",
            "title": "Intelligence Gap in Permit-to-Work System",
            "category": "Systemic Safety",
            "severity": "CRITICAL",
            "evidence": ["IR-2024-047", "CNC-2024-01", "HWP-2024-118"],
            "description": "PTW system issues permits based on point-in-time gas tests, not sensor trends. IR-2024-047 shows GD-303 was trending from 3→8 ppm for 48 hours before the alarm — this was not visible to the permit issuer.",
            "risk": "Next NH3 accumulation + hot work concurrence could escalate to Level 3 Emergency (100 ppm) before intervention.",
            "recommendation": "Integrate real-time sensor trending into PTW issuance workflow. Flag any sensor in a zone showing >50% alarm threshold trend over 4h."
        },
        {
            "id": "PATTERN-002",
            "title": "Maintenance Documentation Staleness",
            "category": "Knowledge Management",
            "severity": "HIGH",
            "evidence": ["CNC-2024-02", "DOC-AUDIT"],
            "description": "HAZOP documentation last updated 2019. 2022 circuit modifications to HE-301 are not reflected. This creates an invisible gap where engineers make decisions based on outdated process topology.",
            "risk": "Next HAZOP-guided risk assessment will produce inaccurate risk rankings, potentially missing new hazard pathways created by the 2022 changes.",
            "recommendation": "Mandate a Management of Change (MoC) trigger that auto-flags HAZOP documentation for update whenever a physical process change is approved."
        },
        {
            "id": "PATTERN-003",
            "title": "Critical Spare Parts Supply Chain Failure",
            "category": "Reliability Engineering",
            "severity": "HIGH",
            "evidence": ["MNC-2024-02", "WO-2024-1847", "P-101"],
            "description": "John Crane T21 mechanical seal for P-101 is at zero stock while WO-2024-1847 documents an active seal weep trending upward. A seal failure now means unplanned shutdown with no replacement on-site — 6-week procurement lead time.",
            "risk": "P-101 forced shutdown = ammonia synthesis loop offline = significant production loss + safety incident.",
            "recommendation": "Implement AI-driven minimum stock alerts that cross-reference active work orders and failure trends against spare parts inventory in real-time."
        },
        {
            "id": "PATTERN-004",
            "title": "Concurrent Maintenance Creating Isolation Failure Risk",
            "category": "Work Management",
            "severity": "HIGH",
            "evidence": ["HAZ-002", "WO-2024-1967", "P-101", "V-101A"],
            "description": "WO-2024-1967 (V-101A actuator maintenance) and existing P-101 work orders can be scheduled concurrently without a system-level interlock. V-101A is P-101's primary isolation valve — simultaneous maintenance destroys the isolation boundary.",
            "risk": "If both are worked simultaneously, P-101 cannot be safely isolated for any emergency intervention.",
            "recommendation": "Add a work order dependency check to the CMMS that prevents concurrent scheduling of interdependent isolation points."
        },
        {
            "id": "PATTERN-005",
            "title": "Emergency Preparedness Drift",
            "category": "Safety Culture",
            "severity": "MAJOR",
            "evidence": ["MNC-2024-04", "MNC-2024-03"],
            "description": "NH3 release drill last conducted 18 months ago (annual requirement). 2 of 4 NDT contractors lack valid site induction. Both indicate that periodic safety obligations are drifting without a systematic tracking system.",
            "risk": "In an actual NH3 release, team response time and effectiveness will be degraded due to unfamiliarity with current procedures and plant layout.",
            "recommendation": "Implement automated compliance calendar with escalating alerts for drill schedules, induction renewals, and inspection due dates — integrated with IndustrialMind's compliance engine."
        }
    ]

    return {
        "analysis": llm_result,
        "patterns": static_patterns,
        "total_incidents_analysed": len(incidents),
        "total_compliance_findings": len(compliance),
        "total_open_work_orders": len(work_orders),
    }


def _build_fallback_lessons() -> str:
    return """## Systemic Failure Pattern Analysis — VFC Ammonia Synthesis Loop

*IndustrialMind has identified 5 systemic patterns across incident reports, compliance audits, and work order history.*

---

### Pattern 1: Intelligence Gap in Permit-to-Work (CRITICAL)
**Evidence:** IR-2024-047, CNC-2024-01, HWP-2024-118  
The PTW system creates a snapshot-in-time view of safety conditions at permit issuance. Gas sensor trends (not just threshold alarms) are invisible to permit issuers. This is not a one-off failure — it is a structural gap in how safety state is assessed.

### Pattern 2: Documentation Staleness Cycle (HIGH)
**Evidence:** CNC-2024-02, 2022 circuit modifications not in HAZOP  
Physical changes to plant are not reliably triggering documentation updates. This creates a growing gap between the plant as-designed (documented) and the plant as-operated (actual).

### Pattern 3: Reactive Spare Parts Management (HIGH)
**Evidence:** MNC-2024-02, WO-2024-1847  
Critical spares reach zero stock while active failure trends are already visible in work orders. The procurement and maintenance systems are not sharing data to create predictive reorder triggers.

### Pattern 4: Work Order Isolation Dependency Blindness (HIGH)
**Evidence:** HAZ-002, WO-2024-1967  
The CMMS schedules work orders without checking isolation dependencies between related equipment. This creates compound physical risk that is invisible until someone cross-checks manually — which rarely happens.

### Pattern 5: Periodic Safety Obligation Drift (MAJOR)
**Evidence:** MNC-2024-03, MNC-2024-04  
Emergency drills and contractor inductions are falling behind annual requirements. This represents a slow erosion of emergency preparedness that compounds over time.

---
> *Configure API key for AI-generated pattern analysis with full natural language synthesis.*"""


def get_maintenance_intelligence() -> dict:
    """Generate predictive maintenance recommendations from work orders and failure history."""
    G = kg.get_graph()

    assets = []
    for node_id, data in G.nodes(data=True):
        if data.get("type") != "Equipment":
            continue
        open_wos = [
            {"id": t, "desc": G.nodes[t].get("description",""), "priority": G.nodes[t].get("priority",""), "due": G.nodes[t].get("due_date","")}
            for _, t, d in G.out_edges(node_id, data=True)
            if d.get("relation") == "HAS_OPEN_WO"
        ]
        hazards_linked = [s for s, t, d in G.in_edges(node_id, data=True) if G.nodes[s].get("type") == "Hazard"]
        incidents_linked = [s for s, t, d in G.in_edges(node_id, data=True) if d.get("relation") in ("INVOLVED_ASSET", "DETECTED_BY")]

        risk_score = 0
        if data.get("status") == "OVERDUE_INSPECTION":
            risk_score += 4
        elif data.get("status") == "OPEN_ISSUES":
            risk_score += 3
        elif data.get("status") == "PENDING_MAINTENANCE":
            risk_score += 2
        risk_score += len(open_wos) * 1.5
        risk_score += len(hazards_linked) * 2
        risk_score = min(round(risk_score, 1), 10.0)

        assets.append({
            "id": node_id,
            "label": data.get("label", node_id),
            "type": data.get("subtype", data.get("type", "")),
            "status": data.get("status", "UNKNOWN"),
            "criticality": data.get("criticality", "MEDIUM"),
            "area": data.get("area", ""),
            "last_maintained": data.get("last_maintained", "N/A"),
            "next_due": data.get("next_due", "N/A"),
            "open_work_orders": open_wos,
            "linked_hazards": hazards_linked,
            "linked_incidents": incidents_linked,
            "maintenance_risk_score": risk_score,
        })

    assets.sort(key=lambda x: -x["maintenance_risk_score"])

    # Schedule summary
    schedule = [
        {"week": "This Week", "assets": ["HE-301"], "actions": ["WO-2024-1801: Flange gasket replacement", "WO-2024-1955: NDT wall thickness inspection"], "risk": "HIGH"},
        {"week": "Next 2 Weeks", "assets": ["P-101"], "actions": ["WO-2024-1847: Seal weep — monitor + prepare T21 replacement", "WO-2024-1901: Suction strainer cleaning"], "risk": "MEDIUM"},
        {"week": "By End of Feb", "assets": ["V-101A", "P-101"], "actions": ["WO-2024-1967: Actuator maintenance (NOT concurrent with P-101 work)", "Annual inspection due March — pre-work preparation"], "risk": "MEDIUM"},
    ]

    return {
        "assets": assets,
        "maintenance_schedule": schedule,
        "total_assets": len(assets),
        "overdue_count": sum(1 for a in assets if a["status"] == "OVERDUE_INSPECTION"),
        "high_risk_count": sum(1 for a in assets if a["maintenance_risk_score"] >= 6),
    }
