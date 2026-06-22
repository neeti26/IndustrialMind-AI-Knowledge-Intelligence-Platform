const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// API types
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
