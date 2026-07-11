"use client";
import dynamic from "next/dynamic";
import { useEffect, useState, useCallback, useRef } from "react";
import type { MutableRefObject } from "react";
import { Loader2, Info, Network, Filter, Search, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { apiGet, type GraphData } from "@/lib/api";
import { getGraphData, getStats } from "@/lib/knowledge-graph";
import type { ForceGraphMethods } from "react-force-graph-2d";

// SSR-safe dynamic import — react-force-graph-2d requires window/canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#080d1a]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <p className="text-xs text-slate-400">Loading knowledge graph engine...</p>
      </div>
    </div>
  ),
});

type NodeType = "Equipment" | "WorkOrder" | "Incident" | "Permit" |
  "Regulation" | "Hazard" | "ComplianceFinding" | "Document" | "All";

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

interface GraphNode {
  id: string;
  label: string;
  type: string;
  color: string;
  data: Record<string, unknown>;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | { id: string };
  target: string | { id: string };
  relation: string;
  label: string;
}

interface SelectedNode extends GraphNode {
  __indexColor?: string;
  vx?: number;
  vy?: number;
}

// Node size by type
const NODE_SIZE: Record<string, number> = {
  Equipment: 8, Hazard: 7, Incident: 7,
  ComplianceFinding: 6, Regulation: 5,
  WorkOrder: 5, Permit: 5, Document: 4,
};

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [filter, setFilter] = useState<NodeType>("All");
  const [search, setSearch] = useState("");
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 900, h: 600 });
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          setDimensions({ w: offsetWidth, h: offsetHeight });
        }
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Load graph data
  useEffect(() => {
    apiGet<GraphData>("/graph/full")
      .then(data => { setGraphData(data); setLoading(false); })
      .catch(() => {
        const kg = getGraphData();
        const fallback: GraphData = {
          nodes: kg.nodes.map(n => ({
            id: n.id, label: n.label, type: n.type, color: n.color,
            data: Object.fromEntries(
              Object.entries(n).filter(([k]) => !["id","label","type","color"].includes(k))
            ) as Record<string, unknown>,
          })),
          links: kg.links.map(e => ({
            source: e.source, target: e.target,
            relation: e.relation, label: e.relation,
          })),
        };
        setGraphData(fallback);
        setLoading(false);
      });
  }, []);

  // Build filtered view
  const filteredData = (() => {
    if (!graphData) return { nodes: [], links: [] };
    let nodes: GraphNode[] = graphData.nodes;
    if (filter !== "All") nodes = nodes.filter(n => n.type === filter);
    if (search) {
      const q = search.toLowerCase();
      nodes = nodes.filter(n =>
        n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
      );
    }
    const nodeIds = new Set(nodes.map(n => n.id));
    const links: GraphLink[] = graphData.links.filter(l => {
      const src = typeof l.source === "object" ? (l.source as { id: string }).id : l.source;
      const tgt = typeof l.target === "object" ? (l.target as { id: string }).id : l.target;
      return nodeIds.has(src) && nodeIds.has(tgt);
    });
    return { nodes, links };
  })();

  // Canvas node painter — rich industrial styling
  const paintNode = useCallback((node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode & { x: number; y: number };
    const r = (NODE_SIZE[n.type] || 5);
    const isSelected = selectedNode?.id === n.id;
    const isHighlighted = highlightNodes.has(n.id);
    const alpha = highlightNodes.size > 0 && !isHighlighted && !isSelected ? 0.2 : 1;

    ctx.globalAlpha = alpha;

    // Outer glow
    const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.5);
    gr.addColorStop(0, n.color + (isSelected ? "88" : "44"));
    gr.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(n.x, n.y, r * 3.5, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.fill();

    // Selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 3 / globalScale, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    // Node fill
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = n.color + "55";
    ctx.fill();
    ctx.strokeStyle = n.color;
    ctx.lineWidth = (isSelected ? 2.5 : 1.5) / globalScale;
    ctx.stroke();

    // Label (only when zoomed in enough)
    if (globalScale > 0.6) {
      const fontSize = Math.min(Math.max(10 / globalScale, 4), 12);
      ctx.font = `${isSelected ? "bold " : ""}${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      // Background pill for label
      const lbl = n.label.length > 20 ? n.label.slice(0, 19) + "…" : n.label;
      const tw = ctx.measureText(lbl).width;
      const pad = 3 / globalScale;
      const lh = fontSize + 2 / globalScale;
      const lx = n.x - tw / 2 - pad;
      const ly = n.y + r + 3 / globalScale;
      ctx.fillStyle = "rgba(8,13,26,0.75)";
      ctx.beginPath();
      ctx.roundRect(lx, ly, tw + pad * 2, lh, 2 / globalScale);
      ctx.fill();
      ctx.fillStyle = isSelected ? "#ffffff" : "#cbd5e1";
      ctx.fillText(lbl, n.x, n.y + r + 4 / globalScale);
    }

    ctx.globalAlpha = 1;
  }, [selectedNode, highlightNodes]);

  const handleNodeClick = useCallback((node: unknown) => {
    const n = node as SelectedNode;
    setSelectedNode(prev => prev?.id === n.id ? null : n);
    // Highlight connected nodes
    if (graphData) {
      const connected = new Set<string>([n.id]);
      graphData.links.forEach(l => {
        const src = typeof l.source === "object" ? (l.source as { id: string }).id : l.source;
        const tgt = typeof l.target === "object" ? (l.target as { id: string }).id : l.target;
        if (src === n.id) connected.add(tgt);
        if (tgt === n.id) connected.add(src);
      });
      setHighlightNodes(connected);
    }
  }, [graphData]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
  }, []);

  const stats = graphData
    ? { total_nodes: graphData.nodes.length, total_edges: graphData.links.length,
        open_work_orders: 5, critical_compliance_gaps: 2, active_hazards: 3 }
    : { ...getStats(), total_nodes: getStats().total_nodes, total_edges: getStats().total_edges };

  // Get connections for selected node
  const getConnections = (nodeId: string) => {
    if (!graphData) return [];
    return graphData.links
      .filter(l => {
        const src = typeof l.source === "object" ? (l.source as { id: string }).id : l.source;
        const tgt = typeof l.target === "object" ? (l.target as { id: string }).id : l.target;
        return src === nodeId || tgt === nodeId;
      })
      .map(l => {
        const src = typeof l.source === "object" ? (l.source as { id: string }).id : l.source;
        const tgt = typeof l.target === "object" ? (l.target as { id: string }).id : l.target;
        return {
          other: src === nodeId ? tgt : src,
          dir: src === nodeId ? "→" : "←",
          relation: l.relation,
        };
      });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/5 glass flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">Knowledge Graph Explorer</h2>
            <p className="text-[10px] text-slate-400">
              {loading ? "Loading..." : `${filteredData.nodes.length} entities · ${filteredData.links.length} relationships`}
              {filter !== "All" && <span className="ml-1 text-blue-400">· filtered: {filter}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedNode(null); setHighlightNodes(new Set()); }}
              placeholder="Search nodes..."
              className="w-40 bg-white/5 border border-white/10 rounded-lg pl-7 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-slate-400 hover:text-white" />
              </button>
            )}
          </div>
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value as NodeType); setSelectedNode(null); setHighlightNodes(new Set()); }}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
          >
            <option value="All">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
          onClick={() => fgRef.current?.zoomToFit(400, 40)}
            className="p-1.5 rounded-lg glass border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="Fit to screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fgRef.current?.zoom(1.4, 200)}
            className="p-1.5 rounded-lg glass border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fgRef.current?.zoom(0.7, 200)}
            className="p-1.5 rounded-lg glass border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Graph canvas area */}
        <div ref={containerRef} className="flex-1 relative bg-[#080d1a] overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <p className="text-xs text-slate-400">Building knowledge graph...</p>
              </div>
            </div>
          ) : dimensions.w > 0 && (
            <ForceGraph2D
              ref={fgRef}
              graphData={filteredData}
              width={dimensions.w}
              height={dimensions.h}
              backgroundColor="#080d1a"
              nodeRelSize={1}
              nodeCanvasObject={paintNode}
              nodeCanvasObjectMode={() => "replace"}
              nodePointerAreaPaint={(node: unknown, color: string, ctx: CanvasRenderingContext2D) => {
                const n = node as GraphNode & { x: number; y: number };
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(n.x, n.y, (NODE_SIZE[n.type] || 5) + 4, 0, Math.PI * 2);
                ctx.fill();
              }}
              linkColor={(link: unknown) => {
                const l = link as GraphLink;
                const src = typeof l.source === "object" ? (l.source as { id: string }).id : l.source;
                const tgt = typeof l.target === "object" ? (l.target as { id: string }).id : l.target;
                if (selectedNode && (src === selectedNode.id || tgt === selectedNode.id)) {
                  return "rgba(255,255,255,0.55)";
                }
                return highlightNodes.size > 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.13)";
              }}
              linkWidth={(link: unknown) => {
                const l = link as GraphLink;
                const src = typeof l.source === "object" ? (l.source as { id: string }).id : l.source;
                const tgt = typeof l.target === "object" ? (l.target as { id: string }).id : l.target;
                return (selectedNode && (src === selectedNode.id || tgt === selectedNode.id)) ? 1.5 : 0.8;
              }}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.15}
              linkLabel="relation"
              onNodeClick={handleNodeClick}
              onBackgroundClick={handleBackgroundClick}
              cooldownTicks={120}
              onEngineStop={() => fgRef.current?.zoomToFit(500, 50)}
            />
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 glass rounded-xl p-3 border border-white/5 pointer-events-none select-none">
            <p className="text-[8px] uppercase tracking-widest text-slate-500 mb-2">Node Types</p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
              {Object.entries(COLOR_MAP).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[9px] text-slate-400">{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Usage hint */}
          {!selectedNode && !loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 glass rounded-full px-3 py-1.5 border border-white/5 pointer-events-none">
              <p className="text-[10px] text-slate-500">Click a node to inspect · Drag to pan · Scroll to zoom</p>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-72 border-l border-white/5 glass overflow-y-auto scrollbar-thin shrink-0 flex flex-col">
          {selectedNode ? (
            <div className="p-4 flex-1">
              {/* Node header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: selectedNode.color }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: selectedNode.color + "22", color: selectedNode.color }}
                  >
                    {selectedNode.type}
                  </span>
                </div>
                <button onClick={() => { setSelectedNode(null); setHighlightNodes(new Set()); }}
                  className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 leading-snug">{selectedNode.label}</h3>
              <p className="text-[10px] font-mono text-slate-500 mb-4">{selectedNode.id}</p>

              {/* Properties */}
              <div className="space-y-3 mb-5">
                {Object.entries(selectedNode.data || {})
                  .filter(([k]) => !["type","label","color","id","x","y","vx","vy","__indexColor","__threeObj","fx","fy"].includes(k))
                  .map(([k, v]) => {
                    const vs = String(v);
                    const valColor =
                      vs === "CRITICAL" || vs === "OVERDUE_INSPECTION" ? "text-red-400" :
                      vs === "OPEN" || vs === "OPEN_ISSUES" || vs === "HIGH" ? "text-amber-400" :
                      vs === "OK" || vs === "CLOSED" ? "text-emerald-400" :
                      vs === "SAFETY_CRITICAL" ? "text-red-300" :
                      "text-slate-300";
                    return (
                      <div key={k}>
                        <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-0.5">
                          {k.replace(/_/g, " ")}
                        </p>
                        <p className={`text-xs font-medium break-words leading-relaxed ${valColor}`}>{vs}</p>
                      </div>
                    );
                  })}
              </div>

              {/* Connections */}
              {(() => {
                const conns = getConnections(selectedNode.id);
                if (!conns.length) return null;
                return (
                  <div className="border-t border-white/8 pt-3">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-2">
                      Relationships ({conns.length})
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                      {conns.map((c, i) => {
                        const nodeColor = graphData?.nodes.find(n => n.id === c.other)?.color || "#64748b";
                        return (
                          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/3 border border-white/5 cursor-pointer hover:bg-white/6 transition-colors"
                            onClick={() => {
                              const target = graphData?.nodes.find(n => n.id === c.other);
                              if (target) handleNodeClick(target);
                            }}>
                            <span className="text-[10px] text-slate-500 shrink-0 w-4 text-center">{c.dir}</span>
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: nodeColor }} />
                            <span className="text-[10px] font-mono text-slate-300 flex-1 truncate">{c.other}</span>
                            <span className="text-[8px] text-slate-600 shrink-0 truncate max-w-[60px]">{c.relation}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-4 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-400">Click any node to inspect</p>
              </div>

              {/* Graph stats */}
              <div className="space-y-2 mb-5 p-3 rounded-xl bg-white/3 border border-white/5">
                <p className="text-[9px] uppercase tracking-wider text-slate-500">Graph Statistics</p>
                {[
                  ["Total Entities", stats.total_nodes, "text-blue-400"],
                  ["Relationships", stats.total_edges, "text-violet-400"],
                  ["Open Work Orders", stats.open_work_orders ?? 5, "text-amber-400"],
                  ["Critical Gaps", stats.critical_compliance_gaps ?? 2, "text-red-400"],
                  ["Active Hazards", stats.active_hazards ?? 3, "text-orange-400"],
                ].map(([k, v, c]) => (
                  <div key={k as string} className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">{k}</span>
                    <span className={`text-sm font-bold ${c}`}>{v as number}</span>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-2">Node Types</p>
              <div className="space-y-1.5">
                {Object.entries(COLOR_MAP).map(([type, color]) => {
                  const count = graphData?.nodes.filter(n => n.type === type).length ?? 0;
                  return (
                    <div key={type} className="flex items-center gap-2 cursor-pointer hover:bg-white/3 px-2 py-1 rounded-lg transition-colors"
                      onClick={() => setFilter(filter === type ? "All" : type as NodeType)}>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[11px] text-slate-400 flex-1">{TYPE_LABELS[type] || type}</span>
                      <span className="text-[10px] font-bold text-slate-500">{count}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-600 mt-3 text-center">Click type to filter graph</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
