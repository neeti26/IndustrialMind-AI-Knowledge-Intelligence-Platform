"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Info, Network, Filter } from "lucide-react";
import { apiGet, type GraphData } from "@/lib/api";

type NodeType = "Equipment" | "WorkOrder" | "Incident" | "Permit" | "Regulation" | "Hazard" | "ComplianceFinding" | "Document" | "All";

const COLOR_MAP: Record<string, string> = {
  Equipment: "#3b82f6",
  WorkOrder: "#f59e0b",
  Incident: "#ef4444",
  Permit: "#8b5cf6",
  Regulation: "#10b981",
  Hazard: "#f97316",
  ComplianceFinding: "#ec4899",
  Document: "#6b7280",
};

const TYPE_LABELS: Record<string, string> = {
  Equipment: "⚙️ Equipment",
  WorkOrder: "🔧 Work Orders",
  Incident: "🚨 Incidents",
  Permit: "📋 Permits",
  Regulation: "📖 Regulations",
  Hazard: "⚠️ Hazards",
  ComplianceFinding: "🛡️ Compliance",
  Document: "📄 Documents",
};

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphData["nodes"][0] | null>(null);
  const [filter, setFilter] = useState<NodeType>("All");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const nodesRef = useRef<Array<{ id: string; x: number; y: number; vx: number; vy: number; label: string; type: string; color: string; data: Record<string, unknown> }>>([]);
  const linksRef = useRef<Array<{ source: string; target: string; relation: string }>>([]);

  useEffect(() => {
    apiGet<GraphData>("/graph/full")
      .then((data) => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Simple force-directed layout on canvas
  useEffect(() => {
    if (!graphData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    const filteredNodes = filter === "All"
      ? graphData.nodes
      : graphData.nodes.filter(n => n.type === filter);

    const nodeIds = new Set(filteredNodes.map(n => n.id));

    nodesRef.current = filteredNodes.map((n, i) => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * 300,
      y: H / 2 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
    }));

    linksRef.current = graphData.links.filter(
      (l) => nodeIds.has(typeof l.source === "string" ? l.source : (l.source as { id: string }).id) &&
             nodeIds.has(typeof l.target === "string" ? l.target : (l.target as { id: string }).id)
    );

    let frame = 0;
    const LINK_DIST = 120;
    const REPULSION = 1500;
    const DAMPING = 0.85;

    const simulate = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION / (d * d);
          nodes[i].vx -= (dx / d) * force;
          nodes[i].vy -= (dy / d) * force;
          nodes[j].vx += (dx / d) * force;
          nodes[j].vy += (dy / d) * force;
        }
        // Center gravity
        nodes[i].vx += (W / 2 - nodes[i].x) * 0.002;
        nodes[i].vy += (H / 2 - nodes[i].y) * 0.002;
      }

      // Attraction along links
      for (const link of links) {
        const src = nodes.find(n => n.id === link.source);
        const tgt = nodes.find(n => n.id === link.target);
        if (!src || !tgt) continue;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (d - LINK_DIST) * 0.02;
        src.vx += (dx / d) * force;
        src.vy += (dy / d) * force;
        tgt.vx -= (dx / d) * force;
        tgt.vy -= (dy / d) * force;
      }

      // Update positions
      for (const n of nodes) {
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x = Math.max(40, Math.min(W - 40, n.x + n.vx));
        n.y = Math.max(40, Math.min(H - 40, n.y + n.vy));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(10,15,30,1)";
      ctx.fillRect(0, 0, W, H);

      const nodes = nodesRef.current;
      const links = linksRef.current;

      // Draw links
      for (const link of links) {
        const src = nodes.find(n => n.id === link.source);
        const tgt = nodes.find(n => n.id === link.target);
        if (!src || !tgt) continue;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Relation label on midpoint
        const mx = (src.x + tgt.x) / 2;
        const my = (src.y + tgt.y) / 2;
        ctx.fillStyle = "rgba(148,163,184,0.5)";
        ctx.font = "8px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(link.relation, mx, my);
      }

      // Draw nodes
      for (const n of nodes) {
        const r = n.type === "Equipment" ? 14 : n.type === "Hazard" ? 13 : 10;

        // Glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2);
        grad.addColorStop(0, n.color + "44");
        grad.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.color + "33";
        ctx.fill();
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = "#e2e8f0";
        ctx.font = `bold 9px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + r + 12);
      }
    };

    const loop = () => {
      if (frame < 200) simulate();
      draw();
      frame++;
      animRef.current = requestAnimationFrame(loop);
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(loop);

    // Click handler
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = nodesRef.current.find((n) => {
        const r = n.type === "Equipment" ? 14 : 10;
        return Math.sqrt((mx - n.x) ** 2 + (my - n.y) ** 2) < r + 5;
      });
      setSelectedNode(hit || null);
    };

    canvas.addEventListener("click", handleClick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("click", handleClick);
    };
  }, [graphData, filter]);

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5 glass flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">Knowledge Graph Explorer</h2>
            <p className="text-[10px] text-slate-400">
              {graphData ? `${graphData.nodes.length} entities · ${graphData.links.length} relationships` : "Loading..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as NodeType)}
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
        {/* Canvas */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <canvas ref={canvasRef} className="w-full h-full" />
          )}
        </div>

        {/* Side panel */}
        <div className="w-64 border-l border-white/5 glass p-4 overflow-y-auto scrollbar-thin shrink-0">
          {selectedNode ? (
            <div>
              <div
                className="w-3 h-3 rounded-full mb-3"
                style={{ backgroundColor: selectedNode.color }}
              />
              <h3 className="text-sm font-bold text-white mb-1">{selectedNode.label}</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ background: selectedNode.color + "22", color: selectedNode.color }}>
                {selectedNode.type}
              </span>
              <div className="mt-4 space-y-2">
                {Object.entries(selectedNode.data)
                  .filter(([k]) => !["type", "label", "color"].includes(k))
                  .map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">{k.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-300 font-medium break-words">{String(v)}</p>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-400">Click a node to inspect</p>
              </div>
              <div className="space-y-2">
                {Object.entries(COLOR_MAP).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[11px] text-slate-400">{TYPE_LABELS[type] || type}</span>
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
