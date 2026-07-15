"""
Knowledge Graph Service
Builds and queries a NetworkX-based knowledge graph from extracted entities.
Nodes: Equipment, Document, Regulation, Person, WorkOrder, Incident, Hazard
Edges: MAINTAINED_BY, COVERED_BY, REFERENCES, CAUSED_BY, LINKED_TO, etc.
"""
import json
import networkx as nx
from typing import Optional
import os

# Singleton graph instance
_graph: Optional[nx.DiGraph] = None


def get_graph() -> nx.DiGraph:
    global _graph
    if _graph is None:
        _graph = _build_static_graph()
    return _graph


def reset_graph():
    global _graph
    _graph = None


def _build_static_graph() -> nx.DiGraph:
    """
    Build the knowledge graph from the seeded industrial documents.
    In production this would be auto-extracted via NLP — here we seed it
    with domain-accurate relationships derived from the documents.
    """
    G = nx.DiGraph()

    # ── EQUIPMENT NODES ──────────────────────────────────────────────────────
    G.add_node("P-101", type="Equipment", label="Pump P-101",
               subtype="Centrifugal Pump", criticality="HIGH",
               area="Ammonia Synthesis Loop", plant="VFC",
               last_maintained="2024-12-01", next_due="2025-03-01",
               status="OPEN_ISSUES")

    G.add_node("P-103", type="Equipment", label="Pump P-103",
               subtype="Centrifugal Pump", criticality="HIGH",
               area="Ammonia Synthesis Loop", plant="VFC",
               last_maintained="2024-08-07", status="OK")

    G.add_node("HE-301", type="Equipment", label="Heat Exchanger HE-301",
               subtype="Shell & Tube Heat Exchanger", criticality="HIGH",
               area="Ammonia Synthesis Loop Area 3", plant="VFC",
               last_maintained="2024-08-14", next_due="2025-01-15",
               status="OVERDUE_INSPECTION")

    G.add_node("GD-303", type="Equipment", label="Gas Detector GD-303",
               subtype="NH3 Detector", criticality="SAFETY_CRITICAL",
               area="Area 3", plant="VFC",
               last_calibrated="2024-12-15", status="OK")

    G.add_node("V-101A", type="Equipment", label="Isolation Valve V-101A",
               subtype="Gate Valve", criticality="MEDIUM",
               area="Ammonia Synthesis Loop", plant="VFC", status="PENDING_MAINTENANCE")

    G.add_node("V-101B", type="Equipment", label="Isolation Valve V-101B",
               subtype="Gate Valve", criticality="MEDIUM",
               area="Ammonia Synthesis Loop", plant="VFC", status="OK")

    # ── WORK ORDER NODES ─────────────────────────────────────────────────────
    G.add_node("WO-2024-1847", type="WorkOrder", label="WO-2024-1847",
               description="P-101 seal weep — monitor", status="OPEN",
               priority="MEDIUM", due_date="2025-02-15",
               asset="P-101")

    G.add_node("WO-2024-1901", type="WorkOrder", label="WO-2024-1901",
               description="P-101 suction strainer fouling", status="OPEN",
               priority="MEDIUM", due_date="2025-02-10",
               asset="P-101")

    G.add_node("WO-2024-1801", type="WorkOrder", label="WO-2024-1801",
               description="HE-301 flange gasket replacement", status="OPEN",
               priority="HIGH", due_date="2025-01-05",
               asset="HE-301")

    G.add_node("WO-2024-1955", type="WorkOrder", label="WO-2024-1955",
               description="HE-301 wall thickness NDT inspection", status="OPEN",
               priority="HIGH", due_date="2025-01-15",
               asset="HE-301")

    G.add_node("WO-2024-1967", type="WorkOrder", label="WO-2024-1967",
               description="V-101A actuator maintenance", status="OPEN",
               priority="LOW", due_date="2025-02-28",
               asset="V-101A")

    # ── INCIDENT NODES ───────────────────────────────────────────────────────
    G.add_node("IR-2024-047", type="Incident", label="Near-Miss IR-2024-047",
               date="2024-08-07", classification="Near-Miss High Potential",
               location="Area 3", assets_involved="P-103,HE-301,GD-303",
               root_cause="Compound hazard: NH3 accumulation + active hot work permit",
               status="CORRECTIVE_ACTIONS_OPEN")

    # ── PERMIT NODES ─────────────────────────────────────────────────────────
    G.add_node("HWP-2024-089", type="Permit", label="Hot Work Permit HWP-2024-089",
               type_permit="Hot Work", status="CLOSED", date="2024-08-07",
               area="Area 3")

    G.add_node("HWP-2024-118", type="Permit", label="Hot Work Permit HWP-2024-118",
               type_permit="Hot Work", status="ACTIVE", date="2024-12-20",
               area="Area 3 — HE-301")

    G.add_node("EWP-2024-201", type="Permit", label="Electrical Work Permit EWP-2024-201",
               type_permit="Electrical", status="ACTIVE", date="2024-12-18",
               area="MCC-3")

    # ── REGULATORY NODES ─────────────────────────────────────────────────────
    G.add_node("OISD-116-S7", type="Regulation", label="OISD-116 Section 7",
               standard="OISD-116", section="7",
               title="Safety in Rotating Equipment Operations")

    G.add_node("OISD-116-S12", type="Regulation", label="OISD-116 Section 12",
               standard="OISD-116", section="12",
               title="Hot Work Permit System")

    G.add_node("OISD-116-S18", type="Regulation", label="OISD-116 Section 18",
               standard="OISD-116", section="18",
               title="Inspection and Testing")

    G.add_node("FACTORY-ACT-41B", type="Regulation", label="Factory Act 1948 S.41B",
               standard="Factory Act 1948", section="41B",
               title="Hazard Identification and Risk Assessment")

    # ── HAZARD NODES ─────────────────────────────────────────────────────────
    G.add_node("HAZ-001", type="Hazard", label="NH3 Accumulation + Hot Work",
               description="Compound: elevated NH3 + concurrent hot work permit",
               severity="CRITICAL", likelihood="MEDIUM",
               risk_score=8.5)

    G.add_node("HAZ-002", type="Hazard", label="P-101 Dual Isolation Failure",
               description="Simultaneous maintenance on P-101 and V-101A",
               severity="HIGH", likelihood="LOW",
               risk_score=6.0)

    G.add_node("HAZ-003", type="Hazard", label="P-101 Seal Failure + Overdue Spare",
               description="Seal weep trending up + zero stock of critical seal spare",
               severity="HIGH", likelihood="MEDIUM",
               risk_score=7.5)

    # ── COMPLIANCE FINDING NODES ─────────────────────────────────────────────
    G.add_node("CNC-2024-01", type="ComplianceFinding", label="CNC-2024-01",
               severity="CRITICAL", status="OPEN",
               description="No PTW-sensor cross-reference mechanism",
               regulation="OISD-116 Clause 12.4, 12.5",
               target_date="2025-03-31")

    G.add_node("CNC-2024-02", type="ComplianceFinding", label="CNC-2024-02",
               severity="CRITICAL", status="OPEN",
               description="HAZOP documentation 5 years out of date",
               regulation="Factory Act 1948 S.41B, OISD-105 Clause 4.2",
               target_date="2025-06-30")

    G.add_node("MNC-2024-02", type="ComplianceFinding", label="MNC-2024-02",
               severity="MAJOR", status="OPEN",
               description="P-101 critical seal spare at zero stock",
               regulation="OISD best practice",
               target_date="2025-02-01")

    # ── DOCUMENT NODES ───────────────────────────────────────────────────────
    G.add_node("DOC-MP-P101", type="Document", label="Maintenance Procedure P-101",
               filename="maintenance_procedure_P101.txt",
               doc_type="Maintenance Procedure")

    G.add_node("DOC-IR-047", type="Document", label="Incident Report IR-2024-047",
               filename="incident_report_IR2024_047.txt",
               doc_type="Incident Report")

    G.add_node("DOC-OISD116", type="Document", label="OISD-116 Extract",
               filename="oisd_116_extract.txt",
               doc_type="Regulatory Standard")

    G.add_node("DOC-WO-LOG", type="Document", label="Work Order Log",
               filename="work_orders_log.txt",
               doc_type="Work Order Log")

    G.add_node("DOC-AUDIT", type="Document", label="Compliance Audit Q3-2024",
               filename="regulatory_compliance_audit.txt",
               doc_type="Compliance Audit")

    # ── EDGES ─────────────────────────────────────────────────────────────────
    # Equipment → WorkOrder
    G.add_edge("P-101", "WO-2024-1847", relation="HAS_OPEN_WO")
    G.add_edge("P-101", "WO-2024-1901", relation="HAS_OPEN_WO")
    G.add_edge("HE-301", "WO-2024-1801", relation="HAS_OPEN_WO")
    G.add_edge("HE-301", "WO-2024-1955", relation="HAS_OPEN_WO")
    G.add_edge("V-101A", "WO-2024-1967", relation="HAS_OPEN_WO")

    # Incident → Equipment
    G.add_edge("IR-2024-047", "P-103", relation="INVOLVED_ASSET")
    G.add_edge("IR-2024-047", "HE-301", relation="INVOLVED_ASSET")
    G.add_edge("IR-2024-047", "GD-303", relation="DETECTED_BY")
    G.add_edge("IR-2024-047", "HWP-2024-089", relation="CONCURRENT_PERMIT")

    # Permit → Equipment
    G.add_edge("HWP-2024-118", "HE-301", relation="COVERS_WORK_ON")
    G.add_edge("EWP-2024-201", "V-101A", relation="NEAR_AREA")

    # Equipment → Equipment (spatial/functional)
    G.add_edge("P-101", "V-101A", relation="ISOLATED_BY")
    G.add_edge("P-101", "V-101B", relation="ISOLATED_BY")
    G.add_edge("P-101", "HE-301", relation="FEEDS_INTO")

    # Equipment → Regulation
    G.add_edge("P-101", "OISD-116-S7", relation="GOVERNED_BY")
    G.add_edge("HE-301", "OISD-116-S18", relation="GOVERNED_BY")
    G.add_edge("HWP-2024-118", "OISD-116-S12", relation="GOVERNED_BY")

    # Hazard → Equipment
    G.add_edge("HAZ-001", "HE-301", relation="INVOLVES")
    G.add_edge("HAZ-001", "GD-303", relation="DETECTED_BY")
    G.add_edge("HAZ-001", "HWP-2024-118", relation="RISK_FACTOR")
    G.add_edge("HAZ-002", "P-101", relation="INVOLVES")
    G.add_edge("HAZ-002", "V-101A", relation="INVOLVES")
    G.add_edge("HAZ-003", "P-101", relation="INVOLVES")
    G.add_edge("HAZ-003", "WO-2024-1847", relation="LINKED_TO")
    G.add_edge("HAZ-003", "MNC-2024-02", relation="AMPLIFIED_BY")

    # Compliance → Regulation
    G.add_edge("CNC-2024-01", "OISD-116-S12", relation="VIOLATES")
    G.add_edge("CNC-2024-02", "FACTORY-ACT-41B", relation="VIOLATES")

    # Incident → Compliance Finding
    G.add_edge("IR-2024-047", "CNC-2024-01", relation="TRIGGERED")

    # Document → Entity
    G.add_edge("DOC-MP-P101", "P-101", relation="DESCRIBES")
    G.add_edge("DOC-MP-P101", "OISD-116-S7", relation="REFERENCES")
    G.add_edge("DOC-IR-047", "IR-2024-047", relation="DOCUMENTS")
    G.add_edge("DOC-IR-047", "HE-301", relation="REFERENCES")
    G.add_edge("DOC-IR-047", "CNC-2024-01", relation="IDENTIFIES")
    G.add_edge("DOC-OISD116", "OISD-116-S7", relation="CONTAINS")
    G.add_edge("DOC-OISD116", "OISD-116-S12", relation="CONTAINS")
    G.add_edge("DOC-OISD116", "OISD-116-S18", relation="CONTAINS")
    G.add_edge("DOC-WO-LOG", "WO-2024-1847", relation="CONTAINS")
    G.add_edge("DOC-WO-LOG", "WO-2024-1801", relation="CONTAINS")
    G.add_edge("DOC-WO-LOG", "WO-2024-1955", relation="CONTAINS")
    G.add_edge("DOC-AUDIT", "CNC-2024-01", relation="DOCUMENTS")
    G.add_edge("DOC-AUDIT", "CNC-2024-02", relation="DOCUMENTS")
    G.add_edge("DOC-AUDIT", "MNC-2024-02", relation="DOCUMENTS")

    return G


