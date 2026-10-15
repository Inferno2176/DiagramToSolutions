import React, { useState, useEffect } from "react";
import { downloadSpecification } from "../utils/exportReport";

const STATUS_MAPPING = {
  uploaded: "Uploaded",
  ocr_processing: "OCR Processing",
  ocr_completed: "OCR Completed",
  llm_processing: "AI Analysis",
  completed: "Completed",
  failed: "Failed",
  llm_quota_exceeded: "AI Quota Limited"
};

const getStatusLabel = (status) => {
  if (!status) return "";
  const s = status.toLowerCase();
  return STATUS_MAPPING[s] || status;
};

export default function History({ token, navigateTo, setSelectedDiagramId, onAuthError }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [downloadDropdownId, setDownloadDropdownId] = useState(null);
  const [downloadToast, setDownloadToast] = useState(null);

  const API_URL = "http://localhost:8000";

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        if (onAuthError) onAuthError();
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load pipeline logs");
      }
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleDownload = async (diagramId, filename, format) => {
    setDownloadDropdownId(null);
    setDownloadToast({
      type: "loading",
      text: `Exporting ${format.toUpperCase()} for ${filename || "blueprint"}...`,
    });

    try {
      const res = await downloadSpecification({
        diagramId,
        filename,
        format,
        token,
        API_URL,
      });

      setDownloadToast({
        type: "success",
        text: `Export complete: ${res?.filename || filename}`,
      });
      setTimeout(() => setDownloadToast(null), 3500);
    } catch (err) {
      setDownloadToast({
        type: "error",
        text: `Export failed: ${err.message || "Could not generate file"}`,
      });
      setTimeout(() => setDownloadToast(null), 4500);
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      !search ||
      item.filename?.toLowerCase().includes(search.toLowerCase()) ||
      item.architecture_name?.toLowerCase().includes(search.toLowerCase());

    const s = item.status ? item.status.toLowerCase() : "";
    if (statusFilter === "completed") return matchesSearch && s === "completed";
    if (statusFilter === "failed") return matchesSearch && ["failed", "llm_quota_exceeded"].includes(s);
    if (statusFilter === "queue") return matchesSearch && ["uploaded", "ocr_processing", "ocr_completed", "llm_processing"].includes(s);

    return matchesSearch;
  });

  const getFileIcon = (filename) => {
    const ext = filename?.split(".").pop().toLowerCase();
    if (ext === "pdf") {
      return (
        <span className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-400/20 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_8px_rgba(200,160,240,0.15)]">
          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
        </span>
      );
    }
    return (
      <span className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-400/20 flex items-center justify-center text-sky-400 shrink-0 shadow-[0_0_8px_rgba(56,189,248,0.15)]">
        <span className="material-symbols-outlined text-[18px]">image</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-3 border-sky-400/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-slate-300 text-sm font-label font-medium tracking-wide">
          Retrieving historic pipeline telemetry from PostgreSQL...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 animate-fadeIn">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-sky-950/60 text-sky-300 border border-sky-400/25">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              AUDIT RECORD &amp; TELEMETRY ARCHIVE
            </span>
            <span className="text-xs text-slate-400 font-mono">Immutable Log</span>
          </div>
          <h1 className="font-headline font-bold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
            Analysis History &amp; Spec Archives
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Search and reopen previously generated architecture blueprints and engineering solutions without rerunning AI pipelines.
          </p>
        </div>

        <button
          onClick={() => navigateTo("upload")}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center gap-1.5 shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
          <span>Upload New Blueprint</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl p-4 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-red-400 shrink-0">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => fetchHistory()} className="text-xs font-bold underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full sm:max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by filename or architecture..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-sky-400/20 rounded-xl text-white placeholder:text-slate-500 text-xs font-body outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1 bg-slate-900/80 border border-sky-500/15 p-1 rounded-xl w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "all"
                  ? "bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All ({history.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "completed"
                  ? "bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Completed ({history.filter(h => h.status?.toLowerCase() === "completed").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("queue")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "queue"
                  ? "bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Processing
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("failed")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "failed"
                  ? "bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Failed
            </button>
          </div>

        </div>

        {/* History Table */}
        {filteredHistory.length === 0 ? (
          <div className="border border-sky-400/15 rounded-xl p-10 text-center space-y-2">
            <span className="material-symbols-outlined text-slate-500 text-[36px]">history</span>
            <p className="text-slate-300 text-sm font-semibold">No historic records matching filter</p>
            <p className="text-slate-500 text-xs">Try adjusting your search query or reset filter pills.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/60 border-y border-sky-500/10">
                  <th className="py-3 px-4 rounded-l-lg font-bold">Source Diagram</th>
                  <th className="py-3 px-3 font-bold">Architecture Scope</th>
                  <th className="py-3 px-3 font-bold">Status</th>
                  <th className="py-3 px-3 font-bold">Timestamp</th>
                  <th className="py-3 px-4 rounded-r-lg font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-sky-500/5">
                {filteredHistory.map((item) => {
                  const statusLower = item.status ? item.status.toLowerCase() : "";
                  const isCompleted = statusLower === "completed";

                  return (
                    <tr key={item.id} className="hover:bg-sky-500/[0.04] transition-colors group">
                      <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center gap-3">
                        {getFileIcon(item.filename)}
                        <div className="min-w-0 max-w-[240px]">
                          <span className="font-bold text-slate-100 block truncate group-hover:text-primary transition-colors" title={item.filename}>
                            {item.filename}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono font-normal">
                            ID: #{item.id}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-xs text-slate-300">
                        {item.architecture_name || (
                          <span className="text-slate-500 italic">Synthesized Architecture</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-950/60 border border-sky-400/30 text-sky-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 border border-slate-700 text-slate-400">
                            {getStatusLabel(item.status)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-xs text-slate-400 font-mono">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end relative">
                          {isCompleted ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDiagramId(item.id);
                                  navigateTo("results");
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 hover:brightness-110 shadow-[0_0_10px_rgba(56,189,248,0.25)] transition-all"
                              >
                                View Report
                              </button>

                              {/* Download Toggle */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setDownloadDropdownId(downloadDropdownId === item.id ? null : item.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 border border-transparent hover:border-sky-400/20 transition-all flex items-center justify-center"
                                  title="Download"
                                >
                                  <span className="material-symbols-outlined text-[18px]">download</span>
                                </button>

                                {downloadDropdownId === item.id && (
                                  <div className="absolute right-0 bottom-full mb-1 w-36 bg-[#111828] border border-sky-400/25 rounded-xl py-1 shadow-2xl z-50 animate-fadeIn">
                                    <button
                                      type="button"
                                      onClick={() => handleDownload(item.id, item.filename, "pdf")}
                                      className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-sky-500/15 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-[15px] text-red-400">picture_as_pdf</span>
                                      PDF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownload(item.id, item.filename, "markdown")}
                                      className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-sky-500/15 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-[15px] text-sky-400">code</span>
                                      Markdown
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownload(item.id, item.filename, "json")}
                                      className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-sky-500/15 flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-[15px] text-purple-400">data_object</span>
                                      JSON
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDiagramId(item.id);
                                navigateTo("progress");
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-950/60 border border-sky-400/30 text-sky-300 hover:bg-sky-400/10 transition-all flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">sync</span>
                              Inspect State
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Floating Download Toast Notification */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900/95 border border-sky-400/30 text-white shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md animate-fadeIn">
          {downloadToast.type === "loading" ? (
            <div className="w-4 h-4 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin shrink-0" />
          ) : (
            <span
              className={`material-symbols-outlined text-[18px] shrink-0 ${
                downloadToast.type === "success" ? "text-cyan-400" : "text-red-400"
              }`}
            >
              {downloadToast.type === "success" ? "check_circle" : "error"}
            </span>
          )}
          <span className="text-xs font-medium text-slate-200">{downloadToast.text}</span>
        </div>
      )}

    </div>
  );
}
