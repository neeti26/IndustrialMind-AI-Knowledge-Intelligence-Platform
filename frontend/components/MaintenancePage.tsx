"use client";
import { useEffect, useState } from "react";
import {
  Wrench, Loader2, AlertTriangle, Clock, CheckCircle,
  TrendingUp, BarChart3, Calendar, ChevronDown, ChevronUp, Target
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, PieChart, Pie
} from "recharts";
import { apiGet, apiPost, type MaintenanceResponse, type AssetMaintenance, type RCAResponse } from "@/lib/api";
import ReactMarkdown from "react-markdown";

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  OVERDUE_INSPECTION:   { label: "Overdue",  color: "text-red-400",    bg: "bg-red-400/10 border-red-400/30" },
  OPEN_ISSUES:          { label: "Issues",   color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30" },
  PENDING_MAINTENANCE:  { label: "Pending",  color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30" },
  OK:                   { label: "OK",       color: "text-green-400",  bg: "bg-green-400/10 border-green-400/30" },
};

const RISK_CHART_DATA = [
  { name: "HE-301", score: 8.5, fill: "#ef4444" },
  { name: "P-101",  score: 7.0, fill: "#f59e0b" },
  { name: "V-101A", score: 4.5, fill: "#f97316" },
  { name: "P-103",  score: 2.0, fill: "#10b981" },
  { name: "GD-303", score: 1.0, fill: "#10b981" },
  { name: "V-101B", score: 0.5, fill: "#10b981" },
];

const WORK_ORDER_TREND = [
  { month: "Jul", open: 2, closed: 5 },
  { month: "Aug", open: 4, closed: 3 },
  { month: "Sep", open: 3, closed: 4 },
  { month: "Oct", open: 5, closed: 2 },
  { month: "Nov", open: 4, closed: 3 },
  { month: "Dec", open: 5, closed: 2 },
];

const COMPLIANCE_TREND = [
  { month: "Q1", score: 82 },
  { month: "Q2", score: 79 },
  { month: "Q3", score: 76 },
  { month: "Q4 (proj)", score: 71 },
];

const STATIC_SCHEDULE = [
  { week: "This Week",   assets: ["HE-301"], actions: ["WO-2024-1801: Flange gasket replacement", "WO-2024-1955: NDT wall thickness inspection"], risk: "HIGH" },
  { week: "Next 2 Weeks", assets: ["P-101"], actions: ["WO-2024-1847: Seal weep monitor + prepare T21 replacement", "WO-2024-1901: Suction strainer cleaning"], risk: "MEDIUM" },
  { week: "By End of Feb", assets: ["V-101A", "P-101"], actions: ["WO-2024-1967: Actuator maint (NOT concurrent with P-101)", "Annual inspection due March — pre-work prep"], risk: "MEDIUM" },
];

function AssetCard({ asset, onRCA }: { asset: AssetMaintenance; onRCA: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const s = STATUS_STYLE[asset.status] || STATUS_STYLE.OK;
  const riskColor = asset.maintenance_risk_score >= 7 ? "text-red-400" : asset.maintenance_risk_score >= 4 ? "text-amber-400" : "text-green-400";

  return (
    <div className={`glass rounded-xl border ${s.bg} overflow-hidden`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-white/10">
          <Wrench className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-white">{asset.id}</span>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${s.bg} ${s.color}`}>{s.label}</span>
            {asset.criticality === "SAFETY_CRITICAL" && (
              <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20">SAFETY CRITICAL</span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate">{asset.label} · {asset.type}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className={`text-lg font-black ${riskColor}`}>{asset.maintenance_risk_score}</p>
            <p className="text-[9px] text-slate-500">/10 risk</p>
          </div>
          {asset.open_work_orders.length > 0 && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-1 rounded border border-amber-400/20">
              {asset.open_work_orders.length} WO
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-[9px] uppercase text-slate-500">Area</p>
              <p className="text-slate-300">{asset.area || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-slate-500">Last Maintained</p>
              <p className="text-slate-300">{asset.last_maintained}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase text-slate-500">Next Due</p>
              <p className={asset.next_due === "N/A" ? "text-slate-500" : asset.next_due < "2025-02-01" ? "text-red-400 font-bold" : "text-slate-300"}>
                {asset.next_due}
              </p>
            </div>
          </div>

          {asset.open_work_orders.length > 0 && (
            <div>
              <p className="text-[9px] uppercase text-slate-500 mb-1.5">Open Work Orders</p>
              <div className="space-y-1.5">
                {asset.open_work_orders.map(wo => (
                  <div key={wo.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/3 border border-white/5">
                    <span className="text-[10px] font-mono text-amber-400 shrink-0">{wo.id}</span>
                    <span className="text-[11px] text-slate-300 flex-1 truncate">{wo.desc}</span>
                    <span className={`text-[10px] font-bold shrink-0 ${wo.priority === "HIGH" ? "text-red-400" : wo.priority === "MEDIUM" ? "text-amber-400" : "text-slate-400"}`}>
                      {wo.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {asset.linked_hazards.length > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">Linked hazards: {asset.linked_hazards.join(", ")}</p>
            </div>
          )}

          <button
            onClick={() => onRCA(asset.id)}
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-400/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Target className="w-3 h-3" />
            Run RCA on {asset.id}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MaintenancePage() {
  const [data, setData] = useState<MaintenanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [rcaAsset, setRcaAsset] = useState<string | null>(null);
  const [rcaResult, setRcaResult] = useState<string | null>(null);
  const [rcaLoading, setRcaLoading] = useState(false);

  const schedule = data?.maintenance_schedule || STATIC_SCHEDULE;
  const assets = data?.assets || [];

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiGet<MaintenanceResponse>("/intelligence/maintenance");
      setData(result);
    } catch {
      // static fallback already rendered
    } finally {
      setLoading(false);
    }
  };

  const runRCA = async (assetId: string) => {
    setRcaAsset(assetId);
    setRcaLoading(true);
    setRcaResult(null);
    try {
      const result = await apiPost<RCAResponse>("/intelligence/rca", { asset_id: assetId });
      setRcaResult(result.report);
    } catch {
      setRcaResult(`**RCA for ${assetId}**\n\nBackend not connected. In live mode, this performs a full Root Cause Analysis using maintenance history, incident records, and regulatory context for ${assetId}.\n\nConnect backend at \`http://localhost:8000\` with API key configured.`);
    } finally {
      setRcaLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const overdueCount = data?.overdue_count ?? 1;
  const highRiskCount = data?.high_risk_count ?? 2;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Maintenance Intelligence</h2>
          <p className="text-slate-400 text-sm mt-1">
            Predictive maintenance, RCA agent, risk-ranked asset registry
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Overdue Inspections", value: overdueCount, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
          { label: "High Risk Assets", value: highRiskCount, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
          { label: "Open Work Orders", value: 5, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
          { label: "Assets Monitored", value: data?.total_assets ?? 6, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
        ].map(c => (
          <div key={c.label} className={`glass rounded-xl p-4 border ${c.bg}`}>
            <p className="text-xs text-slate-400 mb-1">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Asset Risk Scores */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Asset Maintenance Risk Scores</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={RISK_CHART_DATA} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(v) => [`${v ?? 0}/10`, "Risk Score"]}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {RISK_CHART_DATA.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Work Order Trend */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Work Order Trend (Jul–Dec 2024)</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={WORK_ORDER_TREND} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="open" name="Open WOs" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="closed" name="Closed WOs" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />Open</div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Closed</div>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Optimised Maintenance Schedule</h3>
        </div>
        <div className="space-y-3">
          {schedule.map((s, i) => (
            <div key={i} className={`p-4 rounded-xl border ${s.risk === "HIGH" ? "border-red-400/30 bg-red-400/5" : "border-amber-400/20 bg-amber-400/5"}`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className={`w-4 h-4 ${s.risk === "HIGH" ? "text-red-400" : "text-amber-400"}`} />
                <span className={`text-sm font-bold ${s.risk === "HIGH" ? "text-red-400" : "text-amber-400"}`}>{s.week}</span>
                <div className="flex gap-1 ml-2">
                  {s.assets.map(a => (
                    <span key={a} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">{a}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                {s.actions.map((a, j) => (
                  <div key={j} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-slate-600 mt-0.5">•</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Registry */}
      {assets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-amber-400" />
            Risk-Ranked Asset Registry
          </h3>
          <div className="space-y-3">
            {assets.map(a => (
              <AssetCard key={a.id} asset={a} onRCA={runRCA} />
            ))}
          </div>
        </div>
      )}

      {/* RCA Panel */}
      {rcaAsset && (
        <div className="glass rounded-xl p-5 border border-violet-400/20">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Root Cause Analysis — {rcaAsset}</h3>
            {rcaLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400 ml-auto" />}
          </div>
          {rcaLoading ? (
            <p className="text-xs text-slate-500 animate-pulse">Running RCA engine — analysing failure history, work orders, and regulatory context...</p>
          ) : rcaResult ? (
            <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{rcaResult}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
