"use client";
import { useState } from "react";
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
  const [activePage, setActivePage] = useState<Page>("dashboard");

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":    return <Dashboard onNavigate={setActivePage} />;
      case "copilot":      return <CopilotPage />;
      case "graph":        return <GraphPage />;
      case "compliance":   return <CompliancePage />;
      case "risk":         return <RiskPage />;
      case "maintenance":  return <MaintenancePage />;
      case "lessons":      return <LessonsPage />;
      case "documents":    return <DocumentsPage />;
      case "extraction":   return <ExtractionPreview />;
      default:             return <Dashboard onNavigate={setActivePage} />;
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
