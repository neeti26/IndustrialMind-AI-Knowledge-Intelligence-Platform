"use client";
import { useState } from "react";
import { Flame, Loader2, AlertTriangle, Send, Target } from "lucide-react";
import { apiGet, apiPost, type HazardItem } from "@/lib/api";
import ReactMarkdown from "react-markdown";

const STATIC_HAZARDS: HazardItem[] = [
  {
    id: "HAZ-001",
    label: "NH3 Accumulation + Active Hot Work",
    description: "Active Hot Work Permit HWP-2024-118 on HE-301 in Area 3, where GD-303 previously recorded sub-threshold NH3 readings. OISD-116 Clause 12.4 cross-reference gap (CNC-2024-01) means this combination is not being flagged automatically.",
    severity: "CRITICAL",
    likelihood: "MEDIUM",
    risk_score: 8.5,
    involved_entities: ["HE-301", "HWP-2024-118", "GD-303", "CNC-2024-01"],
  },
  {
    id: "HAZ-003",
    label: "P-101 Seal Failure + Zero Critical Spare",
    description: "P-101 mechanical seal weep trending upward (WO-2024-1847) with John Crane T21 seal at zero stock (MNC-2024-02). Seal failure during operation would cause NH3 release and force unplanned pump shutdown — no replacement spare on site.",
    severity: "HIGH",
    likelihood: "MEDIUM",
    risk_score: 7.5,
    involved_entities: ["P-101", "WO-2024-1847", "MNC-2024-02"],
  },
  {
    id: "HAZ-002",
    label: "P-101 Dual Isolation Failure Risk",
    description: "WO-2024-1967 (V-101A actuator maintenance) must not be executed simultaneously with any P-101 maintenance. V-101A is P-101's primary isolation valve — concurrent work creates single-point isolation failure risk.",
    severity: "HIGH",
    likelihood: "LOW",
    risk_score: 6.0,
    involved_entities: ["P-101", "V-101A", "WO-2024-1967"],
  },
];

const SCENARIO_TEMPLATES = [
  "What happens if we proceed with hot work on HE-301 while P-101 seal is weeping?",
  "Analyze the risk of scheduling V-101A valve maintenance while P-101 has open work orders.",
  "What compound hazards exist if summer cooling water quality degrades and P-101 bearing wear accelerates?",
  "Model the scenario where HE-301 flange fails completely during active hot work permit.",
];

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "text-red-400 border-red-400/30 bg-red-400/5",
  HIGH: "text-orange-400 border-orange-400/30 bg-orange-400/5",
  MEDIUM: "text-amber-400 border-amber-400/30 bg-amber-400/5",
};

export default function RiskPage() {
  const [hazards] = useState<HazardItem[]>(STATIC_HAZARDS);
  const [scenario, setScenario] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [relatedHazards, setRelatedHazards] = useState<HazardItem[]>([]);
  const [loading, setLoading] = useState(false);

  const analyze = async (q?: string) => {
    const s = q || scenario.trim();
    if (!s || loading) return;
    setScenario(s);
    setLoading(true);
    setAnalysis(null);

    try {
      const result = await apiPost<{ analysis: string; related_hazards: HazardItem[] }>(
        "/query/risk-scenario",
        { scenario: s }
      );
      setAnalysis(result.analysis);
      setRelatedHazards(result.related_hazards || []);
    } catch {
      setAnalysis(
        `**Analysis (Offline Mode)**\n\nThe backend API is not connected. In live mode, this would:\n\n` +
        `1. **Retrieve** relevant incident reports, procedures, and regulations via RAG\n` +
        `2. **Cross-reference** the scenario against known compound hazards in the knowledge graph\n` +
        `3. **Generate** a risk assessment with severity, likelihood, regulatory exposure, and corrective actions\n\n` +
        `Connect the FastAPI backend at \`http://localhost:8000\` and add your OpenAI/Groq API key to see live analysis.`
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 8) return "text-red-400";
    if (score >= 6) return "text-orange-400";
    return "text-amber-400";
  };

  const getRiskBg = (score: number) => {
    if (score >= 8) return "bg-red-400";
    if (score >= 6) return "bg-orange-400";
    return "bg-amber-400";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Risk Intelligence</h2>
        <p className="text-slate-400 text-sm mt-1">
          Active compound hazards and AI-powered scenario analysis
        </p>
      </div>

      {/* Active Hazards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Flame className="w-4 h-4 text-red-400" />
          Active Compound Hazards ({hazards.length})
        </h3>
        {hazards.map((h) => (
          <div key={h.id} className={`glass rounded-xl p-4 border ${SEVERITY_COLOR[h.severity]}`}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    h.risk_score >= 8 ? "bg-red-500/20" : "bg-orange-500/20"
                  }`}
                >
                  <span className={`text-sm font-black ${getRiskColor(h.risk_score)}`}>
                    {h.risk_score}
                  </span>
                </div>
                <p className="text-[8px] text-center text-slate-500 mt-0.5">/10</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-bold text-white">{h.label}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${SEVERITY_COLOR[h.severity]}`}>
                    {h.severity}
                  </span>
                  <span className="text-[10px] text-slate-500">· {h.likelihood} likelihood</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{h.description}</p>

                {/* Risk bar */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getRiskBg(h.risk_score)} transition-all duration-1000`}
                      style={{ width: `${h.risk_score * 10}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 ml-2">
                    {h.involved_entities.map((e) => (
                      <span key={e} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-mono">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => analyze(`Analyze the compound risk: ${h.label}. ${h.description}`)}
                className="shrink-0 text-[10px] text-blue-400 hover:text-blue-300 border border-blue-400/30 px-2 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Target className="w-3 h-3" />
                Deep Analyze
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Scenario Analysis */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Scenario Risk Analysis
        </h3>

        {/* Templates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {SCENARIO_TEMPLATES.map((t) => (
            <button
              key={t}
              onClick={() => { setScenario(t); }}
              className="text-left text-[10px] text-slate-400 hover:text-white px-3 py-2 rounded-lg glass hover:bg-white/5 transition-colors border border-white/5 line-clamp-2"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Describe a risk scenario to analyze... e.g., 'What if we start confined space work on HE-301 while P-101 seal is actively leaking?'"
            rows={3}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none"
          />
          <button
            onClick={() => analyze()}
            disabled={loading || !scenario.trim()}
            className="w-12 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>

        {/* Analysis Result */}
        {loading && (
          <div className="mt-4 flex items-center gap-3 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
            Analyzing scenario against incident history and regulatory database...
          </div>
        )}

        {analysis && (
          <div className="mt-4 p-4 glass rounded-xl border border-orange-400/20">
            <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
            {relatedHazards.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-[10px] text-slate-500 mb-2">Related active hazards:</p>
                <div className="flex gap-2">
                  {relatedHazards.map((h) => (
                    <span key={h.id} className="text-[10px] px-2 py-1 rounded-lg bg-orange-400/10 border border-orange-400/20 text-orange-400">
                      {h.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
