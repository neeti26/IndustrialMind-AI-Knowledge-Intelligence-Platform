"use client";
import { useEffect, useState } from "react";
import {
  BookOpen, Loader2, AlertTriangle, Shield, Lightbulb,
  TrendingUp, AlertCircle, CheckCircle2, ChevronDown, ChevronUp
} from "lucide-react";
import { apiGet, type LessonsResponse, type LessonsPattern } from "@/lib/api";
import ReactMarkdown from "react-markdown";

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "text-red-400 bg-red-400/10 border-red-400/30",
  HIGH:     "text-orange-400 bg-orange-400/10 border-orange-400/30",
  MAJOR:    "text-amber-400 bg-amber-400/10 border-amber-400/30",
  MEDIUM:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

const CATEGORY_ICON: Record<string, string> = {
  "Systemic Safety":        "🔴",
  "Knowledge Management":   "📚",
  "Reliability Engineering":"⚙️",
  "Work Management":        "🔧",
  "Safety Culture":         "🛡️",
};

const STATIC_PATTERNS: LessonsPattern[] = [
  {
    id: "PATTERN-001",
    title: "Intelligence Gap in Permit-to-Work System",
    category: "Systemic Safety",
    severity: "CRITICAL",
    evidence: ["IR-2024-047", "CNC-2024-01", "HWP-2024-118"],
    description: "The PTW system issues permits based on point-in-time gas tests, making sensor trends invisible to permit issuers. IR-2024-047 shows GD-303 was trending from 3→8 ppm NH3 for 48 hours before the alarm — this was not visible at permit issuance. This is structural, not a one-off.",
    risk: "Next NH3 accumulation + active hot work concurrence could escalate to Level 3 Emergency (100 ppm evacuation) before any intervention is triggered.",
    recommendation: "Integrate real-time sensor trending into PTW issuance workflow. Flag any zone sensor showing >50% alarm threshold trend over 4 hours as a mandatory additional sign-off requirement (OISD-116 Clause 12.4)."
  },
  {
    id: "PATTERN-002",
    title: "Maintenance Documentation Staleness Cycle",
    category: "Knowledge Management",
    severity: "HIGH",
    evidence: ["CNC-2024-02", "DOC-AUDIT", "regulatory_compliance_audit.txt"],
    description: "HAZOP documentation last updated 2019. The 2022 HE-301 circuit revamp is not reflected. Physical changes to plant are not reliably triggering documentation updates — creating a growing divergence between the plant as-designed (documented) and plant as-operated (actual).",
    risk: "Next HAZOP-guided risk assessment will produce inaccurate risk rankings, potentially missing new hazard pathways introduced by the 2022 modifications.",
    recommendation: "Implement a Management of Change (MoC) workflow that auto-flags linked HAZOP documents for mandatory review whenever a physical process change is approved and executed."
  },
  {
    id: "PATTERN-003",
    title: "Critical Spare Parts Supply Chain Failure",
    category: "Reliability Engineering",
    severity: "HIGH",
    evidence: ["MNC-2024-02", "WO-2024-1847", "P-101"],
    description: "John Crane T21 mechanical seal for P-101 reached zero stock while WO-2024-1847 documents an active seal weep trending upward. The procurement and maintenance systems are not sharing data — failure trends in work orders are not generating predictive reorder signals.",
    risk: "P-101 seal failure = unplanned ammonia synthesis loop shutdown with no replacement on-site. 6-week procurement lead time means extended downtime.",
    recommendation: "Implement AI-driven spare parts analytics that cross-reference active work order failure trends against inventory levels in real-time, generating reorder alerts before stock reaches critical minimum."
  },
  {
    id: "PATTERN-004",
    title: "Work Order Isolation Dependency Blindness",
    category: "Work Management",
    severity: "HIGH",
    evidence: ["HAZ-002", "WO-2024-1967", "P-101", "V-101A"],
    description: "WO-2024-1967 (V-101A actuator maintenance) and existing P-101 work orders can be scheduled concurrently by the CMMS without any system-level interlock. V-101A is P-101's primary isolation valve — simultaneous work destroys the isolation boundary, creating a single-point failure risk invisible to individual work planners.",
    risk: "If both are worked simultaneously, P-101 cannot be safely isolated for any emergency intervention, violating fundamental safe isolation principles.",
    recommendation: "Add a work order dependency matrix to the CMMS that automatically detects and prevents concurrent scheduling of equipment with interdependent isolation points."
  },
  {
    id: "PATTERN-005",
    title: "Periodic Safety Obligation Drift",
    category: "Safety Culture",
    severity: "MAJOR",
    evidence: ["MNC-2024-03", "MNC-2024-04", "DOC-AUDIT"],
    description: "NH3 release drill last conducted 18 months ago (annual requirement per Factory Act). 2 of 4 NDT contractors lack valid site induction. Both represent periodic safety obligations that have drifted without a systematic tracking system — a slow erosion of preparedness that compounds over time.",
    risk: "In an actual NH3 release, degraded emergency response effectiveness due to team unfamiliarity with current procedures, evacuation routes, and plant layout changes since last drill.",
    recommendation: "Implement an automated compliance calendar integrated with IndustrialMind's compliance engine, with escalating alerts for drill schedules, induction renewals, and inspection due dates tied to regulatory deadlines."
  }
];

