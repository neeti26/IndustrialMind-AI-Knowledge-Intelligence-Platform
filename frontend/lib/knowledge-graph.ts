/**
 * Knowledge Graph — Pure TypeScript, runs on Vercel Edge/Node
 * 30 nodes, 42 edges covering VFC Ammonia Synthesis Loop
 */

export type NodeType =
  | "Equipment" | "WorkOrder" | "Incident" | "Permit"
  | "Regulation" | "Hazard" | "ComplianceFinding" | "Document";

export interface KGNode {
  id: string;
  label: string;
  type: NodeType;
  color: string;
  [key: string]: unknown;
}

export interface KGEdge {
  source: string;
  target: string;
  relation: string;
}

export interface GraphData {
  nodes: KGNode[];
  links: KGEdge[];
}

const COLOR: Record<NodeType, string> = {
  Equipment:        "#3b82f6",
  WorkOrder:        "#f59e0b",
  Incident:         "#ef4444",
  Permit:           "#8b5cf6",
  Regulation:       "#10b981",
  Hazard:           "#f97316",
  ComplianceFinding:"#ec4899",
  Document:         "#6b7280",
};

// ── NODES ──────────────────────────────────────────────────────────────────
export const NODES: KGNode[] = [
  // Equipment
  { id:"P-101", label:"Pump P-101", type:"Equipment", color:COLOR.Equipment, subtype:"Centrifugal Pump", criticality:"HIGH", area:"Ammonia Synthesis Loop", last_maintained:"2024-12-01", next_due:"2025-03-01", status:"OPEN_ISSUES" },
  { id:"P-103", label:"Pump P-103", type:"Equipment", color:COLOR.Equipment, subtype:"Centrifugal Pump", criticality:"HIGH", area:"Ammonia Synthesis Loop", last_maintained:"2024-08-07", status:"OK" },
  { id:"HE-301", label:"Heat Exchanger HE-301", type:"Equipment", color:COLOR.Equipment, subtype:"Shell & Tube HX", criticality:"HIGH", area:"Area 3", last_maintained:"2024-08-14", next_due:"2025-01-15", status:"OVERDUE_INSPECTION" },
  { id:"GD-303", label:"Gas Detector GD-303", type:"Equipment", color:COLOR.Equipment, subtype:"NH3 Detector", criticality:"SAFETY_CRITICAL", area:"Area 3", last_calibrated:"2024-12-15", status:"OK" },
  { id:"V-101A", label:"Isolation Valve V-101A", type:"Equipment", color:COLOR.Equipment, subtype:"Gate Valve", criticality:"MEDIUM", area:"Ammonia Loop", status:"PENDING_MAINTENANCE" },
  { id:"V-101B", label:"Isolation Valve V-101B", type:"Equipment", color:COLOR.Equipment, subtype:"Gate Valve", criticality:"MEDIUM", area:"Ammonia Loop", status:"OK" },
  // Work Orders
  { id:"WO-2024-1847", label:"WO-2024-1847", type:"WorkOrder", color:COLOR.WorkOrder, description:"P-101 seal weep — monitor", status:"OPEN", priority:"MEDIUM", due_date:"2025-02-15", asset:"P-101" },
  { id:"WO-2024-1901", label:"WO-2024-1901", type:"WorkOrder", color:COLOR.WorkOrder, description:"P-101 suction strainer fouling", status:"OPEN", priority:"MEDIUM", due_date:"2025-02-10", asset:"P-101" },
  { id:"WO-2024-1801", label:"WO-2024-1801", type:"WorkOrder", color:COLOR.WorkOrder, description:"HE-301 flange gasket replacement", status:"OPEN", priority:"HIGH", due_date:"2025-01-05", asset:"HE-301" },
  { id:"WO-2024-1955", label:"WO-2024-1955", type:"WorkOrder", color:COLOR.WorkOrder, description:"HE-301 wall thickness NDT inspection", status:"OPEN", priority:"HIGH", due_date:"2025-01-15", asset:"HE-301" },
  { id:"WO-2024-1967", label:"WO-2024-1967", type:"WorkOrder", color:COLOR.WorkOrder, description:"V-101A actuator maintenance", status:"OPEN", priority:"LOW", due_date:"2025-02-28", asset:"V-101A" },
  // Incidents
  { id:"IR-2024-047", label:"Near-Miss IR-2024-047", type:"Incident", color:COLOR.Incident, date:"2024-08-07", classification:"Near-Miss High Potential", location:"Area 3", root_cause:"Compound hazard: NH3 accumulation + active hot work permit", status:"CORRECTIVE_ACTIONS_OPEN" },
  // Permits
  { id:"HWP-2024-089", label:"Hot Work Permit HWP-2024-089", type:"Permit", color:COLOR.Permit, permit_type:"Hot Work", status:"CLOSED", date:"2024-08-07", area:"Area 3" },
  { id:"HWP-2024-118", label:"Hot Work Permit HWP-2024-118", type:"Permit", color:COLOR.Permit, permit_type:"Hot Work", status:"ACTIVE", date:"2024-12-20", area:"Area 3 — HE-301" },
  { id:"EWP-2024-201", label:"Electrical Work Permit EWP-2024-201", type:"Permit", color:COLOR.Permit, permit_type:"Electrical", status:"ACTIVE", date:"2024-12-18", area:"MCC-3" },
  // Regulations
  { id:"OISD-116-S7",  label:"OISD-116 Section 7",  type:"Regulation", color:COLOR.Regulation, standard:"OISD-116", section:"7",  title:"Safety in Rotating Equipment Operations" },
  { id:"OISD-116-S12", label:"OISD-116 Section 12", type:"Regulation", color:COLOR.Regulation, standard:"OISD-116", section:"12", title:"Hot Work Permit System" },
  { id:"OISD-116-S18", label:"OISD-116 Section 18", type:"Regulation", color:COLOR.Regulation, standard:"OISD-116", section:"18", title:"Inspection and Testing" },
  { id:"FACTORY-ACT-41B", label:"Factory Act 1948 S.41B", type:"Regulation", color:COLOR.Regulation, standard:"Factory Act 1948", section:"41B", title:"Hazard Identification" },
  // Hazards
  { id:"HAZ-001", label:"NH3 Accumulation + Hot Work", type:"Hazard", color:COLOR.Hazard, description:"Active HWP-2024-118 on HE-301 + GD-303 sub-threshold NH3 trend + CNC-2024-01 gap unresolved", severity:"CRITICAL", likelihood:"MEDIUM", risk_score:8.5, involved_entities:["HE-301","HWP-2024-118","GD-303","CNC-2024-01"] },
  { id:"HAZ-003", label:"P-101 Seal Failure + Zero Spare", type:"Hazard", color:COLOR.Hazard, description:"Seal weep trending up (WO-2024-1847) + John Crane T21 at zero stock (MNC-2024-02). Failure forces unplanned shutdown with no replacement on site", severity:"HIGH", likelihood:"MEDIUM", risk_score:7.5, involved_entities:["P-101","WO-2024-1847","MNC-2024-02"] },
  { id:"HAZ-002", label:"P-101 Dual Isolation Failure", type:"Hazard", color:COLOR.Hazard, description:"Simultaneous maintenance on P-101 and V-101A creates single-point isolation failure — must not occur concurrently", severity:"HIGH", likelihood:"LOW", risk_score:6.0, involved_entities:["P-101","V-101A","WO-2024-1967"] },
  // Compliance Findings
  { id:"CNC-2024-01", label:"CNC-2024-01", type:"ComplianceFinding", color:COLOR.ComplianceFinding, severity:"CRITICAL", status:"OPEN", description:"No PTW-sensor cross-reference — permit issuers rely on point-in-time gas tests, not trends", regulation:"OISD-116 Clause 12.4, 12.5", target_date:"2025-03-31" },
  { id:"CNC-2024-02", label:"CNC-2024-02", type:"ComplianceFinding", color:COLOR.ComplianceFinding, severity:"CRITICAL", status:"OPEN", description:"HAZOP documentation 5 years out of date — 2022 process modifications not reflected", regulation:"Factory Act 1948 S.41B; OISD-105 Clause 4.2", target_date:"2025-06-30" },
  { id:"MNC-2024-02", label:"MNC-2024-02", type:"ComplianceFinding", color:COLOR.ComplianceFinding, severity:"MAJOR", status:"OPEN", description:"P-101 critical seal spare (John Crane T21) at zero stock", regulation:"OISD-116 Section 7.2", target_date:"2025-02-01" },
  { id:"MNC-2024-03", label:"MNC-2024-03", type:"ComplianceFinding", color:COLOR.ComplianceFinding, severity:"MAJOR", status:"OPEN", description:"2 of 4 NDT technicians lack current site induction for HE-301 confined space work", regulation:"OISD-116 Section 22.2; Factory Act 1948", target_date:"2025-01-31" },
  { id:"MNC-2024-04", label:"MNC-2024-04", type:"ComplianceFinding", color:COLOR.ComplianceFinding, severity:"MAJOR", status:"OPEN", description:"Last NH3 release drill in Area 3 was 18 months ago — annual drill overdue", regulation:"Factory Act 1948 — Emergency Preparedness", target_date:"2025-02-28" },
  // Documents
  { id:"DOC-MP-P101",  label:"Maintenance Procedure P-101",  type:"Document", color:COLOR.Document, filename:"maintenance_procedure_P101", doc_type:"Maintenance Procedure" },
  { id:"DOC-IR-047",   label:"Incident Report IR-2024-047",  type:"Document", color:COLOR.Document, filename:"incident_report_IR2024_047", doc_type:"Incident Report" },
  { id:"DOC-OISD116",  label:"OISD-116 Regulatory Extract", type:"Document", color:COLOR.Document, filename:"oisd_116_extract",           doc_type:"Regulatory Standard" },
  { id:"DOC-WO-LOG",   label:"Work Order Log Dec-2024",     type:"Document", color:COLOR.Document, filename:"work_orders_log",             doc_type:"Work Order Log" },
  { id:"DOC-AUDIT",    label:"Compliance Audit Q3-2024",    type:"Document", color:COLOR.Document, filename:"compliance_audit_q3",         doc_type:"Compliance Audit" },
];