def graph_to_vis_format(G: nx.DiGraph) -> dict:
    """Convert graph to format consumable by react-force-graph-2d."""
    COLOR_MAP = {
        "Equipment": "#3b82f6",
        "WorkOrder": "#f59e0b",
        "Incident": "#ef4444",
        "Permit": "#8b5cf6",
        "Regulation": "#10b981",
        "Hazard": "#f97316",
        "ComplianceFinding": "#ec4899",
        "Document": "#6b7280",
    }

    nodes = []
    for node_id, data in G.nodes(data=True):
        node_type = data.get("type", "Unknown")
        nodes.append({
            "id": node_id,
            "label": data.get("label", node_id),
            "type": node_type,
            "color": COLOR_MAP.get(node_type, "#94a3b8"),
            "data": {k: v for k, v in data.items()}
        })

    links = []
    for source, target, data in G.edges(data=True):
        links.append({
            "source": source,
            "target": target,
            "relation": data.get("relation", "RELATED_TO"),
            "label": data.get("relation", ""),
        })

    return {"nodes": nodes, "links": links}


def get_subgraph_for_asset(asset_id: str, depth: int = 2) -> dict:
    """Return subgraph centered on a specific asset up to N hops."""
    G = get_graph()
    if asset_id not in G:
        return {"nodes": [], "links": []}

    # BFS to collect neighbors
    nodes_in_subgraph = {asset_id}
    frontier = {asset_id}
    for _ in range(depth):
        next_frontier = set()
        for node in frontier:
            next_frontier.update(G.predecessors(node))
            next_frontier.update(G.successors(node))
        nodes_in_subgraph.update(next_frontier)
        frontier = next_frontier

    subgraph = G.subgraph(nodes_in_subgraph)
    return graph_to_vis_format(subgraph)