function PatternCard({ p, expanded, onToggle }: { p: LessonsPattern; expanded: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-xl border transition-all duration-200 ${SEVERITY_STYLE[p.severity]} overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/3 transition-colors"
      >
        <span className="text-xl shrink-0 mt-0.5">{CATEGORY_ICON[p.category] || "⚠️"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold text-white">{p.id}</span>
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${SEVERITY_STYLE[p.severity]}`}>
              {p.severity}
            </span>
            <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{p.category}</span>
          </div>
          <p className="text-xs font-semibold text-white">{p.title}</p>
          {!expanded && (
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.description}</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Evidence tags */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-1.5">Evidence</p>
            <div className="flex flex-wrap gap-1.5">
              {p.evidence.map(e => (
                <span key={e} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Pattern Analysis</p>
            <p className="text-xs text-slate-300 leading-relaxed">{p.description}</p>
          </div>

          {/* Risk */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] uppercase tracking-widest text-red-400 mb-1">If Unaddressed</p>
              <p className="text-xs text-slate-300">{p.risk}</p>
            </div>
          </div>

          {/* Recommendation */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] uppercase tracking-widest text-emerald-400 mb-1">Recommendation</p>
              <p className="text-xs text-slate-300">{p.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LessonsPage() {
  const [data, setData] = useState<LessonsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>("PATTERN-001");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const patterns = data?.patterns || STATIC_PATTERNS;

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiGet<LessonsResponse>("/intelligence/lessons-learned");
      setData(result);
      setAiAnalysis(result.analysis);
    } catch {
      setData({
        analysis: "",
        patterns: STATIC_PATTERNS,
        total_incidents_analysed: 1,
        total_compliance_findings: 5,
        total_open_work_orders: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const criticalCount = patterns.filter(p => p.severity === "CRITICAL").length;
  const highCount = patterns.filter(p => p.severity === "HIGH").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Lessons Learned & Failure Intelligence</h2>
          <p className="text-slate-400 text-sm mt-1">
            AI-powered systemic pattern detection across incident history, audits, and work orders
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          Re-analyse
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Systemic Patterns", value: patterns.length, color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20" },
          { label: "Critical Patterns", value: criticalCount, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
          { label: "High Severity", value: highCount, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
          { label: "Incidents Mined", value: data?.total_incidents_analysed ?? 1, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
        ].map(c => (
          <div key={c.label} className={`glass rounded-xl p-4 border ${c.bg}`}>
            <p className="text-xs text-slate-400 mb-1">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Intelligence note */}
      <div className="glass rounded-xl p-4 border border-violet-500/20 bg-violet-500/5 flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white">How Failure Intelligence Works</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            IndustrialMind mines incident reports, compliance audit findings, work order history, and the knowledge graph to surface 
            systemic patterns that are invisible to any single team or review. These are not one-off failures — they are structural 
            weaknesses that recur across functions, time periods, and equipment types.
          </p>
        </div>
      </div>

      {/* Patterns */}
      <div>
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-violet-400" />
          Detected Systemic Patterns ({patterns.length})
        </h3>
        <div className="space-y-3">
          {patterns.map(p => (
            <PatternCard
              key={p.id}
              p={p}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
            />
          ))}
        </div>
      </div>

      {/* AI Narrative Analysis */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">AI Narrative Analysis</h3>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-violet-400 ml-auto" />}
        </div>
        {aiAnalysis ? (
          <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            {loading ? "Analysing documents for failure patterns..." : "AI analysis will appear here after loading."}
          </p>
        )}
      </div>
    </div>
  );
}
