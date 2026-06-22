import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IndustrialMind — AI Knowledge Intelligence Platform",
  description:
    "AI-powered industrial knowledge intelligence: RAG copilot, knowledge graph, compliance monitoring, and risk intelligence for heavy industry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#0a0f1e]">{children}</body>
    </html>
  );
}
