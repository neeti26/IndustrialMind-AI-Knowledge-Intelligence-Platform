"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, AlertTriangle, FileText, Cpu, Lightbulb } from "lucide-react";
import { apiPost, type QueryResponse } from "@/lib/api";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: QueryResponse["sources"];
  risk_alerts?: QueryResponse["risk_alerts"];
  graph_context?: string[];
  confidence?: number;
  loading?: boolean;
}

const SUGGESTIONS = [
  "What is the maintenance status of Pump P-101 and are there any open work orders?",
  "What are the OISD-116 requirements for hot work permits near gas detection zones?",
  "Summarize all open compliance gaps and their regulatory exposure.",
  "What were the root causes of incident IR-2024-047?",
  "Is it safe to issue a hot work permit in Area 3 right now?",
  "Which spare parts are critically low and which assets are at risk?",
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `**Welcome to IndustrialMind AI Copilot.**\n\nI have full context over:\n- Maintenance procedures & work orders for VFC Ammonia Synthesis Loop\n- Incident reports & near-miss investigations\n- OISD-116 & Factory Act 1948 regulatory requirements\n- Real-time knowledge graph with 28 equipment, permit, and compliance entities\n\nAsk me anything about plant safety, maintenance status, compliance requirements, or risk analysis.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (question?: string) => {
    const q = question || input.trim();
    if (!q || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: q };
    const loadingMsg: Message = { id: `l${Date.now()}`, role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const resp = await apiPost<QueryResponse>("/query/ask", { question: q });
      setMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? {
                ...m,
                loading: false,
                content: resp.answer,
                sources: resp.sources,
                risk_alerts: resp.risk_alerts,
                graph_context: resp.graph_context,
                confidence: resp.confidence,
              }
            : m
        )
      );
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.loading
            ? {
                ...m,
                loading: false,
                content: `⚠️ **Connection Error**\n\nCould not reach the IndustrialMind backend. Ensure the API server is running at \`http://localhost:8000\`.\n\nError: ${String(e)}`,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 glass flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Cpu className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">AI Knowledge Copilot</h2>
          <p className="text-[10px] text-slate-400">RAG-powered • Knowledge Graph context • 5 documents indexed</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-3xl ${msg.role === "user" ? "w-auto" : "w-full"}`}>
              {msg.loading ? (
                <div className="glass rounded-2xl p-4 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-blue-400/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">Searching knowledge base...</span>
                </div>
              ) : msg.role === "user" ? (
                <div className="bg-blue-600/30 border border-blue-500/30 rounded-2xl rounded-tr-sm px-4 py-3">
                  <p className="text-sm text-white">{msg.content}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Risk Alerts */}
                  {msg.risk_alerts && msg.risk_alerts.length > 0 && (
                    <div className="glass rounded-xl p-3 border border-red-500/30 bg-red-500/5">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-red-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Compound Risk Alerts Detected
                      </p>
                      {msg.risk_alerts.map((r) => (
                        <div key={r.id} className="flex items-start gap-2 mb-1.5">
                          <span className="text-red-400 text-xs mt-0.5">●</span>
                          <div>
                            <span className="text-xs font-semibold text-white">{r.label}</span>
                            <span className="text-xs text-slate-400"> — {r.description}</span>
                            <span className="ml-2 text-[10px] font-bold text-red-400">Risk: {r.risk_score}/10</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer */}
                  <div className="glass rounded-2xl rounded-tl-sm p-4">
                    <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((s) => (
                        <div
                          key={s.filename}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass border border-white/10 text-[10px] text-slate-400"
                        >
                          <FileText className="w-2.5 h-2.5 text-blue-400" />
                          <span className="max-w-[140px] truncate">{s.filename.replace(".txt", "")}</span>
                          <span className="text-blue-400 font-mono">
                            {Math.round(s.relevance_score * 100)}%
                          </span>
                        </div>
                      ))}
                      {msg.confidence !== undefined && (
                        <div className="px-2.5 py-1 rounded-full glass border border-white/10 text-[10px] text-slate-400">
                          Confidence: <span className="text-emerald-400 font-bold">{Math.round(msg.confidence * 100)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-6 pb-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> Suggested queries
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTIONS.slice(0, 4).map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-left text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg glass hover:bg-white/5 transition-colors line-clamp-2 border border-white/5"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/5 glass">
        <div className="flex gap-3">
          <input
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
            placeholder="Ask about maintenance, compliance, incidents, or risk scenarios..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
