"use client";
import { useState } from "react";
import { previewExtract, ingestDryrun, rebuildGraph } from "@/lib/api";

export default function ExtractionPreview() {
    const [results, setResults] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);

    const loadPreview = async () => {
        setLoading(true);
        try {
            const res = await previewExtract();
            setResults(res.documents || []);
        } catch (e) {
            setResults([{ error: String(e) }]);
        } finally {
            setLoading(false);
        }
    };

    const runDry = async () => {
        setLoading(true);
        try {
            const res = await ingestDryrun();
            setResults(res.documents || []);
        } catch (e) {
            setResults([{ error: String(e) }]);
        } finally {
            setLoading(false);
        }
    };

    const rebuild = async () => {
        setLoading(true);
        try {
            await rebuildGraph();
            alert("Graph rebuild triggered — refresh graph explorer to see changes.");
        } catch (e) {
            alert("Graph rebuild failed: " + String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 space-y-3">
            <div className="flex gap-2">
                <button onClick={loadPreview} className="px-3 py-2 rounded bg-blue-600 text-white">Preview Extraction</button>
                <button onClick={runDry} className="px-3 py-2 rounded bg-amber-500 text-white">Ingest Dry-run</button>
                <button onClick={rebuild} className="px-3 py-2 rounded bg-green-600 text-white">Rebuild Graph</button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
                {loading && <p className="text-sm text-slate-400">Loading…</p>}
                {!loading && results && (
                    <div className="space-y-4">
                        {results.map((r, idx) => (
                            <div key={idx} className="p-3 rounded border border-white/5 bg-white/2">
                                <h4 className="text-sm font-semibold">{r.filename || r.error}</h4>
                                {r.entities ? (
                                    <div className="text-xs text-slate-300 mt-2">
                                        <p><strong>Equipment:</strong> {(r.entities.equipment_tags || []).join(', ')}</p>
                                        <p><strong>Work Orders:</strong> {(r.entities.work_orders || []).join(', ')}</p>
                                        <p><strong>Incidents:</strong> {(r.entities.incident_ids || []).join(', ')}</p>
                                        <p><strong>Regulations:</strong> {(r.entities.regulations || []).slice(0, 5).join(', ')}</p>
                                        <p><strong>Confidence:</strong> {r.entities.entity_confidence}</p>
                                        {r.chunks && r.chunks.length > 0 && (
                                            <details className="mt-2 text-xs text-slate-400">
                                                <summary>Chunks ({r.chunks.length})</summary>
                                                {r.chunks.map((c: any, i: number) => (
                                                    <pre key={i} className="whitespace-pre-wrap text-[11px] mt-2">{c.content.slice(0, 400)}{c.content.length > 400 ? '…' : ''}</pre>
                                                ))}
                                            </details>
                                        )}
                                    </div>
                                ) : (
                                    <pre className="text-xs text-red-400">{JSON.stringify(r, null, 2)}</pre>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
