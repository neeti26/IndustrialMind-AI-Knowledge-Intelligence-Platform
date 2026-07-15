"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import CopilotPage from "@/components/CopilotPage";
import GraphPage from "@/components/GraphPage";
import CompliancePage from "@/components/CompliancePage";
import RiskPage from "@/components/RiskPage";
import MaintenancePage from "@/components/MaintenancePage";
import LessonsPage from "@/components/LessonsPage";
import DocumentsPage from "@/components/DocumentsPage";
import ExtractionPreview from "@/components/ExtractionPreview";

export type Page = "dashboard" | "copilot" | "graph" | "compliance" | "risk" | "maintenance" | "lessons" | "documents" | "extraction";

export default function Home() {
  const router = useRouter();
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth on mount
    const token = localStorage.getItem("auth_token");
    if (token) {
      setIsAuthenticated(true);
      setLoading(false);
    } else {
      router.push("/login");
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const renderPage = () => {
    switch (activePage) {
      case "dashboard": return <Dashboard onNavigate={setActivePage} />;
      case "copilot": return <CopilotPage />;
      case "graph": return <GraphPage />;
      case "compliance": return <CompliancePage />;
      case "risk": return <RiskPage />;
      case "maintenance": return <MaintenancePage />;
      case "lessons": return <LessonsPage />;
      case "documents": return <DocumentsPage />;
      case "extraction": return <ExtractionPreview />;
      default: return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0f1e]">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {renderPage()}
      </main>
    </div>
  );
}
