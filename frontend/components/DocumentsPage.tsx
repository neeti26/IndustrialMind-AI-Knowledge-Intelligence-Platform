"use client";
import { useEffect, useState, useRef } from "react";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2,
  Database, RefreshCw, Tag, Search, Cpu
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

interface DocEntry {
  filename: string;
  size_kb: number;
}

interface IngestionStatus {
  collection: string;
  total_chunks: number;
  ready: boolean;
}

interface ExtractedEntities {
  equipment_tags: string[];
  work_orders: string[];
  incident_ids: string[];
  regulations: string[];
  chemicals: string[];
  total_unique_entities: number;
}

interface UploadResult {
  status: string;
  filename: string;
  ingestion: { ingested: string[]; total_chunks: number };
  entities_extracted?: ExtractedEntities & { total_entities: number };
}

const DOC_TYPE_ICON: Record<string, string> = {
  txt: "📄",
  pdf: "📑",
};

const SAMPLE_DOCS = [
  { filename: "maintenance_procedure_P101.txt", size_kb: 4.2, type: "Maintenance Procedure" },
  { filename: "incident_report_IR2024_047.txt", size_kb: 3.8, type: "Incident Report" },
  { filename: "oisd_116_extract.txt", size_kb: 2.9, type: "Regulatory Standard" },
  { filename: "work_orders_log.txt", size_kb: 2.1, type: "Work Order Log" },
  { filename: "regulatory_compliance_audit.txt", size_kb: 3.3, type: "Compliance Audit" },
  { filename: "oem_manual_he301.txt", size_kb: 5.1, type: "OEM Manual" },
  { filename: "sop_area3_emergency.txt", size_kb: 4.8, type: "Emergency SOP" },
  { filename: "inspection_checklist_he301.txt", size_kb: 3.7, type: "Inspection Checklist" },
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [status, setStatus] = useState<IngestionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadEntities, setUploadEntities] = useState<UploadResult["entities_extracted"] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [corpusEntities, setCorpusEntities] = useState<ExtractedEntities | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const [docRes, statusRes] = await Promise.all([
        apiGet<{ documents: DocEntry[]; total: number }>("/documents/list"),
        apiGet<IngestionStatus>("/documents/status"),
      ]);
      setDocs(docRes.documents);
      setStatus(statusRes);
      // Also fetch corpus entities
      try {
        const corpusRes = await apiGet<{ aggregate: ExtractedEntities }>("/documents/corpus-entities");
        setCorpusEntities(corpusRes.aggregate);
      } catch { /* backend offline — corpus entities not critical */ }
    } catch {
      // show static data if backend offline
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async () => {
    setIngesting(true);
    try {
      await apiPost("/documents/ingest", {});
      await fetchDocs();
      setUploadMsg({ type: "success", text: "Re-ingestion complete — vector store updated." });
    } catch {
      setUploadMsg({ type: "error", text: "Backend not connected. Start the FastAPI server to ingest documents." });
    } finally {
      setIngesting(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith(".txt") && !file.name.endsWith(".pdf")) {
      setUploadMsg({ type: "error", text: "Only .txt and .pdf files are supported." });
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const base = typeof window !== "undefined" ? "/api/proxy" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
      const res = await fetch(`${base}/documents/upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const result: UploadResult = await res.json();
      setUploadMsg({ type: "success", text: `"${result.filename}" uploaded and ingested. ${result.ingestion.total_chunks} chunks in vector store.` });
      if (result.entities_extracted) setUploadEntities(result.entities_extracted);
      fetchDocs();
    } catch (e) {
      setUploadMsg({ type: "error", text: `Upload failed: ${String(e)}` });
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  useEffect(() => { fetchDocs(); }, []);

  const displayDocs = docs.length > 0 ? docs : SAMPLE_DOCS;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Document Intelligence Hub</h2>
          <p className="text-slate-400 text-sm mt-1">
            Ingest, manage, and search your industrial document corpus
          </p>
        </div>
        <button
          onClick={fetchDocs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/10 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Vector store status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 border border-blue-400/20 bg-blue-400/5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-slate-400">Vector Store</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">{status?.total_chunks ?? 34}</p>
          <p className="text-[11px] text-slate-500 mt-1">indexed chunks</p>
        </div>
        <div className="glass rounded-xl p-4 border border-emerald-400/20 bg-emerald-400/5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <p className="text-xs text-slate-400">Documents</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{displayDocs.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">in corpus</p>
        </div>
        <div className="glass rounded-xl p-4 border border-violet-400/20 bg-violet-400/5">
          <div className="flex items-center gap-2 mb-2">
            {status?.ready ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
            <p className="text-xs text-slate-400">RAG Status</p>
          </div>
          <p className={`text-sm font-bold ${status?.ready ? "text-emerald-400" : "text-amber-400"}`}>
            {status?.ready ? "Ready" : "Needs Ingestion"}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{status?.collection || "industrialmind_docs"}</p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 p-8 text-center cursor-pointer
          ${dragOver ? "border-blue-400 bg-blue-400/10" : "border-white/10 hover:border-white/20 hover:bg-white/3"}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept=".txt,.pdf" className="hidden" onChange={onFileChange} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            <p className="text-sm text-slate-400">Uploading and ingesting document...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Drop a document here</p>
              <p className="text-xs text-slate-500 mt-1">
                Supports .txt and .pdf — maintenance procedures, incident reports, regulatory docs, inspection records
              </p>
            </div>
            <span className="text-xs text-blue-400 border border-blue-400/30 px-3 py-1.5 rounded-lg">
              Browse Files
            </span>
          </div>
        )}
      </div>

      {/* Upload message */}
      {uploadMsg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
          uploadMsg.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          {uploadMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {uploadMsg.text}
        </div>
      )}

      {/* Re-ingest button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleIngest}
          disabled={ingesting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {ingesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Re-ingest All Documents
        </button>
        <p className="text-xs text-slate-500">Updates the ChromaDB vector store with latest documents</p>
      </div>

      {/* Document list */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-blue-400" />
          Document Corpus ({displayDocs.length} files)
        </h3>
        <div className="space-y-2">
          {displayDocs.map((doc) => {
            const ext = doc.filename.split(".").pop() || "txt";
            const icon = DOC_TYPE_ICON[ext] || "📄";
            const docType = "doc_type" in doc ? (doc as { doc_type?: string }).doc_type : undefined;
            return (
              <div
                key={doc.filename}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-colors"
              >
                <span className="text-xl shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doc.filename}</p>
                  {docType && (
                    <p className="text-[10px] text-slate-500">{docType}</p>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 shrink-0">{doc.size_kb} KB</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Indexed" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload entity results */}
      {uploadEntities && (
        <div className="glass rounded-xl p-5 border border-emerald-500/20 bg-emerald-500/3">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Entities Extracted from Upload</h3>
            <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
              {uploadEntities.total_entities} total
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Equipment Tags", items: uploadEntities.equipment_tags, color: "text-blue-400 bg-blue-400/10" },
              { label: "Work Orders", items: uploadEntities.work_orders, color: "text-amber-400 bg-amber-400/10" },
              { label: "Regulations", items: uploadEntities.regulations, color: "text-emerald-400 bg-emerald-400/10" },
            ].map(cat => cat.items?.length ? (
              <div key={cat.label}>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-1.5">{cat.label}</p>
                <div className="flex flex-wrap gap-1">
                  {cat.items.map((item: string) => (
                    <span key={item} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${cat.color}`}>{item}</span>
                  ))}
                </div>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* Corpus-wide entities */}
      {corpusEntities && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Corpus Entity Index</h3>
            <span className="text-[10px] text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-full border border-violet-400/20">
              {corpusEntities.total_unique_entities} unique entities
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {corpusEntities.equipment_tags?.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-2">⚙️ Equipment Tags ({corpusEntities.equipment_tags.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {corpusEntities.equipment_tags.map(t => (
                    <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-400/10 border border-blue-400/20 text-blue-300">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {corpusEntities.work_orders?.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-2">🔧 Work Orders ({corpusEntities.work_orders.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {corpusEntities.work_orders.map(w => (
                    <span key={w} className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-300">{w}</span>
                  ))}
                </div>
              </div>
            )}
            {corpusEntities.regulations?.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-2">📖 Regulations ({corpusEntities.regulations.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {corpusEntities.regulations.slice(0, 8).map(r => (
                    <span key={r} className="text-[10px] px-2 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20 text-emerald-300">{r}</span>
                  ))}
                </div>
              </div>
            )}
            {corpusEntities.chemicals?.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-2">⚗️ Chemicals ({corpusEntities.chemicals.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {corpusEntities.chemicals.map(c => (
                    <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-400/10 border border-orange-400/20 text-orange-300">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document type guide */}
      <div className="glass rounded-xl p-5 border border-white/5">
        <h3 className="text-sm font-semibold text-white mb-3">Supported Document Types</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { type: "Maintenance Procedures", icon: "🔧", formats: ".txt, .pdf" },
            { type: "Incident Reports", icon: "🚨", formats: ".txt, .pdf" },
            { type: "Regulatory Standards", icon: "📖", formats: ".txt, .pdf" },
            { type: "Inspection Records", icon: "✅", formats: ".txt, .pdf" },
            { type: "Work Order Logs", icon: "📋", formats: ".txt" },
            { type: "Compliance Audits", icon: "🛡️", formats: ".txt, .pdf" },
          ].map(dt => (
            <div key={dt.type} className="p-3 rounded-xl bg-white/3 border border-white/5">
              <span className="text-lg">{dt.icon}</span>
              <p className="text-xs font-medium text-white mt-1">{dt.type}</p>
              <p className="text-[10px] text-slate-500">{dt.formats}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