// ── EDGES ──────────────────────────────────────────────────────────────────
export const EDGES: KGEdge[] = [
  // Equipment → WorkOrder
  { source:"P-101",  target:"WO-2024-1847", relation:"HAS_OPEN_WO" },
  { source:"P-101",  target:"WO-2024-1901", relation:"HAS_OPEN_WO" },
  { source:"HE-301", target:"WO-2024-1801", relation:"HAS_OPEN_WO" },
  { source:"HE-301", target:"WO-2024-1955", relation:"HAS_OPEN_WO" },
  { source:"V-101A", target:"WO-2024-1967", relation:"HAS_OPEN_WO" },
  // Incident → Assets / Permit
  { source:"IR-2024-047", target:"P-103",        relation:"INVOLVED_ASSET" },
  { source:"IR-2024-047", target:"HE-301",       relation:"INVOLVED_ASSET" },
  { source:"IR-2024-047", target:"GD-303",       relation:"DETECTED_BY" },
  { source:"IR-2024-047", target:"HWP-2024-089", relation:"CONCURRENT_PERMIT" },
  { source:"IR-2024-047", target:"CNC-2024-01",  relation:"TRIGGERED" },
  // Permit → Equipment
  { source:"HWP-2024-118", target:"HE-301",  relation:"COVERS_WORK_ON" },
  { source:"EWP-2024-201", target:"V-101A",  relation:"NEAR_AREA" },
  // Equipment → Equipment
  { source:"P-101", target:"V-101A", relation:"ISOLATED_BY" },
  { source:"P-101", target:"V-101B", relation:"ISOLATED_BY" },
  { source:"P-101", target:"HE-301", relation:"FEEDS_INTO" },
  // Equipment → Regulation
  { source:"P-101",        target:"OISD-116-S7",  relation:"GOVERNED_BY" },
  { source:"HE-301",       target:"OISD-116-S18", relation:"GOVERNED_BY" },
  { source:"HWP-2024-118", target:"OISD-116-S12", relation:"GOVERNED_BY" },
  // Hazard → Entities
  { source:"HAZ-001", target:"HE-301",       relation:"INVOLVES" },
  { source:"HAZ-001", target:"GD-303",       relation:"DETECTED_BY" },
  { source:"HAZ-001", target:"HWP-2024-118", relation:"RISK_FACTOR" },
  { source:"HAZ-001", target:"CNC-2024-01",  relation:"AMPLIFIED_BY" },
  { source:"HAZ-003", target:"P-101",        relation:"INVOLVES" },
  { source:"HAZ-003", target:"WO-2024-1847", relation:"LINKED_TO" },
  { source:"HAZ-003", target:"MNC-2024-02",  relation:"AMPLIFIED_BY" },
  { source:"HAZ-002", target:"P-101",        relation:"INVOLVES" },
  { source:"HAZ-002", target:"V-101A",       relation:"INVOLVES" },
  // Compliance → Regulation
  { source:"CNC-2024-01", target:"OISD-116-S12",    relation:"VIOLATES" },
  { source:"CNC-2024-02", target:"FACTORY-ACT-41B",  relation:"VIOLATES" },
  { source:"MNC-2024-02", target:"OISD-116-S7",      relation:"VIOLATES" },
  // Documents → Entities
  { source:"DOC-MP-P101", target:"P-101",       relation:"DESCRIBES" },
  { source:"DOC-MP-P101", target:"OISD-116-S7", relation:"REFERENCES" },
  { source:"DOC-IR-047",  target:"IR-2024-047", relation:"DOCUMENTS" },
  { source:"DOC-IR-047",  target:"CNC-2024-01", relation:"IDENTIFIES" },
  { source:"DOC-OISD116", target:"OISD-116-S7",  relation:"CONTAINS" },
  { source:"DOC-OISD116", target:"OISD-116-S12", relation:"CONTAINS" },
  { source:"DOC-OISD116", target:"OISD-116-S18", relation:"CONTAINS" },
  { source:"DOC-WO-LOG",  target:"WO-2024-1847", relation:"CONTAINS" },
  { source:"DOC-WO-LOG",  target:"WO-2024-1801", relation:"CONTAINS" },
  { source:"DOC-AUDIT",   target:"CNC-2024-01",  relation:"DOCUMENTS" },
  { source:"DOC-AUDIT",   target:"CNC-2024-02",  relation:"DOCUMENTS" },
  { source:"DOC-AUDIT",   target:"MNC-2024-02",  relation:"DOCUMENTS" },
];

