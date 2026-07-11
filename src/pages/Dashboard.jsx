import React, { useState, useEffect } from "react";
import { 
  FileText, CheckCircle2, Clock, Upload, ArrowRight, 
  Eye, Download, RefreshCw, AlertTriangle 
} from "lucide-react";

export default function Dashboard({ token, navigateTo, setSelectedDiagramId, onAuthError }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
  }, [token]);

  const handleDownload = (diagramId, filename, format) => {
    // Directly trigger file download using standard anchor tag with JWT authorization (or trigger download via fetch)
    fetch(`${API_URL}/api/diagrams/${diagramId}/download/${format}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      if (res.status === 401) {
        if (onAuthError) onAuthError();
        return;
      }
      if (!res.ok) throw new Error("File not ready or not found");
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.split('.')[0]}_report.${format === 'markdown' ? 'md' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => {
      alert("Error downloading report: " + err.message);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Aggregating platform intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Developer Operations Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Monitor and manage your system architecture documentation pipelines.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="p-2.5 rounded-lg border border-dark-700 hover:border-slate-500 text-slate-400 hover:text-white transition-all flex items-center justify-center"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-brand-cyan" : ""}`} />
          </button>
          
          <button
            onClick={() => navigateTo("upload")}
            className="glass-btn-primary flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            Analyze Diagram
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="glass-card p-6 border-l-4 border-l-brand-cyan relative overflow-hidden flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan shadow-inner">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Uploaded Diagrams</p>
            <p className="text-3xl font-bold mt-1 text-white">{stats?.total_uploads ?? 0}</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-card p-6 border-l-4 border-l-brand-emerald relative overflow-hidden flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-brand-emerald/10 flex items-center justify-center text-brand-emerald shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Analyses</p>
            <p className="text-3xl font-bold mt-1 text-white">{stats?.completed_analyses ?? 0}</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-card p-6 border-l-4 border-l-brand-purple relative overflow-hidden flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-brand-purple/10 flex items-center justify-center text-brand-purple shadow-inner">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Success Rate</p>
            <p className="text-3xl font-bold mt-1 text-white">
              {stats?.total_uploads > 0 
                ? `${Math.round((stats.completed_analyses / stats.total_uploads) * 100)}%` 
                : "100%"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Recent Uploads & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Uploads Table */}
        <div className="glass-card lg:col-span-2 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white">Recent Projects</h2>
            <button
              onClick={() => navigateTo("history")}
              className="text-xs text-brand-cyan hover:underline font-semibold flex items-center gap-1"
            >
              See All logs
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-sm flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {stats?.recent_projects?.length === 0 ? (
            <div className="flex-1 border-2 border-dashed border-dark-700 rounded-xl flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
              <Upload className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-slate-400 text-sm font-medium">No diagram parsed yet</p>
              <p className="text-slate-500 text-xs mt-1">Upload a network layout or server design to begin.</p>
              <button 
                onClick={() => navigateTo("upload")}
                className="text-xs text-brand-cyan font-bold hover:underline mt-3"
              >
                Upload your first diagram
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-dark-700 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 pr-4">File Name</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4">Uploaded</th>
                    <th className="pb-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50">
                  {stats?.recent_projects?.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-3.5 pr-4 font-semibold text-slate-200 truncate max-w-[200px]" title={item.filename}>
                        {item.filename}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          item.status === "COMPLETED" 
                            ? "bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20"
                            : item.status === "FAILED"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-brand-purple/10 text-brand-purple border border-brand-purple/20 animate-pulse"
                        }`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {item.status === "COMPLETED" ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedDiagramId(item.id);
                                  navigateTo("results");
                                }}
                                className="p-1.5 text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/10 rounded-lg transition-all"
                                title="View analysis documentation"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <div className="relative group/down">
                                <button
                                  className="p-1.5 text-slate-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-lg transition-all"
                                  title="Download Report"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                {/* Quick dropdown on hover/click */}
                                <div className="absolute right-0 bottom-full mb-1 hidden group-hover/down:flex flex-col bg-dark-800 border border-dark-700 rounded-lg py-1 shadow-xl z-50 text-left min-w-[100px]">
                                  <button 
                                    onClick={() => handleDownload(item.id, item.filename, 'pdf')}
                                    className="px-3 py-1 hover:bg-dark-700 text-xs text-slate-200 hover:text-white"
                                  >
                                    PDF
                                  </button>
                                  <button 
                                    onClick={() => handleDownload(item.id, item.filename, 'markdown')}
                                    className="px-3 py-1 hover:bg-dark-700 text-xs text-slate-200 hover:text-white"
                                  >
                                    Markdown
                                  </button>
                                  <button 
                                    onClick={() => handleDownload(item.id, item.filename, 'json')}
                                    className="px-3 py-1 hover:bg-dark-700 text-xs text-slate-200 hover:text-white"
                                  >
                                    JSON
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : item.status === "FAILED" ? (
                            <span className="text-xs text-red-400">Failed</span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedDiagramId(item.id);
                                navigateTo("progress");
                              }}
                              className="text-xs text-brand-purple hover:underline"
                            >
                              Track Progress
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Instructions & Guides */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Pipeline Workflow</h2>
            <div className="space-y-4 text-sm text-slate-300">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-cyan/20 text-brand-cyan font-bold flex items-center justify-center text-xs flex-shrink-0">1</div>
                <div>
                  <p className="font-semibold text-slate-200">Upload Layout Design</p>
                  <p className="text-xs text-slate-400 mt-0.5">Drag-and-drop your JPEG, PNG, or PDF architecture blueprint.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-purple/20 text-brand-purple font-bold flex items-center justify-center text-xs flex-shrink-0">2</div>
                <div>
                  <p className="font-semibold text-slate-200">OCR Label Capture</p>
                  <p className="text-xs text-slate-400 mt-0.5">The pipeline extracts system nodes, servers, DBs, and linkages.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-indigo/20 text-brand-indigo font-bold flex items-center justify-center text-xs flex-shrink-0">3</div>
                <div>
                  <p className="font-semibold text-slate-200">LLM Documentation Synthesis</p>
                  <p className="text-xs text-slate-400 mt-0.5">Mock LLM outputs code schemas, API routes, and workflow briefs.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 border-t border-dark-700/60 pt-4 text-center">
            <p className="text-xs text-slate-400">Supported formats: PNG, JPG, JPEG, PDF up to 10MB.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
