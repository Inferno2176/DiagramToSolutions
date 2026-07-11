import React, { useState, useEffect } from "react";
import { ArrowLeft, Clock, Eye, Download, AlertTriangle, FileText, Code, Terminal } from "lucide-react";

export default function History({ token, navigateTo, setSelectedDiagramId, onAuthError }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, [token]);

  const handleDownload = (diagramId, filename, format) => {
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
      alert("Error: " + err.message);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Retrieving historic pipelines...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Breadcrumbs */}
      <button
        onClick={() => navigateTo("dashboard")}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </button>

      <div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Analysis History Logs
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review all architectural layouts scanned by the system.
        </p>
      </div>

      <div className="glass-card p-6 border border-dark-700/60">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-sm flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {history.length === 0 ? (
          <div className="border-2 border-dashed border-dark-700 rounded-xl flex flex-col items-center justify-center p-12 text-center">
            <Clock className="w-10 h-10 text-slate-500 mb-2" />
            <p className="text-slate-400 text-sm font-semibold">No history found</p>
            <p className="text-slate-500 text-xs mt-1">You haven't uploaded any diagrams yet.</p>
            <button
              onClick={() => navigateTo("upload")}
              className="text-xs text-brand-cyan hover:underline mt-4 font-bold"
            >
              Analyze your first drawing
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-dark-700 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3 pr-4">File Name</th>
                  <th className="pb-3 px-4">Pipeline Status</th>
                  <th className="pb-3 px-4">Date Uploaded</th>
                  <th className="pb-3 px-4">Completion Date</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50">
                {history.map((item) => (
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
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {item.completed_at ? new Date(item.completed_at).toLocaleString() : "-"}
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
                              title="View documentation"
                            >
                              <Eye className="w-4.5 h-4.5" />
                            </button>
                            <div className="relative group/down">
                              <button
                                className="p-1.5 text-slate-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-lg transition-all"
                                title="Download Report"
                              >
                                <Download className="w-4.5 h-4.5" />
                              </button>
                              
                              <div className="absolute right-0 bottom-full mb-1 hidden group-hover/down:flex flex-col bg-dark-850 border border-dark-700 rounded-lg py-1 shadow-xl z-50 text-left min-w-[100px]">
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
    </div>
  );
}
