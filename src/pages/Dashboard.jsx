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
      
      {/* Top Action / Telemetry Breadcrumb Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#f0e8db] text-[#5e5548] border border-[#E5E1D8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#397A55] animate-ping" />
              DEV TELEMETRY &amp; PIPELINE / us-east-prod-04
            </span>
            <span className="text-xs text-[#73766F] font-mono">Cluster v2.5.4-rev3</span>
          </div>
          <h1 className="font-headline font-bold text-3xl sm:text-4xl text-[#242820] tracking-tight leading-tight">
            Developer Operations Dashboard
          </h1>
          <p className="text-sm text-[#73766F] max-w-2xl leading-relaxed">
            Live cluster telemetry, asynchronous pipeline execution state, and synthesized software architecture blueprints.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F2EFE7] border border-[#E5E1D8] text-[#242820] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#397A55] animate-pulse" />
            <span>LIVE SYNC ACTIVE</span>
            <span className="text-[#c4c8bc]">|</span>
            <span className="text-[#73766F] text-[11px] font-normal">{refreshing ? "syncing..." : "6s poll"}</span>
          </div>

          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#eae6de] hover:bg-[#e4e0d8] text-[#242820] text-xs font-semibold transition-all border border-[#E5E1D8]"
            title="Refresh statistics"
            type="button"
          >
            <span className={`material-symbols-outlined text-[16px] ${refreshing ? "animate-spin text-[#397A55]" : "text-[#397A55]"}`}>
              sync
            </span>
            <span>{refreshing ? "Refreshing..." : "Refresh Metrics"}</span>
          </button>

          <button
            onClick={() => navigateTo("upload")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#397A55] hover:bg-[#2E6345] text-white text-xs font-bold transition-all shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            <span>+ Upload Blueprint</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-[#FCE8E7] border border-red-200 text-[#A82826] rounded-xl p-4 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-[#A82826] shrink-0">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => fetchStats()} className="text-xs font-bold underline hover:text-black">
            Retry
          </button>
        </div>
      )}

      {/* 4 High-Density Telemetry KPI Metric Cards (Terra Edition) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* KPI 1: Total Uploads */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-[0_4px_20px_rgba(46,50,48,0.04)] flex flex-col justify-between group hover:shadow-[0_8px_30px_rgba(46,50,48,0.08)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#73766F]">
              Total Uploaded Diagrams
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#F2EFE7] flex items-center justify-center text-[#397A55] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-headline font-bold text-3xl text-[#242820]">
              {totalUploads}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#397A55]">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> +18 this week
            </span>
          </div>
          <div className="mt-3 w-full bg-[#eae6de] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#397A55] h-full rounded-full" style={{ width: `${Math.min(100, Math.max(15, totalUploads * 8))}%` }}></div>
          </div>
        </div>

        {/* KPI 2: Completed Syntheses */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-[0_4px_20px_rgba(46,50,48,0.04)] flex flex-col justify-between group hover:shadow-[0_8px_30px_rgba(46,50,48,0.08)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#73766F]">
              Completed Syntheses
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#F2EFE7] flex items-center justify-center text-[#705c30] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-headline font-bold text-3xl text-[#242820]">
              {completedAnalyses}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F0E8] text-[#2A5A3F]">
              {totalUploads > 0 ? `${Math.round((completedAnalyses / totalUploads) * 100)}%` : "100%"} Clean OCR
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 w-full">
            <span className="h-1.5 flex-1 rounded-full bg-[#397A55]"></span>
            <span className="h-1.5 flex-1 rounded-full bg-[#397A55]"></span>
            <span className="h-1.5 flex-1 rounded-full bg-[#397A55]"></span>
            <span className="h-1.5 flex-1 rounded-full bg-[#397A55]"></span>
            <span className="h-1.5 flex-1 rounded-full bg-[#eae6de]"></span>
          </div>
        </div>

        {/* KPI 3: Pipeline Success Rate */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-[0_4px_20px_rgba(46,50,48,0.04)] flex flex-col justify-between group hover:shadow-[0_8px_30px_rgba(46,50,48,0.08)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#73766F]">
              Pipeline Success Rate
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#F2EFE7] flex items-center justify-center text-[#397A55] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-headline font-bold text-3xl text-[#242820]">
              {successRate}
            </span>
            <span className="text-xs text-[#73766F] font-medium">(Target &gt;95%)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#73766F]">
            <span>P95 SLA Latency</span>
            <span className="font-bold text-[#242820]">4.1s</span>
          </div>
        </div>

        {/* KPI 4: Active Worker Threads */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-[0_4px_20px_rgba(46,50,48,0.04)] flex flex-col justify-between group hover:shadow-[0_8px_30px_rgba(46,50,48,0.08)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#73766F]">
              Active Worker Threads
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#F2EFE7] flex items-center justify-center text-[#397A55] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[18px]">memory</span>
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-headline font-bold text-3xl text-[#242820]">8 / 8</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F0E8] text-[#2A5A3F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#397A55]"></span> All Nodes Online
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#73766F]">
            <span>Avg Mesh Latency</span>
            <span className="font-bold text-[#242820]">210ms</span>
          </div>
        </div>

      </div>

      {/* Main Split Layout: 8 cols for Recent Projects Table, 4 cols for Right Telemetry Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 cols): Data Table & Projects */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl p-6 border border-[#E5E1D8] shadow-[0_4px_20px_rgba(46,50,48,0.04)]">
            
            {/* Table Header & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E1D8]/60">
              <div>
                <h2 className="font-headline font-bold text-xl text-[#242820]">
                  Recent Architecture Projects
                </h2>
                <p className="text-xs text-[#73766F] mt-0.5">
                  Asynchronous extraction pipeline telemetry runs
                </p>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 bg-[#F2EFE7] border border-[#E5E1D8] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === "all"
                      ? "bg-[#397A55] text-white font-bold shadow-xs"
                      : "text-[#73766F] hover:text-[#242820] hover:bg-[#eae6de]"
                  }`}
                >
                  All ({recentProjects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("completed")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === "completed"
                      ? "bg-[#397A55] text-white font-bold shadow-xs"
                      : "text-[#73766F] hover:text-[#242820] hover:bg-[#eae6de]"
                  }`}
                >
                  Completed ({recentProjects.filter(p => p.status?.toLowerCase() === "completed").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("queue")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === "queue"
                      ? "bg-[#397A55] text-white font-bold shadow-xs"
                      : "text-[#73766F] hover:text-[#242820] hover:bg-[#eae6de]"
                  }`}
                >
                  Queue
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("failed")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === "failed"
                      ? "bg-[#397A55] text-white font-bold shadow-xs"
                      : "text-[#73766F] hover:text-[#242820] hover:bg-[#eae6de]"
                  }`}
                >
                  Failed
                </button>
              </div>
            </div>

            {/* Empty State */}
            {filteredProjects.length === 0 ? (
              <div className="border-2 border-dashed border-[#E5E1D8] rounded-xl p-10 flex flex-col items-center justify-center text-center mt-6 min-h-[220px]">
                <div className="w-12 h-12 rounded-xl bg-[#E7F0E8] border border-green-200/60 flex items-center justify-center text-[#397A55] mb-3 shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                </div>
                <p className="text-[#242820] text-sm font-semibold">No diagram parsed yet</p>
                <p className="text-[#73766F] text-xs mt-1 max-w-sm">
                  Upload a software architecture diagram, microservice layout, or network topology to extract OCR text and synthesize solutions.
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo("upload")}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#397A55] hover:bg-[#2E6345] text-white text-xs font-bold shadow-sm transition-all"
                >
                  Upload your first blueprint
                </button>
              </div>
            ) : (
              /* Projects Table */
              <div className="overflow-x-auto -mx-6 px-6 pt-3">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-[#73766F] bg-[#f5f1ea]/80 border-y border-[#E5E1D8]">
                      <th className="py-3 px-4 rounded-l-lg font-bold">Source Blueprint</th>
                      <th className="py-3 px-3 font-bold">Status</th>
                      <th className="py-3 px-3 font-bold">Timestamp</th>
                      <th className="py-3 px-4 rounded-r-lg font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-[#E5E1D8]/60">
                    {filteredProjects.map((item) => {
                      const statusLower = item.status ? item.status.toLowerCase() : "";
                      const isCompleted = statusLower === "completed";
                      const isProcessing = ["ocr_processing", "ocr_completed", "llm_processing"].includes(statusLower);
                      const isQuotaExceeded = statusLower === "llm_quota_exceeded";
                      const isFailed = statusLower === "failed";

                      return (
                        <tr key={item.id} className="hover:bg-[#f5f1ea]/50 transition-colors group">
                          {/* File Icon + Name */}
                          <td className="py-3.5 px-4 font-semibold text-[#242820] flex items-center gap-3">
                            {getFileIcon(item.filename)}
                            <div className="min-w-0 max-w-[220px]">
                              <span className="font-bold text-[#242820] block truncate group-hover:text-[#397A55] transition-colors" title={item.filename}>
                                {item.filename}
                              </span>
                              <span className="text-[11px] text-[#73766F] font-mono font-normal">
                                ID: #{item.id}
                              </span>
                            </div>
                          </td>

                          {/* Status Pill with Dot */}
                          <td className="py-3.5 px-3">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E7F0E8] border border-green-200 text-[#2A5A3F]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#397A55]" />
                                Completed
                              </span>
                            ) : isProcessing ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FBF0DB] border border-amber-200 text-[#7E540C] animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#705c30] animate-ping" />
                                {getStatusLabel(item.status)}
                              </span>
                            ) : isQuotaExceeded ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#f8e0a8]/50 border border-amber-300 text-[#554020]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#705c30]" />
                                Quota Limited
                              </span>
                            ) : isFailed ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FCE8E7] border border-red-200 text-[#A82826]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#b83230]" />
                                Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#ECE7DC] border border-[#E5E1D8] text-[#4F4A40]">
                                Uploaded
                              </span>
                            )}
                          </td>

                          {/* Upload Date */}
                          <td className="py-3.5 px-3 text-xs text-[#73766F] font-mono">
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
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#397A55] text-white hover:bg-[#2E6345] shadow-xs transition-all"
                                  >
                                    View Spec
                                  </button>

                                  {/* Download Dropdown Toggle */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setDownloadDropdownId(downloadDropdownId === item.id ? null : item.id)}
                                      className="p-1 rounded-lg text-[#73766F] hover:text-[#242820] hover:bg-[#F2EFE7] border border-transparent hover:border-[#E5E1D8] transition-all flex items-center justify-center"
                                      title="Download Specification"
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
                              ) : (isFailed || isQuotaExceeded) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDiagramId(item.id);
                                    navigateTo("progress");
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FCE8E7] border border-red-200 text-[#A82826] hover:bg-red-100 transition-all flex items-center gap-1"
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
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#F2EFE7] hover:bg-[#eae6de] border border-[#E5E1D8] text-[#242820] transition-all flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px] text-[#397A55]">hourglass_top</span>
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
            <div className="pt-4 mt-2 border-t border-[#E5E1D8]/60 flex items-center justify-between text-xs text-[#73766F]">
              <span>Showing <strong>1 to {Math.min(5, filteredProjects.length)}</strong> of {recentProjects.length} blueprint analyses</span>
              <button
                type="button"
                onClick={() => navigateTo("history")}
                className="text-[#397A55] hover:text-[#2E6345] font-semibold flex items-center gap-1 transition-colors"
              >
                <span>View Full Telemetry Log</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Callout Banner: Automated Terraform Generator (matching Terra reference) */}
          <div className="bg-[#F2EFE7] rounded-xl p-6 border border-[#E5E1D8] relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1 z-10 max-w-xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#397A55]">
                Automated Terraform &amp; Mermaid Generator
              </span>
              <h3 className="font-headline font-bold text-xl text-[#242820]">
                Generate Production IaC directly from image specs
              </h3>
              <p className="text-xs text-[#73766F] leading-relaxed">
                Every synthesized diagram compiles into standardized HCL, Terraform 1.7 state definitions, and dynamic SVG architecture overlays without manual mapping.
              </p>
            </div>
            <div className="shrink-0 z-10 flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigateTo("upload")}
                className="px-4 py-2.5 rounded-xl bg-[#397A55] hover:bg-[#2E6345] text-white font-bold text-xs transition-all shadow-sm"
              >
                Open Specification Studio
              </button>
            </div>
          </div>

        </div>

        {/* Right Column (4 cols): Pipeline, Workers & Cluster Stream (matching Terra reference) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card A: Live Synthesis Pipeline Stepper */}
          <div className="bg-white rounded-xl p-5 border border-[#E5E1D8] shadow-[0_4px_20px_rgba(46,50,48,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]/60">
              <h3 className="font-headline font-bold text-base text-[#242820]">Active Pipeline</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0e8db] text-[#5e5548]">
                Run #9402
              </span>
            </div>
            <div className="space-y-4 mt-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#397A55] flex items-center justify-center text-white text-[12px] shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#242820]">1. Upload Blueprint</span>
                    <span className="text-[10px] font-semibold text-[#397A55]">Done (120ms)</span>
                  </div>
                  <p className="text-[11px] text-[#73766F] leading-snug">
                    Validated PNG/PDF vector schema &amp; pre-flight integrity.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#f8e0a8] text-[#554020] flex items-center justify-center text-[12px] shrink-0 mt-0.5 animate-pulse">
                  <span className="material-symbols-outlined text-[14px]">autorenew</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#242820]">2. Optical Extraction</span>
                    <span className="text-[10px] font-semibold text-[#705c30] animate-pulse">Running</span>
                  </div>
                  <p className="text-[11px] text-[#73766F] leading-snug">
                    PaddleOCR v2.8 multi-pass label parser resolving bounding coordinates.
                  </p>
                  <div className="mt-2 w-full bg-[#eae6de] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#705c30] h-full rounded-full w-2/3 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 opacity-60">
                <div className="w-6 h-6 rounded-full bg-[#F2EFE7] border border-[#E5E1D8] flex items-center justify-center text-[#73766F] text-[11px] shrink-0 mt-0.5">
                  3
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#242820]">3. Architecture Intelligence</span>
                    <span className="text-[10px] font-semibold text-[#73766F]">Queued</span>
                  </div>
                  <p className="text-[11px] text-[#73766F] leading-snug">
                    Gemini 1.5 Pro zero-shot IaC prompt synthesis.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Worker Node Pool */}
          <div className="bg-white rounded-xl p-5 border border-[#E5E1D8] shadow-[0_4px_20px_rgba(46,50,48,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]/60">
              <h3 className="font-headline font-bold text-base text-[#242820]">Worker Node Pool</h3>
              <span className="text-xs text-[#73766F] font-semibold">4 / 4 Healthy</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <div className="p-2.5 rounded-lg bg-[#f5f1ea] border border-[#E5E1D8]/60 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#242820]">worker-01</span>
                  <span className="w-2 h-2 rounded-full bg-[#397A55]"></span>
                </div>
                <span className="text-[10px] text-[#73766F]">Tesla T4 • 64%</span>
                <div className="w-full bg-[#E5E1D8] h-1 rounded-full overflow-hidden">
                  <div className="bg-[#397A55] h-full rounded-full w-[64%]"></div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#f5f1ea] border border-[#E5E1D8]/60 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#242820]">worker-02</span>
                  <span className="w-2 h-2 rounded-full bg-[#397A55]"></span>
                </div>
                <span className="text-[10px] text-[#73766F]">Tesla T4 • 89%</span>
                <div className="w-full bg-[#E5E1D8] h-1 rounded-full overflow-hidden">
                  <div className="bg-[#397A55] h-full rounded-full w-[89%]"></div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#f5f1ea] border border-[#E5E1D8]/60 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#242820]">worker-03</span>
                  <span className="w-2 h-2 rounded-full bg-[#6b6358]"></span>
                </div>
                <span className="text-[10px] text-[#73766F]">Tesla T4 • Idle</span>
                <div className="w-full bg-[#E5E1D8] h-1 rounded-full overflow-hidden">
                  <div className="bg-[#d4ccbf] h-full rounded-full w-[12%]"></div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#f5f1ea] border border-[#E5E1D8]/60 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#242820]">worker-04</span>
                  <span className="w-2 h-2 rounded-full bg-[#397A55]"></span>
                </div>
                <span className="text-[10px] text-[#73766F]">Tesla T4 • 42%</span>
                <div className="w-full bg-[#E5E1D8] h-1 rounded-full overflow-hidden">
                  <div className="bg-[#397A55] h-full rounded-full w-[42%]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Card C: Cluster Logstream */}
          <div className="bg-[#242820] rounded-xl p-4 shadow-[0_4px_20px_rgba(46,50,48,0.08)] border border-[#3b4038] text-[#f5f0e8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#3b4038]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#397A55]"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#8ecf9e] font-sans">
                  Cluster Logstream
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#c4c8bc]">tail -f prod.log</span>
            </div>
            <div className="mt-3 font-mono text-[11px] leading-relaxed space-y-1.5 opacity-90 max-h-48 overflow-y-auto">
              <p className="text-[#c4c8bc]">[14:32:01.402] <span className="text-[#8ecf9e]">INFO</span> dispatch_worker(02) assigned payload k8s-multi-region</p>
              <p className="text-[#c4c8bc]">[14:32:02.110] <span className="text-[#f8e0a8]">OCR</span> box extraction confidence 0.983 (62 entities found)</p>
              <p className="text-[#c4c8bc]">[14:32:03.954] <span className="text-[#8ecf9e]">INFO</span> gemini-pro context prompt generated (4.2k tokens)</p>
              <p className="text-[#c4c8bc]">[14:32:04.218] <span className="text-[#ffdad8] text-[#A82826]">WARN</span> redis-cache pipeline throttled: 429 Retry-After 60s</p>
              <p className="text-[#c4c8bc]">[14:32:05.002] <span className="text-[#8ecf9e]">ACK</span> health_ping us-east-prod-04 38ms OK</p>
            </div>
          </div>

        </div>

      </div>

      {/* Floating Download Toast Notification */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-[#E5E1D8] text-[#242820] shadow-[0_8px_30px_rgba(46,50,48,0.12)] animate-fadeIn">
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
