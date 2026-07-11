"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Info, Network, Filter, Search, X } from "lucide-react";
import { apiGet, type GraphData } from "@/lib/api";
import { getGraphData, getStats } from "@/lib/knowledge-graph";

type NodeType = "Equipment" | "WorkOrder" | "Incident" | "Permit" | "Regulation" | "Hazard" | "ComplianceFinding" | "Document" | "All";

const COLOR_MAP: Record<string, string> = {
  Equipment:        "#3b82f6",
  WorkOrder:        "#f59e0b",
  Incident:         "#ef4444",
  Permit:           "#8b5cf6",
  Regulation:       "#10b981",
  Hazard:           "#f97316",
  ComplianceFinding:"#ec4899",
  Document:         "#6b7280",
};

const TYPE_LABELS: Record<string, string> = {
  Equipment:        "⚙️ Equipment",
  WorkOrder:        "🔧 Work Orders",
  Incident:         "🚨 Incidents",
  Permit:           "📋 Permits",
  Regulation:       "📖 Regulations",
  Hazard:           "⚠️ Hazards",
  ComplianceFinding:"🛡️ Compliance",
  Document:         "📄 Documents",
};

interface SelectedNode {
  id: string;
  label: string;
  type: string;
  color: string;
  data: Record<string, unknown>;
}

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [filter, setFilter] = useState<NodeType>("All");
  const [search, setSearch] = useState("");
  const [ForceGraph, setForceGraph] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });

  // Dynamically import react-force-graph-2d (client only)
  useEffect(() => {
    import("react-force-graph-2d").then((mod) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setForceGraph(mod.default as React.ComponentType<Record<string, unknown>>);
    });
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setDimensions({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    apiGet<GraphData>("/graph/full")
      .then(data => { setGraphData(data); setLoading(false); })
      .catch(() => {
        // Use static knowledge graph as fallback
        const kg = getGraphData();
        const fallback: GraphData = {
          nodes: kg.nodes.map(n => ({ id: n.id, label: n.label, type: n.type, color: n.color, data: { ...n } as Record<string, unknown> })),
          links: kg.links.map(e => ({ source: e.source, target: e.target, relation: e.relation, label: e.relation })),
        };
        setGraphData(fallback);
        setLoading(false);
      });
  }, []);

  const filteredData = graphData ? (() => {
    let nodes = graphData.nodes;
    if (filter !== "All") nodes = nodes.filter(n => n.type === filter);
    if (search) {
      const q = search.toLowerCase();
      nodes = nodes.filter(n => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
    }
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = graphData.links.filter(l => {
      const src = typeof l.source === "object" ? (l.source as { id: string }).id : l.source;
      const tgt = typeof l.target === "object" ? (l.target as { id: string }).id : l.target;
      return nodeIds.has(src) && nodeIds.has(tgt);
    });
    return { nodes, links };
  })() : { nodes: [], links: [] };

  const nodeCanvasObject = useCallback((node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as { x: number; y: number; id: string; label: string; type: string; color: string };
    const r = n.type === "Equipment" ? 7 : n.type === "Hazard" ? 6 : 5;
    const label = n.label;
    const fontSize = Math.max(8 / globalScale, 5);

    // Glow
    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3);
    grad.addColorStop(0, n.color + "55");
    grad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Node
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = n.color + "44";
    ctx.fill();
    ctx.strokeStyle = n.color;
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();

    // Label
    if (globalScale > 0.5) {
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(label.length > 18 ? label.slice(0, 17) + "…" : label, n.x, n.y + r + 2 / globalScale);
    }
  }, []);

  const handleNodeClick = useCallback((node: unknown) => {
    const n = node as SelectedNode;
    setSelectedNode(n);
  }, []);

  const stats = graphData ? {
    total_nodes: graphData.nodes.length,
    total_edges: graphData.links.length,
  } : getStats();

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 glass flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">Knowledge Graph Explorer</h2>
            <p className="text-[10px] text-slate-400">
              {stats.total_nodes} entities · {stats.total_edges} relationships
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search entities..."
              className="w-44 bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-slate-500 hover:text-white" />
              </button>
            )}
          </div>
          {/* Filter */}
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as NodeType)}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="All">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Graph canvas */}
        <div ref={containerRef} className="flex-1 relative bg-[#080d1a]">
          {loading || !ForceGraph ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <ForceGraph
              graphData={filteredData}
              width={dimensions.w}
              height={dimensions.h}
              backgroundColor="#080d1a"
              nodeColor={(node: unknown) => (node as { color: string }).color}
              nodeRelSize={5}
              linkColor={() => "rgba(255,255,255,0.12)"}
              linkWidth={1}
              linkLabel="relation"
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              nodeCanvasObject={nodeCanvasObject}
              nodeCanvasObjectMode={() => "replace"}
              onNodeClick={handleNodeClick}
            />
          )}

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 glass rounded-xl p-3 border border-white/5 pointer-events-none">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(COLOR_MAP).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[9px] text-slate-400">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="w-64 border-l border-white/5 glass p-4 overflow-y-auto scrollbar-thin shrink-0">
          {selectedNode ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">{selectedNode.label}</h3>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block mb-4"
                style={{ background: selectedNode.color + "22", color: selectedNode.color }}
              >
                {selectedNode.type}
              </span>
              <div className="space-y-2.5">
                {Object.entries(selectedNode.data || {})
                  .filter(([k]) => !["type", "label", "color", "id", "x", "y", "vx", "vy", "__indexColor"].includes(k))
                  .map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">{k.replace(/_/g, " ")}</p>
                      <p className={`text-xs font-medium break-words ${
                        String(v).includes("CRITICAL") || String(v).includes("OVERDUE") ? "text-red-400" :
                        String(v).includes("OPEN") ? "text-amber-400" :
                        String(v).includes("OK") ? "text-emerald-400" :
                        "text-slate-300"
                      }`}>
                        {String(v)}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Connected nodes */}
              {graphData && (() => {
                const connected = graphData.links
                  .filter(l => {
                    const src = typeof l.source === "object" ? (l.source as { id: string }).id : l.source;
                    const tgt = typeof l.target === "object" ? (l.target as { id: string }).id : l.target;
                    return src === selectedNode.id || tgt === selectedNode.id;
                  })
                  .slice(0, 6);
                if (!connected.length) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-2">Connections</p>
                    <div className="space-y-1.5">
                      {connected.map((l, i) => {
                        const src = typeof l.source === "object" ? (l.source as { id: string }).id : l.source;
                        const tgt = typeof l.target === "object" ? (l.target as { id: string }).id : l.target;
                        const other = src === selectedNode.id ? tgt : src;
                        const dir = src === selectedNode.id ? "→" : "←";
                        return (
                          <div key={i} className="text-[10px] text-slate-400 flex items-center gap-1.5 p-1.5 rounded bg-white/3">
                            <span className="text-slate-600">{dir}</span>
                            <span className="text-slate-300 font-mono text-[9px] flex-1 truncate">{other}</span>
                            <span className="text-[8px] text-slate-600 truncate max-w-[50px]">{l.relation}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-400">Click a node to inspect</p>
              </div>
              <div className="space-y-2 mb-6">
                {Object.entries(COLOR_MAP).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[11px] text-slate-400">{TYPE_LABELS[type] || type}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 pt-4 space-y-2">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Graph Stats</p>
                {[
                  ["Total Entities", stats.total_nodes],
                  ["Relationships", stats.total_edges],
                  ["Open Work Orders", "open_work_orders" in stats ? stats.open_work_orders : "5"],
                  ["Critical Gaps", "critical_compliance_gaps" in stats ? stats.critical_compliance_gaps : "2"],
                  ["Active Hazards", "active_hazards" in stats ? stats.active_hazards : "3"],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between">
                    <span className="text-[10px] text-slate-500">{k}</span>
                    <span className="text-[10px] font-bold text-white">{v as string}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
