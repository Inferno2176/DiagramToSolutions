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

export default function Dashboard({ token, navigateTo, setSelectedDiagramId, onAuthError }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [downloadDropdownId, setDownloadDropdownId] = useState(null);
  const [downloadToast, setDownloadToast] = useState(null);

  const API_URL = "http://localhost:8000";

  const fetchStats = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch(`${API_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        if (onAuthError) onAuthError();
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load dashboard metrics");
      }
      const data = await res.json();
      setStats(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
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

  // Filter projects list
  const recentProjects = stats?.recent_projects || [];
  const filteredProjects = recentProjects.filter((item) => {
    const s = item.status ? item.status.toLowerCase() : "";
    if (filter === "completed") return s === "completed";
    if (filter === "queue") return ["uploaded", "ocr_processing", "ocr_completed", "llm_processing"].includes(s);
    if (filter === "failed") return ["failed", "llm_quota_exceeded"].includes(s);
    return true;
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
          Aggregating platform intelligence and cluster telemetry...
        </p>
      </div>
    );
  }

  const totalUploads = stats?.total_uploads ?? 0;
  const completedAnalyses = stats?.completed_analyses ?? 0;
  const successRate = totalUploads > 0 ? `${Math.round((completedAnalyses / totalUploads) * 100)}%` : "100%";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 animate-fadeIn">
      
      {/* Top Action / Telemetry Breadcrumb Bar matching dashboard_glacier.html */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-sky-950/60 text-sky-300 border border-sky-400/25 shadow-[0_0_12px_rgba(56,189,248,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
              DEV TELEMETRY &amp; PIPELINE / us-east-prod-04
            </span>
            <span className="text-xs text-slate-400 font-mono">Cluster v2.5.4-rev3</span>
          </div>
          <h1 className="font-headline font-bold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
            Developer Operations Dashboard
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Live cluster telemetry, asynchronous pipeline execution state, and synthesized software architecture blueprints.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-sky-500/20 text-slate-300 hover:text-white hover:border-sky-400/40 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm backdrop-blur-md"
            title="Refresh statistics"
          >
            <span className={`material-symbols-outlined text-[17px] ${refreshing ? "animate-spin text-primary" : "text-sky-400"}`}>
              sync
            </span>
            <span>{refreshing ? "Refreshing..." : "Sync Telemetry"}</span>
          </button>

          <button
            onClick={() => navigateTo("upload")}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            <span>Upload Blueprint</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-red-400 shrink-0">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => fetchStats()} className="text-xs font-bold underline hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* 3 High-Density Telemetry KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* KPI 1: Total Uploads */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-sky-400/30 transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-label">
                Total Uploaded Diagrams
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="font-headline text-3xl font-extrabold text-white tracking-tight">
                  {totalUploads}
                </span>
                <span className="text-xs text-sky-400 font-mono font-medium">blueprints</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(56,189,248,0.2)]">
              <span className="material-symbols-outlined text-[22px]">layers</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-sky-500/10 flex items-center justify-between text-xs text-slate-400">
            <span>Ingestion pipeline source</span>
            <span className="inline-flex items-center gap-1 font-semibold text-sky-300">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Live Telemetry
            </span>
          </div>
        </div>

        {/* KPI 2: Completed Analyses */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-400/30 transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-label">
                Completed Analyses
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="font-headline text-3xl font-extrabold text-emerald-400 tracking-tight">
                  {completedAnalyses}
                </span>
                <span className="text-xs text-emerald-400/80 font-mono font-medium">specs synthesized</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-sky-500/10 flex items-center justify-between text-xs text-slate-400">
            <span>OCR &amp; Gemini outputs</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              100% OCR Parity
            </span>
          </div>
        </div>

        {/* KPI 3: Pipeline Success Rate */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-purple-400/30 transition-all sm:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-label">
                Pipeline Success Rate
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="font-headline text-3xl font-extrabold text-purple-300 tracking-tight">
                  {successRate}
                </span>
                <span className="text-xs text-purple-300/80 font-mono font-medium">nominal</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-400/25 flex items-center justify-center text-purple-300 shadow-[0_0_12px_rgba(200,160,240,0.2)]">
              <span className="material-symbols-outlined text-[22px]">bolt</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-sky-500/10 flex items-center justify-between text-xs text-slate-400">
            <span>Zero-drop at peak burst</span>
            <span className="inline-flex items-center gap-1 font-semibold text-purple-300">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Multi-Region HA
            </span>
          </div>
        </div>

      </div>

      {/* Main Split Layout: 8 cols for Recent Projects Table, 4 cols for Architecture Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols): Data Table & Projects */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            
            {/* Table Header & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-sky-500/10">
              <div>
                <h2 className="font-headline font-bold text-xl text-white tracking-tight">
                  Recent Architecture Projects
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Asynchronous OCR and Gemini architecture pipeline runs
                </p>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 bg-slate-900/80 border border-sky-500/15 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === "all"
                      ? "bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({recentProjects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("completed")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === "completed"
                      ? "bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Completed ({recentProjects.filter(p => p.status?.toLowerCase() === "completed").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("queue")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === "queue"
                      ? "bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Queue
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("failed")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === "failed"
                      ? "bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-bold shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Failed
                </button>
              </div>
            </div>

            {/* Empty State */}
            {filteredProjects.length === 0 ? (
              <div className="border-2 border-dashed border-sky-400/15 rounded-xl p-10 flex flex-col items-center justify-center text-center mt-6 min-h-[220px]">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-primary mb-3 shadow-[0_0_15px_rgba(56,189,248,0.15)]">
                  <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                </div>
                <p className="text-slate-200 text-sm font-semibold">No diagram parsed yet</p>
                <p className="text-slate-400 text-xs mt-1 max-w-sm">
                  Upload a software architecture diagram, microservice layout, or network topology to extract OCR text and synthesize solutions.
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo("upload")}
                  className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 text-xs font-bold shadow-[0_0_16px_rgba(56,189,248,0.3)] hover:brightness-110 transition-all"
                >
                  Upload your first blueprint
                </button>
              </div>
            ) : (
              /* Projects Table */
              <div className="overflow-x-auto -mx-6 px-6 pt-3">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/60 border-y border-sky-500/10">
                      <th className="py-3 px-4 rounded-l-lg font-bold">Source Blueprint</th>
                      <th className="py-3 px-3 font-bold">Status</th>
                      <th className="py-3 px-3 font-bold">Timestamp</th>
                      <th className="py-3 px-4 rounded-r-lg font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-sky-500/5">
                    {filteredProjects.map((item) => {
                      const statusLower = item.status ? item.status.toLowerCase() : "";
                      const isCompleted = statusLower === "completed";
                      const isProcessing = ["ocr_processing", "ocr_completed", "llm_processing"].includes(statusLower);
                      const isQuotaExceeded = statusLower === "llm_quota_exceeded";
                      const isFailed = statusLower === "failed";

                      return (
                        <tr key={item.id} className="hover:bg-sky-500/[0.04] transition-colors group">
                          {/* File Icon + Name */}
                          <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center gap-3">
                            {getFileIcon(item.filename)}
                            <div className="min-w-0 max-w-[220px]">
                              <span className="font-bold text-slate-100 block truncate group-hover:text-primary transition-colors" title={item.filename}>
                                {item.filename}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono font-normal">
                                ID: #{item.id}
                              </span>
                            </div>
                          </td>

                          {/* Status Pill with Glow Dot */}
                          <td className="py-3.5 px-3">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-950/60 border border-sky-400/30 text-sky-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                                Completed
                              </span>
                            ) : isProcessing ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-950/60 border border-purple-400/30 text-purple-300 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                                {getStatusLabel(item.status)}
                              </span>
                            ) : isQuotaExceeded ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/60 border border-amber-400/30 text-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Quota Limited
                              </span>
                            ) : isFailed ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-950/60 border border-red-400/30 text-red-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 border border-slate-700 text-slate-400">
                                Uploaded
                              </span>
                            )}
                          </td>

                          {/* Upload Date */}
                          <td className="py-3.5 px-3 text-xs text-slate-400 font-mono">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>

                          {/* Actions */}
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
                                    View Spec
                                  </button>

                                  {/* Download Dropdown Toggle */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setDownloadDropdownId(downloadDropdownId === item.id ? null : item.id)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-sky-500/10 border border-transparent hover:border-sky-400/20 transition-all flex items-center justify-center"
                                      title="Download Specification"
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
                                          Export PDF
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDownload(item.id, item.filename, "markdown")}
                                          className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-sky-500/15 flex items-center gap-2"
                                        >
                                          <span className="material-symbols-outlined text-[15px] text-sky-400">code</span>
                                          Markdown .md
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDownload(item.id, item.filename, "json")}
                                          className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:text-white hover:bg-sky-500/15 flex items-center gap-2"
                                        >
                                          <span className="material-symbols-outlined text-[15px] text-purple-400">data_object</span>
                                          Raw JSON
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (isFailed || isQuotaExceeded) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDiagramId(item.id);
                                    navigateTo("progress");
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-950/60 border border-sky-400/30 text-sky-300 hover:bg-sky-400/10 transition-all flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">sync</span>
                                  Retry Analysis
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDiagramId(item.id);
                                    navigateTo("progress");
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 border border-sky-500/20 text-slate-200 transition-all flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-purple-400">hourglass_top</span>
                                  Track Pipeline
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

            {/* Table Footer */}
            <div className="pt-4 mt-2 border-t border-sky-500/10 flex items-center justify-between text-xs text-slate-400">
              <span>Showing {filteredProjects.length} of {recentProjects.length} total runs</span>
              <button
                type="button"
                onClick={() => navigateTo("history")}
                className="text-primary hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <span>View Full Telemetry Log</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Pipeline Architecture Guide */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Workflow Card */}
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary font-label">
                  End-to-End Pipeline
                </span>
              </div>
              <h3 className="font-headline font-bold text-lg text-white mt-1">
                Decomposition Stages
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex gap-3.5 items-start">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-400/20 text-primary font-mono font-bold flex items-center justify-center shrink-0">
                  01
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm">Upload Diagram</h4>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Upload PNG, JPG, JPEG, or PDF system architecture diagrams up to 15MB.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-400/20 text-purple-300 font-mono font-bold flex items-center justify-center shrink-0">
                  02
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm">OCR Text &amp; Token Mining</h4>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    PaddleOCR extracts technology names, labels, and microservice nodes with bounding boxes.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0">
                  03
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm">Gemini Architecture Synthesis</h4>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Multi-modal reasoning compiles workflows, APIs, components, and PostgreSQL schemas.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-sky-500/10">
              <button
                type="button"
                onClick={() => navigateTo("upload")}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0f172a] hover:bg-[#15223c] border border-sky-400/20 text-sky-300 font-label text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                Launch Ingestion Pipeline
              </button>
            </div>
          </div>

          {/* Infrastructure Health Status Card */}
          <div className="glass-panel-subtle rounded-2xl p-5 border border-sky-400/15 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-400">database</span>
                PostgreSQL Cluster
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>PaddleOCR Status</span>
              <span className="text-sky-300 font-semibold">INITIALIZED</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Gemini Engine</span>
              <span className="text-purple-300 font-semibold">PROVISIONED</span>
            </div>
          </div>

        </div>

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
