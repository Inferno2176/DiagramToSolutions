import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, Download, FileText, Code, Cpu, Database, 
  Terminal, ShieldCheck, Info, CheckCircle2, ChevronRight 
} from "lucide-react";

export default function Results({ token, navigateTo, selectedDiagramId, onAuthError }) {
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [downloading, setDownloading] = useState(null);

  const API_URL = "http://localhost:8000";

  useEffect(() => {
    if (!selectedDiagramId) {
      navigateTo("dashboard");
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await fetch(`${API_URL}/api/diagrams/${selectedDiagramId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) {
          if (onAuthError) onAuthError();
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to load analysis results");
        }
        const data = await res.json();
        setDiagram(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [selectedDiagramId, token]);

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const res = await fetch(`${API_URL}/api/diagrams/${selectedDiagramId}/download/${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        if (onAuthError) onAuthError();
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to export report");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${diagram.filename.split('.')[0]}_report.${format === 'markdown' ? 'md' : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Error exporting: " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Compiling technical architecture specifications...</p>
      </div>
    );
  }

  if (error || !diagram) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-12">
        <div className="text-red-400 text-3xl font-extrabold">Error Loading Results</div>
        <p className="text-slate-400 text-sm">{error || "Could not retrieve diagram records."}</p>
        <button onClick={() => navigateTo("dashboard")} className="glass-btn-secondary text-sm">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const analysis = diagram.analysis_json || {};

  // Define tab classes
  const tabClass = (tabName) => {
    const isActive = activeTab === tabName;
    return `pb-3 text-sm font-semibold transition-all border-b-2 px-1 whitespace-nowrap cursor-pointer ${
      isActive 
        ? "border-brand-cyan text-brand-cyan font-bold" 
        : "border-transparent text-slate-400 hover:text-slate-200"
    }`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigateTo("dashboard")}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>

        {/* Report Export Button Dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Export Report:</span>
          
          <button
            onClick={() => handleDownload("pdf")}
            disabled={!!downloading}
            className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-slate-200 rounded border border-dark-700 flex items-center gap-1.5 transition-all"
          >
            {downloading === "pdf" ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-red-400" />
            )}
            PDF
          </button>
          
          <button
            onClick={() => handleDownload("markdown")}
            disabled={!!downloading}
            className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-slate-200 rounded border border-dark-700 flex items-center gap-1.5 transition-all"
          >
            {downloading === "markdown" ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Code className="w-3.5 h-3.5 text-brand-cyan" />
            )}
            Markdown
          </button>
          
          <button
            onClick={() => handleDownload("json")}
            disabled={!!downloading}
            className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-slate-200 rounded border border-dark-700 flex items-center gap-1.5 transition-all"
          >
            {downloading === "json" ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Terminal className="w-3.5 h-3.5 text-brand-purple" />
            )}
            JSON
          </button>
        </div>
      </div>

      {/* Title Details Card */}
      <div className="glass-card p-6 border-l-4 border-l-brand-cyan">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white truncate" title={analysis.summary?.architecture_name || diagram.filename}>
          {analysis.summary?.architecture_name || diagram.filename.split('.')[0]} Report
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-slate-400">
          <span className="font-semibold text-brand-cyan glow-cyan">Pipeline Completed</span>
          <span>•</span>
          <span><b>File:</b> {diagram.filename}</span>
          <span>•</span>
          <span><b>Completed:</b> {new Date(diagram.completed_at || diagram.created_at).toLocaleString()}</span>
        </div>
      </div>

      {/* Tabs list bar */}
      <div className="border-b border-dark-700 overflow-x-auto">
        <div className="flex gap-8 pb-px">
          <button onClick={() => setActiveTab("summary")} className={tabClass("summary")}>Summary</button>
          <button onClick={() => setActiveTab("workflow")} className={tabClass("workflow")}>Workflow</button>
          <button onClick={() => setActiveTab("techstack")} className={tabClass("techstack")}>Tech Stack</button>
          <button onClick={() => setActiveTab("components")} className={tabClass("components")}>Components</button>
          <button onClick={() => setActiveTab("apis")} className={tabClass("apis")}>Suggested APIs</button>
          <button onClick={() => setActiveTab("database")} className={tabClass("database")}>Database Schema</button>
        </div>
      </div>

      {/* Content panel */}
      <div className="glass-card p-8 border border-dark-700/60 min-h-[350px]">
        
        {/* TAB 1: Summary */}
        {activeTab === "summary" && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-brand-cyan" />
              Architecture Overview
            </h3>
            {analysis.summary ? (
              <>
                <p className="text-slate-200 text-sm font-semibold">Type: <span className="text-brand-cyan">{analysis.summary.architecture_type}</span></p>
                <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">
                  {analysis.summary.overview}
                </p>
              </>
            ) : (
              <p className="text-slate-400 text-sm">No analysis data generated for this section.</p>
            )}
          </div>
        )}

        {/* TAB 2: Workflow */}
        {activeTab === "workflow" && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-brand-purple" />
              Process Workflow Sequence
            </h3>
            <div className="space-y-4 pl-1">
              {analysis.workflow && analysis.workflow.length > 0 ? (
                [...analysis.workflow].sort((a, b) => a.step - b.step).map((w, idx) => (
                  <div key={idx} className="flex gap-4 items-start bg-dark-950/40 p-4 rounded-xl border border-dark-700/40">
                    <div className="w-8 h-8 rounded-full bg-brand-purple/20 text-brand-purple flex items-center justify-center font-bold text-sm flex-shrink-0 border border-brand-purple/30">
                      {w.step}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm mb-1">{w.title}</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">{w.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-sm">No analysis data generated for this section.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Tech Stack */}
        {activeTab === "techstack" && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-brand-indigo" />
              Suggested Technology Stack
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analysis.tech_stack && analysis.tech_stack.length > 0 ? (
                analysis.tech_stack.map((item, idx) => (
                  <div key={idx} className="bg-dark-950/60 p-5 rounded-xl border border-dark-700/60 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-brand-cyan text-base">{item.technology}</h4>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-3 block">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {item.purpose}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-sm col-span-2">No analysis data generated for this section.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Components */}
        {activeTab === "components" && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-brand-cyan" />
              Component Catalogue
            </h3>
            
            <div className="overflow-x-auto border border-dark-700/50 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-dark-950/80 border-b border-dark-700 text-slate-300 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Component Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Functional Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/30">
                  {analysis.components && analysis.components.length > 0 ? (
                    analysis.components.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-200">{comp.name}</td>
                        <td className="py-3 px-4 text-xs">
                          <span className="bg-dark-800 text-brand-cyan border border-brand-cyan/20 px-2 py-0.5 rounded whitespace-nowrap">
                            {comp.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-xs leading-relaxed">{comp.purpose}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-slate-400 text-sm">
                        No analysis data generated for this section.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: APIs */}
        {activeTab === "apis" && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-brand-purple" />
              Suggested Interface APIs
            </h3>

            <div className="space-y-4">
              {analysis.suggested_apis && analysis.suggested_apis.length > 0 ? (
                analysis.suggested_apis.map((api, idx) => {
                  const method = (api.method || "").toUpperCase();
                  let methodClass = "bg-dark-800 text-slate-300 border-dark-700";
                  if (method === "GET") methodClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  if (method === "POST") methodClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                  if (method === "PUT" || method === "PATCH") methodClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  if (method === "DELETE") methodClass = "bg-red-500/10 text-red-400 border-red-500/20";
                  
                  return (
                    <div key={idx} className="bg-dark-950/50 rounded-xl border border-dark-700/50 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="flex items-center gap-3 w-full sm:w-1/3 flex-shrink-0">
                        <span className={`text-xs font-extrabold px-3 py-1 rounded border ${methodClass}`}>
                          {method}
                        </span>
                        <code className="text-sm font-bold text-slate-100 break-all">{api.endpoint}</code>
                      </div>
                      <p className="text-sm text-slate-400 flex-1 border-l-2 border-dark-700 pl-4">{api.purpose}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-400 text-sm">No analysis data generated for this section.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: Database */}
        {activeTab === "database" && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-emerald" />
              Database Schema
            </h3>

            {analysis.database_schema ? (
              analysis.database_schema.required === false ? (
                <div className="bg-dark-950/50 rounded-xl border border-dark-700/50 p-6 text-center">
                  <p className="text-slate-200 font-semibold mb-2">No persistent database is required based on the analyzed architecture.</p>
                  <p className="text-slate-400 text-sm">{analysis.database_schema.reason}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-dark-950/40 p-4 rounded-lg border border-dark-700/40">
                    <p className="text-slate-300 text-sm">
                      <span className="font-semibold text-brand-emerald mr-2">Reasoning:</span>
                      {analysis.database_schema.reason}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {analysis.database_schema.entities && analysis.database_schema.entities.length > 0 ? (
                      analysis.database_schema.entities.map((entity, idx) => (
                        <div key={idx} className="bg-dark-950/60 rounded-xl border border-dark-700/60 overflow-hidden flex flex-col">
                          {/* Entity title */}
                          <div className="bg-dark-950/80 px-4 py-3 border-b border-dark-700/80 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Database className="w-4 h-4 text-brand-emerald" />
                              <span className="font-bold text-slate-200 text-sm">{entity.name}</span>
                            </div>
                          </div>
                          
                          <div className="p-4 space-y-4">
                            <p className="text-xs text-slate-400 leading-relaxed">{entity.purpose}</p>
                            
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Suggested Fields</p>
                              <div className="flex flex-wrap gap-2">
                                {entity.suggested_fields?.map((field, fIdx) => (
                                  <span key={fIdx} className="text-xs bg-dark-800 border border-dark-700 text-slate-300 px-2.5 py-1 rounded-md font-mono">
                                    {field}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-sm col-span-2">No analysis data generated for this section.</p>
                    )}
                  </div>
                </div>
              )
            ) : (
              <p className="text-slate-400 text-sm">No analysis data generated for this section.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