// ── QUERY HELPERS ──────────────────────────────────────────────────────────
export function getGraphData(): GraphData {
  return { nodes: NODES, links: EDGES };
}

export function getStats() {
  const typeCounts: Record<string, number> = {};
  NODES.forEach(n => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });
  return {
    total_nodes: NODES.length,
    total_edges: EDGES.length,
    node_types: typeCounts,
    open_work_orders: NODES.filter(n => n.type === "WorkOrder" && n.status === "OPEN").length,
    critical_compliance_gaps: NODES.filter(n => n.type === "ComplianceFinding" && n.severity === "CRITICAL" && n.status === "OPEN").length,
    active_hazards: NODES.filter(n => n.type === "Hazard").length,
  };
}

export function getComplianceGaps() {
  return NODES
    .filter(n => n.type === "ComplianceFinding" && n.status === "OPEN")
    .map(n => ({
      id: n.id,
      severity: n.severity as string,
      description: n.description as string,
      regulation: n.regulation as string,
      target_date: n.target_date as string,
      status: n.status as string,
    }))
    .sort((a, b) => (a.severity === "CRITICAL" ? -1 : 1));
}

export function getHazards() {
  return NODES
    .filter(n => n.type === "Hazard")
    .map(n => ({
      id: n.id,
      label: n.label,
      description: n.description as string,
      severity: n.severity as string,
      likelihood: n.likelihood as string,
      risk_score: n.risk_score as number,
      involved_entities: n.involved_entities as string[],
    }))
    .sort((a, b) => b.risk_score - a.risk_score);
}

export function getAssetContext(assetId: string): string[] {
  const node = NODES.find(n => n.id === assetId);
  if (!node) return [];
  const openWOs = EDGES
    .filter(e => e.source === assetId && e.relation === "HAS_OPEN_WO")
    .map(e => e.target);
  return [
    `Asset ${assetId} (${node.subtype || node.type}): Status=${node.status}, Last maintained=${node.last_maintained || "N/A"}, Open WOs=${JSON.stringify(openWOs)}`
  ];
}
