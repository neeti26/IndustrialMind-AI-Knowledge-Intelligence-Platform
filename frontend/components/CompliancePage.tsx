"use client";
import { useEffect, useState } from "react";
import { ShieldAlert, ShieldX, Loader2, AlertCircle, CheckCircle, Calendar, BookOpen } from "lucide-react";
import { apiGet, apiPost, type ComplianceResponse } from "@/lib/api";
import ReactMarkdown from "react-markdown";

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "text-red-400 bg-red-400/10 border-red-400/30",
  MAJOR: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  MINOR: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
};

const STATIC_GAPS = [
  {
    id: "CNC-2024-01",
    severity: "CRITICAL",
    description: "No PTW-sensor cross-reference mechanism — permit issuers rely on point-in-time gas tests rather than trending data",
    regulation: "OISD-116 Clause 12.4, 12.5",
    target_date: "2025-03-31",
    status: "OPEN",
  },
  {
    id: "CNC-2024-02",
    severity: "CRITICAL",
    description: "HAZOP documentation for Ammonia Synthesis Loop last updated 2019 — process modifications in 2022 not reflected",
    regulation: "Factory Act 1948 S.41B; OISD-105 Clause 4.2",
    target_date: "2025-06-30",
    status: "OPEN",
  },
  {
    id: "MNC-2024-02",
    severity: "MAJOR",
    description: "P-101 critical mechanical seal spare (John Crane T21) at zero stock — OISD best practice violated",
    regulation: "OISD-116 Section 7.2",
    target_date: "2025-02-01",
    status: "OPEN",
  },
  {
    id: "MNC-2024-03",
    severity: "MAJOR",
    description: "Bharat NDT Services — 2 of 4 technicians lack current site induction (>12 months) for HE-301 confined space work",
    regulation: "OISD-116 Section 22.2; Factory Act 1948",
    target_date: "2025-01-31",
    status: "OPEN",
  },
  {
    id: "MNC-2024-04",
    severity: "MAJOR",
    description: "Last NH3 release drill in Area 3 was 18 months ago — Factory Act requires annual emergency drill for hazardous zones",
    regulation: "Factory Act 1948 — Emergency Preparedness",
    target_date: "2025-02-28",
    status: "OPEN",
  },
];

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      const result = await apiPost<ComplianceResponse>("/query/compliance", {});
      setData(result);
      setAiSummary(result.summary);
    } catch {
      // Use static data as fallback
      setData({
        summary: "",
        gaps: STATIC_GAPS,
        critical_count: 2,
        major_count: 3,
        total_open: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    try {
      const result = await apiPost<ComplianceResponse>("/query/compliance", {});
      setAiSummary(result.summary);
    } catch {
      setAiSummary("Connect the backend to generate AI compliance analysis.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const gaps = data?.gaps || STATIC_GAPS;
  const criticalCount = data?.critical_count ?? 2;
  const majorCount = data?.major_count ?? 3;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Regulatory Compliance Intelligence</h2>
          <p className="text-slate-400 text-sm mt-1">
            OISD-116 · Factory Act 1948 · OISD-105 · DGMS — VFC Audit Q3-2024
          </p>
        </div>
        <button
          onClick={runCheck}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
          Run Compliance Check
        </button>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Overall Score", value: "76%", sub: "Q3 2024 Audit", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
          { label: "Critical Gaps", value: criticalCount, sub: "Immediate action", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
          { label: "Major NCRs", value: majorCount, sub: "Requires closure", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
          { label: "Standards Audited", value: "4", sub: "OISD/Factory/DGMS", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
        ].map((c) => (
          <div key={c.label} className={`glass rounded-xl p-4 border ${c.bg}`}>
            <p className="text-xs text-slate-400 mb-1">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-[11px] text-slate-500 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Score Bars */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          Compliance Score by Standard
        </h3>
        <div className="space-y-4">
          {[
            { standard: "OISD-116", score: 84, clauses: 45, nc: 7, color: "bg-emerald-500" },
            { standard: "Factory Act 1948", score: 73, clauses: 22, nc: 6, color: "bg-amber-500" },
            { standard: "OISD-105", score: 67, clauses: 18, nc: 6, color: "bg-red-500" },
            { standard: "DGMS Guidelines", score: 80, clauses: 10, nc: 2, color: "bg-blue-500" },
          ].map((s) => (
            <div key={s.standard} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{s.standard}</span>
                  <span className="text-[10px] text-slate-500">{s.clauses} clauses · {s.nc} non-conformances</span>
                </div>
                <span className={`text-sm font-bold ${s.score >= 80 ? "text-emerald-400" : s.score >= 70 ? "text-amber-400" : "text-red-400"}`}>
                  {s.score}%
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${s.color} transition-all duration-1000`} style={{ width: `${s.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open Findings */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <ShieldX className="w-4 h-4 text-red-400" />
          Open Non-Conformances ({gaps.length})
        </h3>
        <div className="space-y-3">
          {gaps.map((gap) => (
            <div
              key={gap.id}
              className={`rounded-xl p-4 border ${SEVERITY_STYLE[gap.severity]} bg-opacity-5`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {gap.severity === "CRITICAL" ? (
                    <ShieldX className="w-4 h-4 mt-0.5 text-red-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 text-orange-400 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white">{gap.id}</span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${SEVERITY_STYLE[gap.severity]}`}>
                        {gap.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{gap.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <BookOpen className="w-3 h-3 text-emerald-400" />
                        {gap.regulation}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Calendar className="w-3 h-3 text-blue-400" />
                        Due: {gap.target_date}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded shrink-0">
                  OPEN
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">AI Compliance Analysis</h3>
          <button
            onClick={generateSummary}
            disabled={summaryLoading}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50"
          >
            {summaryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generate"}
          </button>
        </div>
        {aiSummary ? (
          <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
            <ReactMarkdown>{aiSummary}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            Click "Generate" to get an AI-powered compliance analysis with prioritized action recommendations.
          </p>
        )}
      </div>
    </div>
  );
}
