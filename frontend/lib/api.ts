// Use Next.js API proxy route in production (avoids CORS, works on Vercel)
// Falls back to direct backend URL in development
const isServer = typeof window === "undefined";
const DIRECT_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getBaseUrl(): string {
  if (isServer) return DIRECT_URL;
  // In browser: use the Next.js proxy route
  return "/api/proxy";
}

export async function apiGet<T>(path: string): Promise<T> {
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const base = getBaseUrl();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── API Response Types ─────────────────────────────────────────────────────

export interface QueryResponse {
  answer: string;
  sources: Array<{
    filename: string;
    doc_type: string;
    asset_tag: string;
    relevance_score: number;
  }>;
  graph_context: string[];
  risk_alerts: Array<{
    id: string;
    label: string;
    description: string;
    severity: string;
    risk_score: number;
  }>;
  confidence: number;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    color: string;
    data: Record<string, unknown>;
  }>;
  links: Array<{
    source: string;
    target: string;
    relation: string;
    label: string;
  }>;
}

export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  node_types: Record<string, number>;
  open_work_orders: number;
  critical_compliance_gaps: number;
  active_hazards: number;
}

export interface ComplianceResponse {
  summary: string;
  gaps: Array<{
    id: string;
    severity: string;
    description: string;
    regulation: string;
    target_date: string;
    status: string;
  }>;
  critical_count: number;
  major_count: number;
  total_open: number;
}

export interface HazardItem {
  id: string;
  label: string;
  description: string;
  severity: string;
  likelihood: string;
  risk_score: number;
  involved_entities: string[];
}

export interface AssetMaintenance {
  id: string;
  label: string;
  type: string;
  status: string;
  criticality: string;
  area: string;
  last_maintained: string;
  next_due: string;
  open_work_orders: Array<{ id: string; desc: string; priority: string; due: string }>;
  linked_hazards: string[];
  linked_incidents: string[];
  maintenance_risk_score: number;
}

export interface MaintenanceResponse {
  assets: AssetMaintenance[];
  maintenance_schedule: Array<{
    week: string;
    assets: string[];
    actions: string[];
    risk: string;
  }>;
  total_assets: number;
  overdue_count: number;
  high_risk_count: number;
}

export interface LessonsPattern {
  id: string;
  title: string;
  category: string;
  severity: string;
  evidence: string[];
  description: string;
  risk: string;
  recommendation: string;
}

export interface LessonsResponse {
  analysis: string;
  patterns: LessonsPattern[];
  total_incidents_analysed: number;
  total_compliance_findings: number;
  total_open_work_orders: number;
}

export interface RCAResponse {
  asset_id: string | null;
  incident_id: string;
  report: string;
  sources_consulted: number;
  graph_nodes_analysed: number;
}
