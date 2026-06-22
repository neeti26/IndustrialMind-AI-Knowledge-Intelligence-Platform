"use client";
import { useEffect, useState } from "react";
import {
  AlertTriangle, ShieldX, Wrench, Network,
  TrendingUp, FileText, Activity, ArrowRight
} from "lucide-react";
import { apiGet, type GraphStats } from "@/lib/api";
import type { Page } from "@/app/page";

interface Props {
  onNavigate: (p: Page) => void;
}

const ASSET_STATUS = [
  { id: "P-101", name: "Pump P-101", type: "Centrifugal Pump", status: "OPEN_ISSUES", issues: 2, last: "01-Dec-2024" },
  { id: "HE-301", name: "Heat Exchanger HE-301", type: "Shell & Tube", status: "OVERDUE_INSPECTION", issues: 2, last: "07-Aug-2024" },
  { id: "GD-303", name: "Gas Detector GD-303", type: "NH3 Detector", status: "OK", issues: 0, last: "15-Dec-2024" },
  { id: "V-101A", name: "Isolation Valve V-101A", type: "Gate Valve", status: "PENDING_MAINTENANCE", issues: 1, last: "N/A" },
];

const STATUS_STYLE: Record<string, string> = {
  OK: "text-green-400 bg-green-400/10 border-green-400/20",
  OPEN_ISSUES: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  OVERDUE_INSPECTION: "text-red-400 bg-red-400/10 border-red-400/20",
  PENDING_MAINTENANCE: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

export default function Dashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState<GraphStats | null>(null);

  useEffect(() => {
    apiGet<GraphStats>("/graph/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  const statCards = [
    {
      label: "Open Work Orders",
      value: stats?.open_work_orders ?? 5,
      icon: Wrench,
      color: "text-amber-400",
      bg: "bg-amber-400/10 border-amber-400/20",
      trend: "+2 this week",
    },
    {
      label: "Critical Compliance Gaps",
      value: stats?.critical_compliance_gaps ?? 2,
      icon: ShieldX,
      color: "text-red-400",
      bg: "bg-red-400/10 border-red-400/20",
      trend: "Requires immediate action",
    },
    {
      label: "Active Hazards",
      value: stats?.active_hazards ?? 3,
      icon: AlertTriangle,
      color: "text-orange-400",
      bg: "bg-orange-400/10 border-orange-400/20",
      trend: "Compound risks detected",
    },
    {
      label: "Knowledge Nodes",
      value: stats?.total_nodes ?? 28,
      icon: Network,
      color: "text-blue-400",
      bg: "bg-blue-400/10 border-blue-400/20",
      trend: `${stats?.total_edges ?? 35} relationships`,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Operations Intelligence</h2>
          <p className="text-slate-400 text-sm mt-1">
            Visakhapatnam Fertilizer Complex — Real-time AI safety & maintenance overview
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Last synced</p>
          <p className="text-xs text-green-400 font-medium">
            {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} IST
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="glass-strong rounded-xl p-4 border-l-4 border-red-500 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 pulse-alert">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Compound Risk Alert — Area 3</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Active Hot Work Permit HWP-2024-118 (HE-301) overlapping with P-101 seal wear trend
            and zero critical spare stock. OISD-116 Clause 12.4 cross-reference gap unresolved.
          </p>
        </div>
        <button
          onClick={() => onNavigate("risk")}
          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 shrink-0"
        >
          Analyze <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`glass rounded-xl p-4 border ${card.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 font-medium">{card.label}</p>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-[11px] text-slate-500 mt-1">{card.trend}</p>
            </div>
          );
        })}
      </div>

      {/* Asset Status + Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Asset Status */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Critical Asset Status
            </h3>
            <button
              onClick={() => onNavigate("graph")}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              View Graph <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {ASSET_STATUS.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-slate-300">{asset.id.split("-")[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{asset.name}</p>
                  <p className="text-[10px] text-slate-500">{asset.type} · Last: {asset.last}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {asset.issues > 0 && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                      {asset.issues} WO
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${STATUS_STYLE[asset.status]}`}>
                    {asset.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            Quick Intelligence Actions
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              {
                label: "Ask AI Copilot",
                desc: "Query maintenance, procedures, regulations",
                page: "copilot" as Page,
                color: "from-blue-500/20 to-violet-500/20 border-blue-500/30",
                icon: "💬",
              },
              {
                label: "Compliance Gap Report",
                desc: "2 critical gaps open — OISD-116 & Factory Act",
                page: "compliance" as Page,
                color: "from-red-500/20 to-orange-500/20 border-red-500/30",
                icon: "🛡️",
              },
              {
                label: "Risk Scenario Analysis",
                desc: "Model compound hazard scenarios",
                page: "risk" as Page,
                color: "from-orange-500/20 to-amber-500/20 border-orange-500/30",
                icon: "⚡",
              },
              {
                label: "Knowledge Graph Explorer",
                desc: "Navigate 28 entities across 5 document types",
                page: "graph" as Page,
                color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
                icon: "🕸️",
              },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => onNavigate(action.page)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${action.color} border text-left hover:opacity-90 transition-all`}
              >
                <span className="text-xl">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{action.label}</p>
                  <p className="text-[10px] text-slate-400 truncate">{action.desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Score Bar */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            Regulatory Compliance Score — Q3 2024 Audit
          </h3>
          <span className="text-sm font-bold text-amber-400">76%</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "OISD-116", score: 84, color: "bg-green-500" },
            { label: "Factory Act", score: 73, color: "bg-amber-500" },
            { label: "OISD-105", score: 67, color: "bg-red-500" },
            { label: "DGMS", score: 80, color: "bg-blue-500" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-slate-400">{item.label}</span>
                <span className="text-[10px] font-bold text-white">{item.score}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