def get_compliance_gaps() -> list[dict]:
    """Return all open compliance findings with their regulatory links."""
    G = get_graph()
    gaps = []
    for node_id, data in G.nodes(data=True):
        if data.get("type") == "ComplianceFinding" and data.get("status") == "OPEN":
            linked_regs = [
                t for s, t, d in G.out_edges(node_id, data=True)
                if d.get("relation") == "VIOLATES"
            ]
            linked_assets = [
                s for s, t, d in G.in_edges(node_id, data=True)
            ]
            gaps.append({
                "id": node_id,
                "severity": data.get("severity"),
                "description": data.get("description"),
                "regulation": data.get("regulation"),
                "target_date": data.get("target_date"),
                "status": data.get("status"),
                "linked_regulations": linked_regs,
                "linked_to": linked_assets,
            })
    gaps.sort(key=lambda x: 0 if x["severity"] == "CRITICAL" else 1)
    return gaps


def get_active_hazards() -> list[dict]:
    """Return active compound hazards with full relationship context."""
    G = get_graph()
    hazards = []
    for node_id, data in G.nodes(data=True):
        if data.get("type") == "Hazard":
            involved = [
                t for s, t, d in G.out_edges(node_id, data=True)
            ]
            hazards.append({
                "id": node_id,
                "label": data.get("label"),
                "description": data.get("description"),
                "severity": data.get("severity"),
                "likelihood": data.get("likelihood"),
                "risk_score": data.get("risk_score"),
                "involved_entities": involved,
            })
    hazards.sort(key=lambda x: -x.get("risk_score", 0))
    return hazards


