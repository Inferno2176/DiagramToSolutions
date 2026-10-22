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
        <span className="w-8 h-8 rounded-lg bg-[#f0e8db] border border-[#E5E1D8] flex items-center justify-center text-[#6b6358] shrink-0 shadow-xs">
          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
        </span>
      );
    }
    return (
      <span className="w-8 h-8 rounded-lg bg-[#E7F0E8] border border-green-200/60 flex items-center justify-center text-[#397A55] shrink-0 shadow-xs">
        <span className="material-symbols-outlined text-[18px]">image</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-3 border-[#E7F0E8] border-t-[#397A55] rounded-full animate-spin mb-4" />
        <p className="text-[#73766F] text-sm font-label font-medium tracking-wide">
          Retrieving historic pipeline telemetry from database...
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#f0e8db] text-[#5e5548] border border-[#E5E1D8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#397A55]" />
              AUDIT RECORD &amp; TELEMETRY ARCHIVE
            </span>
            <span className="text-xs text-[#73766F] font-mono">Immutable Log</span>
          </div>
          <h1 className="font-headline font-bold text-3xl sm:text-4xl text-[#242820] tracking-tight leading-tight">
            Analysis History &amp; Spec Archives
          </h1>
          <p className="text-sm text-[#73766F] max-w-2xl leading-relaxed">
            Search and reopen previously generated architecture blueprints and engineering solutions without rerunning AI pipelines.
          </p>
        </div>

        <button
          onClick={() => navigateTo("upload")}
          className="px-4 py-2 rounded-xl bg-[#397A55] hover:bg-[#2E6345] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
          <span>Upload New Blueprint</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-[#FCE8E7] border border-red-200 text-[#A82826] rounded-2xl p-4 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-[#A82826] shrink-0">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => fetchHistory()} className="text-xs font-bold underline hover:text-black">
            Retry
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-6 border border-[#E5E1D8] shadow-[0_4px_20px_rgba(46,50,48,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full sm:max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-[#73766F]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by filename or architecture..."
              className="w-full pl-11 pr-4 py-2.5 bg-[#f5f1ea] border border-[#E5E1D8] rounded-xl text-[#242820] placeholder:text-[#73766F] text-xs font-body outline-none focus:border-[#397A55] focus:ring-1 focus:ring-[#397A55]/30 transition-all shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#73766F] hover:text-[#242820]"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1 bg-[#F2EFE7] border border-[#E5E1D8] p-1 rounded-xl w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "all"
                  ? "bg-[#397A55] text-white font-bold shadow-xs"
                  : "text-[#73766F] hover:text-[#242820] hover:bg-[#eae6de]"
              }`}
            >
              All ({history.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "completed"
                  ? "bg-[#397A55] text-white font-bold shadow-xs"
                  : "text-[#73766F] hover:text-[#242820] hover:bg-[#eae6de]"
              }`}
            >
              Completed ({history.filter(h => h.status?.toLowerCase() === "completed").length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("queue")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "queue"
                  ? "bg-[#397A55] text-white font-bold shadow-xs"
                  : "text-[#73766F] hover:text-[#242820] hover:bg-[#eae6de]"
              }`}
            >
              Processing
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("failed")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "failed"
                  ? "bg-[#397A55] text-white font-bold shadow-xs"
                  : "text-[#73766F] hover:text-[#242820] hover:bg-[#eae6de]"
              }`}
            >
              Failed
            </button>
          </div>

        </div>

        {/* History Table */}
        {filteredHistory.length === 0 ? (
          <div className="border border-[#E5E1D8] rounded-xl p-10 text-center space-y-2">
            <span className="material-symbols-outlined text-[#73766F] text-[36px]">history</span>
            <p className="text-[#242820] text-sm font-semibold">No historic records matching filter</p>
            <p className="text-[#73766F] text-xs">Try adjusting your search query or reset filter pills.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[#73766F] bg-[#f5f1ea]/80 border-y border-[#E5E1D8]">
                  <th className="py-3 px-4 rounded-l-lg font-bold">Source Diagram</th>
                  <th className="py-3 px-3 font-bold">Architecture Scope</th>
                  <th className="py-3 px-3 font-bold">Status</th>
                  <th className="py-3 px-3 font-bold">Timestamp</th>
                  <th className="py-3 px-4 rounded-r-lg font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#E5E1D8]/60">
                {filteredHistory.map((item) => {
                  const statusLower = item.status ? item.status.toLowerCase() : "";
                  const isCompleted = statusLower === "completed";

                  return (
                    <tr key={item.id} className="hover:bg-[#f5f1ea]/50 transition-colors group">
                      <td className="py-3.5 px-4 font-semibold text-[#242820] flex items-center gap-3">
                        {getFileIcon(item.filename)}
                        <div className="min-w-0 max-w-[240px]">
                          <span className="font-bold text-[#242820] block truncate group-hover:text-[#397A55] transition-colors" title={item.filename}>
                            {item.filename}
                          </span>
                          <span className="text-[11px] text-[#73766F] font-mono font-normal">
                            ID: #{item.id}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-xs text-[#242820]">
                        {item.architecture_name || (
                          <span className="text-[#73766F] italic">Synthesized Architecture</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E7F0E8] border border-green-200 text-[#2A5A3F]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#397A55]" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#ECE7DC] border border-[#E5E1D8] text-[#4F4A40]">
                            {getStatusLabel(item.status)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-xs text-[#73766F] font-mono">
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
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#397A55] text-white hover:bg-[#2E6345] shadow-xs transition-all"
                              >
                                View Report
                              </button>

                              {/* Download Toggle */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setDownloadDropdownId(downloadDropdownId === item.id ? null : item.id)}
                                  className="p-1 rounded-lg text-[#73766F] hover:text-[#242820] hover:bg-[#F2EFE7] border border-transparent hover:border-[#E5E1D8] transition-all flex items-center justify-center"
                                  title="Download"
                                >
                                  <span className="material-symbols-outlined text-[18px]">download</span>
                                </button>

                                {downloadDropdownId === item.id && (
                                  <div className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-[#E5E1D8] rounded-xl py-1 shadow-xl z-50 animate-fadeIn">
                                    <button
                                      type="button"
                                      onClick={() => handleDownload(item.id, item.filename, "pdf")}
                                      className="w-full px-3 py-1.5 text-xs text-left text-[#242820] hover:bg-[#F2EFE7] flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-[15px] text-[#A82826]">picture_as_pdf</span>
                                      Export PDF
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownload(item.id, item.filename, "markdown")}
                                      className="w-full px-3 py-1.5 text-xs text-left text-[#242820] hover:bg-[#F2EFE7] flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-[15px] text-[#397A55]">code</span>
                                      Markdown .md
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownload(item.id, item.filename, "json")}
                                      className="w-full px-3 py-1.5 text-xs text-left text-[#242820] hover:bg-[#F2EFE7] flex items-center gap-2"
                                    >
                                      <span className="material-symbols-outlined text-[15px] text-[#705c30]">data_object</span>
                                      Raw JSON
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
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F2EFE7] hover:bg-[#eae6de] border border-[#E5E1D8] text-[#242820] transition-all flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px] text-[#397A55]">sync</span>
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
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-[#E5E1D8] text-[#242820] shadow-xl animate-fadeIn">
          {downloadToast.type === "loading" ? (
            <div className="w-4 h-4 border-2 border-green-200 border-t-[#397A55] rounded-full animate-spin shrink-0" />
          ) : (
            <span
              className={`material-symbols-outlined text-[18px] shrink-0 ${
                downloadToast.type === "success" ? "text-[#397A55]" : "text-[#A82826]"
              }`}
            >
              {downloadToast.type === "success" ? "check_circle" : "error"}
            </span>
          )}
          <span className="text-xs font-medium text-[#242820]">{downloadToast.text}</span>
        </div>
      )}

    </div>
  );
}
