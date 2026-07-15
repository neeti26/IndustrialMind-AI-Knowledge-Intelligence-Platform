"use client";
import {
  LayoutDashboard,
  MessageSquare,
  Network,
  ShieldAlert,
  Flame,
  Brain,
  ChevronRight,
  Wrench,
  BookOpen,
  FileText,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Page } from "@/app/page";

interface Props {
  activePage: Page;
  onNavigate: (p: Page) => void;
}

const NAV = [
  { id: "dashboard" as Page, icon: LayoutDashboard, label: "Dashboard", sub: "Overview" },
  { id: "copilot" as Page, icon: MessageSquare, label: "AI Copilot", sub: "Ask anything" },
  { id: "graph" as Page, icon: Network, label: "Knowledge Graph", sub: "Entity explorer" },
  { id: "compliance" as Page, icon: ShieldAlert, label: "Compliance", sub: "Gap analysis" },
  { id: "risk" as Page, icon: Flame, label: "Risk Intelligence", sub: "Hazard analysis" },
  { id: "maintenance" as Page, icon: Wrench, label: "Maintenance Intel", sub: "Predictive + RCA" },
  { id: "lessons" as Page, icon: BookOpen, label: "Lessons Learned", sub: "Failure patterns" },
  { id: "documents" as Page, icon: FileText, label: "Documents", sub: "Upload & manage" },
  { id: "extraction" as Page, icon: FileText, label: "Extraction", sub: "Preview & rebuild" },
];

export default function Sidebar({ activePage, onNavigate }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setUser(localStorage.getItem("auth_user"));
    setRole(localStorage.getItem("auth_role"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_role");
    router.push("/login");
  };

  return (
    <aside className="w-64 h-screen flex flex-col glass border-r border-white/5 shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">IndustrialMind</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">AI Intelligence Platform</p>
          </div>
        </div>
      </div>

      {/* Plant Badge */}
      <div className="mx-4 mt-4 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold">Active Plant</p>
        <p className="text-xs text-white font-medium mt-0.5">Visakhapatnam FC — Area 3</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400">Live Monitoring</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 mt-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${active
                  ? "bg-blue-600/20 border border-blue-500/30 text-white"
                  : "hover:bg-white/5 text-slate-400 hover:text-white border border-transparent"
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? "text-blue-400" : ""}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${active ? "text-white" : ""}`}>{item.label}</p>
                <p className="text-[10px] text-slate-500 truncate">{item.sub}</p>
              </div>
              {active && <ChevronRight className="w-3 h-3 text-blue-400" />}
            </button>
          );
        })}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-white/5 space-y-3">
        {user && (
          <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Logged in as</p>
            <p className="text-xs font-semibold text-white mt-0.5">{user}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-semibold transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Bottom status */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">System Status</span>
          <span className="text-[10px] text-green-400 font-medium">Operational</span>
        </div>
        <div className="grid grid-cols-4 gap-1 mt-2">
          {[
            { label: "RAG", ok: true },
            { label: "Graph", ok: true },
            { label: "AI", ok: true },
            { label: "RCA", ok: true },
          ].map((s) => (
            <div key={s.label} className="text-center py-1.5 rounded-md bg-white/5">
              <span className={`text-[8px] font-bold uppercase ${s.ok ? "text-green-400" : "text-red-400"}`}>
                {s.ok ? "●" : "○"} {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