def get_graph_stats() -> dict:
    G = get_graph()
    type_counts: dict = {}
    for _, data in G.nodes(data=True):
        t = data.get("type", "Unknown")
        type_counts[t] = type_counts.get(t, 0) + 1
    return {
        "total_nodes": G.number_of_nodes(),
        "total_edges": G.number_of_edges(),
        "node_types": type_counts,
        "open_work_orders": sum(
            1 for _, d in G.nodes(data=True)
            if d.get("type") == "WorkOrder" and d.get("status") == "OPEN"
        ),
        "critical_compliance_gaps": sum(
            1 for _, d in G.nodes(data=True)
            if d.get("type") == "ComplianceFinding"
            and d.get("status") == "OPEN"
            and d.get("severity") == "CRITICAL"
        ),
        "active_hazards": sum(
            1 for _, d in G.nodes(data=True) if d.get("type") == "Hazard"
        ),
    }


def build_graph_from_corpus(documents_dir: Optional[str] = None) -> nx.DiGraph:
    """Build a knowledge graph automatically from extracted entities in the documents directory.

    This is a light-weight constructor: it creates Document nodes and entity nodes
    for equipment, work orders, incidents, regulations and links them with `CONTAINS`/`DESCRIBES` edges.
    """
    docs_dir = documents_dir or os.path.join(os.path.dirname(__file__), "../data/documents")
    G = nx.DiGraph()
    try:
        from app.services import document_processor, entity_extractor
    except Exception:
        return G

    for fname in os.listdir(docs_dir):
        if not fname.endswith((".txt", ".pdf")) or fname == "metadata.json":
            continue
        fpath = os.path.join(docs_dir, fname)
        text = document_processor.read_text(fpath)
        entities = document_processor.extract_entities_from_text(text, entity_extractor, source=fname)

        # Document node
        doc_node = f"DOC-{Path(fname).stem}"
        G.add_node(doc_node, type="Document", label=Path(fname).stem, filename=fname, doc_type=entities.get("doc_type"))

        # Equipment
        for eq in entities.get("equipment_tags", []):
            if not G.has_node(eq):
                G.add_node(eq, type="Equipment", label=eq)
            G.add_edge(doc_node, eq, relation="DESCRIBES")

        # Work Orders
        for wo in entities.get("work_orders", []):
            if not G.has_node(wo):
                G.add_node(wo, type="WorkOrder", label=wo)
            G.add_edge(doc_node, wo, relation="CONTAINS")

        # Incidents
        for ir in entities.get("incident_ids", []):
            if not G.has_node(ir):
                G.add_node(ir, type="Incident", label=ir)
            G.add_edge(doc_node, ir, relation="DOCUMENTS")

        # Regulations & compliance ids
        for reg in entities.get("regulations", []):
            nid = reg if len(reg) < 40 else f"REG-{hash(reg) % 100000}"
            if not G.has_node(nid):
                G.add_node(nid, type="Regulation", label=reg)
            G.add_edge(doc_node, nid, relation="REFERENCES")

        for cid in entities.get("compliance_ids", []) + entities.get("permit_ids", []):
            if not G.has_node(cid):
                G.add_node(cid, type="ComplianceFinding", label=cid)
            G.add_edge(doc_node, cid, relation="IDENTIFIES")

    # Replace singleton graph
    global _graph
    _graph = G
    return G
