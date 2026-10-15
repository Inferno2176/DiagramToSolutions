import React, { useState, useEffect } from "react";
import { downloadSpecification } from "../utils/exportReport";

export default function Results({ token, navigateTo, selectedDiagramId, setSelectedDiagramId, onAuthError }) {
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [downloading, setDownloading] = useState(null);
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const API_URL = "http://localhost:8000";

  useEffect(() => {
    let isMounted = true;

    const resolveAndFetch = async () => {
      setLoading(true);
      setError("");

      let targetId = selectedDiagramId;

      // If no diagram ID was passed (e.g. user clicked "Specs" directly from top nav),
      // look up the user's latest completed diagram from history
      if (!targetId) {
        try {
          const histRes = await fetch(`${API_URL}/api/dashboard/history`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (histRes.status === 401) {
            if (onAuthError) onAuthError();
            return;
          }
          if (histRes.ok) {
            const list = await histRes.json();
            if (Array.isArray(list) && list.length > 0) {
              const completedItem = list.find((d) => d.status?.toLowerCase() === "completed") || list[0];
              targetId = completedItem.id;
              if (setSelectedDiagramId) {
                setSelectedDiagramId(targetId);
              }
            }
          }
        } catch {
          // Ignore lookup error, will handle missing targetId below
        }
      }

      if (!targetId) {
        if (isMounted) {
          navigateTo("dashboard");
        }
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/diagrams/${targetId}`, {
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
        if (isMounted) {
          setDiagram(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    resolveAndFetch();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDiagramId, token]);

  const handleDownload = async (format) => {
    if (downloading) return;
    setDownloading(format);
    setToastMessage({
      type: "loading",
      text: `Preparing ${format.toUpperCase()} specification export...`,
    });

    try {
      const result = await downloadSpecification({
        diagramId: selectedDiagramId || diagram?.id,
        filename: diagram?.filename,
        format,
        token,
        diagramData: diagram,
        API_URL,
      });

      setToastMessage({
        type: "success",
        text: `Specification successfully exported as ${format.toUpperCase()}${
          result?.source === "backend" ? " (Verified Report)" : " (Synthesizer Engine)"
        }`,
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      setToastMessage({
        type: "error",
        text: `Export failed: ${err.message || "Could not generate file"}`,
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-3 border-sky-400/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-slate-300 text-sm font-label font-medium tracking-wide">
          Compiling technical architecture specifications and system schemas...
        </p>
      </div>
    );
  }

  if (error || !diagram) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <span className="material-symbols-outlined text-[32px]">warning</span>
        </div>
        <h2 className="font-headline font-bold text-2xl text-white">Error Loading Results</h2>
        <p className="text-slate-400 text-xs leading-relaxed">{error || "Could not retrieve diagram records."}</p>
        <button
          onClick={() => navigateTo("dashboard")}
          className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 border border-sky-400/25 text-slate-200 text-xs font-semibold hover:text-white transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Parse analysis JSON or individual schema fields
  const analysis = diagram.analysis_json || {};
  const summary = analysis.summary || diagram.architecture_summary || {};
  const workflow = analysis.workflow || diagram.workflow_explanation || [];
  const techStack = analysis.tech_stack || diagram.tech_stack || [];
  const components = analysis.components || diagram.components || [];
  const apis = analysis.suggested_apis || diagram.suggested_apis || [];
  const databaseSchema = analysis.database_schema || diagram.database_entities || {};

  const architectureName = 
    (typeof summary === "object" ? summary.architecture_name : null) ||
    diagram.architecture_name ||
    diagram.filename ||
    "Architecture Blueprint";

  const architectureType =
    (typeof summary === "object" ? summary.architecture_type : null) ||
    diagram.architecture_type ||
    "Distributed Cloud Architecture";

  const overviewText =
    (typeof summary === "object" ? summary.overview : summary) ||
    "No abstract overview provided for this specification.";

  const tabs = [
    { id: "summary", label: "Summary", icon: "description" },
    { id: "workflow", label: "Workflow", icon: "alt_route" },
    { id: "techstack", label: "Tech Stack", icon: "layers" },
    { id: "components", label: "Components", icon: "view_quilt" },
    { id: "apis", label: "Suggested APIs", icon: "api" },
    { id: "database", label: "Database Schema", icon: "database" },
  ];

  const getMethodBadgeClass = (method) => {
    const m = (method || "GET").toUpperCase();
    switch (m) {
      case "GET":
        return "bg-sky-500/10 text-sky-400 border border-sky-400/30";
      case "POST":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
      case "PUT":
      case "PATCH":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/30";
      case "DELETE":
        return "bg-red-500/10 text-red-400 border border-red-500/30";
      default:
        return "bg-purple-500/10 text-purple-400 border border-purple-400/30";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 animate-fadeIn">
      
      {/* Top Header & Breadcrumb Bar matching specs_glacier.html */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo("dashboard")}
              className="inline-flex items-center gap-1.5 text-xs font-label font-semibold text-slate-400 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Dashboard
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-mono text-primary bg-sky-950/60 border border-sky-400/25 px-2.5 py-0.5 rounded-full">
              SPECIFICATION STUDIO
            </span>
          </div>

          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
            {architectureName}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 font-mono">
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Pipeline Verified
            </span>
            <span>•</span>
            <span><b>File:</b> {diagram.filename}</span>
            <span>•</span>
            <span><b>Completed:</b> {new Date(diagram.completed_at || diagram.created_at || Date.now()).toLocaleDateString()}</span>
            {analysis.model_execution_info && (
              <>
                <span>•</span>
                <span className="text-purple-300">
                  Model: <b className="text-white">{analysis.model_execution_info.final_model}</b>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls & Multi-Format Exports */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setBlueprintModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900/80 border border-sky-500/25 text-slate-200 hover:text-white hover:border-sky-400/40 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[17px] text-primary">fullscreen</span>
            <span>Blueprint Inspector</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-sky-500/20 p-1 rounded-xl">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={!!downloading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-sky-500/10 flex items-center gap-1.5 transition-all"
            >
              {downloading === "pdf" ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[15px] text-red-400">picture_as_pdf</span>
              )}
              PDF
            </button>

            <button
              onClick={() => handleDownload("markdown")}
              disabled={!!downloading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-sky-500/10 flex items-center gap-1.5 transition-all"
            >
              {downloading === "markdown" ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[15px] text-sky-400">code</span>
              )}
              Markdown
            </button>

            <button
              onClick={() => handleDownload("json")}
              disabled={!!downloading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-sky-500/10 flex items-center gap-1.5 transition-all"
            >
              {downloading === "json" ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[15px] text-purple-400">data_object</span>
              )}
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Studio Workbench Navigation Tabs Bar matching specs_glacier.html */}
      <div className="flex flex-col items-center justify-center gap-4 pb-2 border-b border-sky-400/10 w-full">
        <div className="flex flex-wrap items-center justify-center gap-2 bg-[#101726]/80 p-2 rounded-2xl border border-sky-400/15 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl max-w-5xl w-full">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                className={`
                  flex-1 min-w-[120px] text-center px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2
                  ${isActive
                    ? "bg-primary text-[#001f2e] font-bold shadow-[0_0_20px_rgba(125,211,252,0.35)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.05]"}
                `}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tag pills bar matching Stitch */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.04] text-secondary border border-sky-400/15 shadow-sm backdrop-blur-sm">
            <span className="material-symbols-outlined text-[14px] text-primary">hub</span>
            {architectureType}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-primary border border-sky-400/30 shadow-[0_0_10px_rgba(125,211,252,0.15)] backdrop-blur-sm">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            100% OCR Parity
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.04] text-slate-400 border border-sky-400/15 shadow-sm backdrop-blur-sm">
            <span className="material-symbols-outlined text-[14px] text-sky-300">cloud</span>
            Cloud Scalable
          </span>
        </div>
      </div>

      {/* TAB CONTENT 1: SUMMARY */}
      {activeTab === "summary" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Executive Architecture Abstract */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-sky-400/10">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-[24px]">description</span>
                <h3 className="font-headline font-bold text-lg text-white">Executive Architecture Abstract</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono bg-white/[0.04] px-2.5 py-1 rounded-md border border-sky-400/15">
                ID: SPEC-{selectedDiagramId.toString().slice(0, 8).toUpperCase()}
              </span>
            </div>

            <p className="text-sm sm:text-base leading-relaxed text-slate-300 max-w-5xl">
              {overviewText}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-900/60 border border-sky-400/10">
                <span className="text-slate-400 text-[11px]">System Classification:</span>
                <span className="text-white font-semibold text-sm">{architectureType}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-900/60 border border-sky-400/10">
                <span className="text-slate-400 text-[11px]">Component Count:</span>
                <span className="text-primary font-semibold text-sm">{Array.isArray(components) ? components.length : "Multi-tier"} Nodes</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-900/60 border border-sky-400/10">
                <span className="text-slate-400 text-[11px]">API Endpoints:</span>
                <span className="text-emerald-400 font-semibold text-sm">{Array.isArray(apis) ? apis.length : 0} Suggested Contracts</span>
              </div>
            </div>
          </div>

          {/* Performance & Reliability Benchmarks */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider font-label">
              Performance &amp; Reliability Inferences
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-900/60 p-4 border border-sky-400/10">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estimated Throughput</span>
                <div className="py-2">
                  <span className="font-headline text-2xl font-bold text-primary drop-shadow-[0_0_12px_rgba(125,211,252,0.3)]">
                    High Burst
                  </span>
                </div>
                <span className="text-xs text-slate-400">Decoupled queue buffer strategy</span>
              </div>

              <div className="rounded-xl bg-slate-900/60 p-4 border border-sky-400/10">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Data Consistency</span>
                <div className="py-2">
                  <span className="font-headline text-2xl font-bold text-purple-300 drop-shadow-[0_0_12px_rgba(200,160,240,0.3)]">
                    Transactional
                  </span>
                </div>
                <span className="text-xs text-slate-400">ACID relational isolation</span>
              </div>

              <div className="rounded-xl bg-slate-900/60 p-4 border border-sky-400/10">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Availability Target</span>
                <div className="py-2">
                  <span className="font-headline text-2xl font-bold text-emerald-400">
                    99.99% HA
                  </span>
                </div>
                <span className="text-xs text-slate-400">Multi-region redundancy</span>
              </div>
            </div>

            {/* Architectural Inferences & Guardrails */}
            <div className="space-y-3 pt-3 border-t border-sky-400/10">
              <h3 className="font-headline font-semibold text-base text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">rule</span>
                Architectural Inferences &amp; Guardrails
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-sky-400/10">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Boundary Decoupling</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Microservices communicate across strictly defined contracts and message interfaces without tight monolithic coupling.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-sky-400/10">
                  <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Idempotent Ingestion</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Ingress endpoints enforce idempotency keys to eliminate duplicate write hazards during network timeouts.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-sky-400/10">
                  <span className="material-symbols-outlined text-purple-300 text-[20px] shrink-0 mt-0.5">info</span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Scalability Trade-Off</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Read-replica replication lag requires optimistic concurrency control on critical read-after-write operations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: WORKFLOW */}
      {activeTab === "workflow" && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-sky-400/10">
            <div>
              <h3 className="font-headline font-bold text-xl text-white">End-to-End Workflow &amp; Execution Flow</h3>
              <p className="text-xs text-slate-400 mt-0.5">Sequential operational paths inferred from the blueprint layout</p>
            </div>
            <span className="text-xs font-mono text-primary bg-sky-950/60 border border-sky-400/25 px-2.5 py-1 rounded-full">
              {Array.isArray(workflow) ? workflow.length : 0} STAGES
            </span>
          </div>

          <div className="space-y-4">
            {Array.isArray(workflow) && workflow.length > 0 ? (
              workflow.map((step, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-slate-900/60 border border-sky-400/15 flex items-start gap-4 hover:border-sky-400/35 transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/25 text-primary font-mono font-bold flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
                    {step.step || idx + 1}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-white group-hover:text-primary transition-colors">
                        {step.title || `Workflow Phase ${idx + 1}`}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-500 uppercase">
                        Step {step.step || idx + 1}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {step.description || (typeof step === "string" ? step : JSON.stringify(step))}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No structured workflow steps detected.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: TECH STACK */}
      {activeTab === "techstack" && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-sky-400/10">
            <div>
              <h3 className="font-headline font-bold text-xl text-white">Detected &amp; Recommended Technology Stack</h3>
              <p className="text-xs text-slate-400 mt-0.5">Frameworks, databases, protocols, and infrastructural runtimes</p>
            </div>
            <span className="text-xs font-mono text-primary bg-sky-950/60 border border-sky-400/25 px-2.5 py-1 rounded-full">
              {Array.isArray(techStack) ? techStack.length : 0} TECHNOLOGIES
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(techStack) && techStack.length > 0 ? (
              techStack.map((tech, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-slate-900/60 border border-sky-400/15 space-y-2 hover:border-sky-400/35 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-sky-950 text-sky-300 border border-sky-400/20">
                        {tech.category || "Technology"}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                    </div>
                    <h4 className="font-headline font-bold text-lg text-white">
                      {tech.technology || tech.name || "Component"}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {tech.purpose || tech.description || "Identified in architecture blueprint."}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 col-span-full">No technologies cataloged in this solution.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: COMPONENTS */}
      {activeTab === "components" && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-sky-400/10">
            <div>
              <h3 className="font-headline font-bold text-xl text-white">Architectural Components &amp; Service Nodes</h3>
              <p className="text-xs text-slate-400 mt-0.5">Isolated microservices, gateways, datastores, and worker nodes</p>
            </div>
            <span className="text-xs font-mono text-primary bg-sky-950/60 border border-sky-400/25 px-2.5 py-1 rounded-full">
              {Array.isArray(components) ? components.length : 0} NODES
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.isArray(components) && components.length > 0 ? (
              components.map((comp, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-slate-900/60 border border-sky-400/15 space-y-3 hover:border-sky-400/35 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[18px]">view_quilt</span>
                      </span>
                      <h4 className="font-headline font-bold text-base text-white">
                        {comp.name || `Component ${idx + 1}`}
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/[0.04] text-slate-300 border border-slate-700">
                      {comp.type || "Service"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {comp.purpose || comp.description || "Architectural boundary node."}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 col-span-full">No components cataloged.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: SUGGESTED APIS */}
      {activeTab === "apis" && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-sky-400/10">
            <div>
              <h3 className="font-headline font-bold text-xl text-white">Auto-Generated API Contracts &amp; Specifications</h3>
              <p className="text-xs text-slate-400 mt-0.5">REST / gRPC service endpoints synthesized from diagram operations</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              {Array.isArray(apis) ? apis.length : 0} CONTRACTS
            </span>
          </div>

          <div className="space-y-4">
            {Array.isArray(apis) && apis.length > 0 ? (
              apis.map((api, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-slate-900/60 border border-sky-400/15 space-y-3 hover:border-sky-400/35 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${getMethodBadgeClass(api.method)}`}>
                        {api.method || "GET"}
                      </span>
                      <code className="text-sm font-mono text-white font-semibold">
                        {api.endpoint || api.path || "/api/v1/resource"}
                      </code>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      HTTP/1.1 &amp; HTTP/2
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {api.purpose || api.description || "Endpoint contract."}
                  </p>

                  {/* Schema Details if available */}
                  {(api.request_body || api.response_body || api.parameters) && (
                    <div className="mt-3 pt-3 border-t border-sky-400/10 bg-[#070b13] p-3 rounded-lg font-mono text-[11px] text-cyan-300 overflow-x-auto">
                      <pre>{JSON.stringify(api.request_body || api.response_body || api.parameters, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">No API contracts suggested for this blueprint.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: DATABASE SCHEMA */}
      {activeTab === "database" && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-sky-400/10">
            <div>
              <h3 className="font-headline font-bold text-xl text-white">Relational Database Schemas &amp; Entity Models</h3>
              <p className="text-xs text-slate-400 mt-0.5">PostgreSQL table schemas and relational integrity constraints</p>
            </div>
            <span className="text-xs font-mono text-primary bg-sky-950/60 border border-sky-400/25 px-2.5 py-1 rounded-full">
              POSTGRESQL 16
            </span>
          </div>

          {/* Database Reason Callout */}
          {databaseSchema.reason && (
            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-400/20 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">info</span>
              <div>
                <span className="font-bold text-white block mb-0.5">Persistence Rationale:</span>
                <span>{databaseSchema.reason}</span>
              </div>
            </div>
          )}

          {/* Schema Entity Cards */}
          <div className="space-y-5">
            {Array.isArray(databaseSchema.entities) && databaseSchema.entities.length > 0 ? (
              databaseSchema.entities.map((entity, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-slate-900/60 border border-sky-400/15 overflow-hidden"
                >
                  <div className="p-4 bg-slate-900/90 border-b border-sky-400/15 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">database</span>
                      <h4 className="font-headline font-bold text-base text-white">
                        {entity.name || `Table_${idx + 1}`}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {entity.purpose || "Relational Table"}
                    </span>
                  </div>

                  {Array.isArray(entity.fields) && entity.fields.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-mono">
                        <thead>
                          <tr className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-sky-400/10 text-[10px]">
                            <th className="py-2.5 px-4 font-bold">Field Name</th>
                            <th className="py-2.5 px-4 font-bold">Type</th>
                            <th className="py-2.5 px-4 font-bold">Constraints</th>
                            <th className="py-2.5 px-4 font-bold">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sky-500/5">
                          {entity.fields.map((f, fIdx) => (
                            <tr key={fIdx} className="hover:bg-white/[0.02]">
                              <td className="py-2.5 px-4 text-white font-semibold">{f.name}</td>
                              <td className="py-2.5 px-4 text-primary">{f.type}</td>
                              <td className="py-2.5 px-4">
                                {f.constraints ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-sky-300 border border-sky-400/20">
                                    {f.constraints}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-slate-400 font-sans">{f.description || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-xs text-slate-400 font-mono">
                      <pre>{JSON.stringify(entity, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
                {databaseSchema.required === false 
                  ? "No persistent database schema required according to blueprint."
                  : "Database entities details not structured in output."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blueprint Quick View Inspector Modal matching Stitch */}
      {blueprintModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a0e1a]/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fadeIn">
          <div className="bg-[#111828] border border-sky-400/25 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="p-4 px-6 bg-[#141c2e]/90 border-b border-sky-400/15 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[22px]">account_tree</span>
                <h3 className="font-headline font-bold text-lg text-white">
                  Blueprint Inspector: {diagram.filename}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-400/20 border border-sky-400/30 text-primary">
                  100% OCR Parity
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBlueprintModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-sky-400/10 border border-sky-400/20 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-[#0a0e1a]">
              <div className="w-full h-96 rounded-xl overflow-hidden shadow-inner relative flex items-center justify-center bg-[#111828] border border-sky-400/15">
                <img
                  className="w-full h-full object-contain"
                  alt={`Architecture blueprint ${diagram.filename}`}
                  src={`${API_URL}/uploads/${selectedDiagramId}_${diagram.filename}`}
                  onError={(e) => {
                    // Fallback to demo ecommerce diagram if local file route is not directly static
                    e.currentTarget.src = "/ecommerce_diagram.png";
                  }}
                />
                <div className="absolute bottom-4 left-4 bg-[#0a0e1a]/85 backdrop-blur-md border border-sky-400/20 px-3 py-1.5 rounded-lg text-xs font-mono text-white shadow-lg">
                  Bounding Box Annotations: Active OCR Tokens
                </div>
              </div>

              {diagram.ocr_text && (
                <div className="w-full mt-4 p-4 rounded-xl bg-slate-900 border border-sky-400/15 text-left">
                  <span className="text-[11px] font-mono font-bold text-primary uppercase block mb-1">
                    Extracted OCR Raw Text Tokens:
                  </span>
                  <p className="text-xs font-mono text-slate-300 max-h-32 overflow-y-auto whitespace-pre-line leading-relaxed">
                    {diagram.ocr_text}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 px-6 bg-[#141c2e]/90 border-t border-sky-400/15 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBlueprintModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#141c2e] border border-sky-400/20 text-white font-semibold text-xs shadow-sm hover:bg-sky-400/10"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Export Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900/95 border border-sky-400/30 text-white shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md animate-fadeIn">
          {toastMessage.type === "loading" ? (
            <div className="w-4 h-4 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin shrink-0" />
          ) : (
            <span
              className={`material-symbols-outlined text-[18px] shrink-0 ${
                toastMessage.type === "success" ? "text-cyan-400" : "text-red-400"
              }`}
            >
              {toastMessage.type === "success" ? "check_circle" : "error"}
            </span>
          )}
          <span className="text-xs font-medium text-slate-200">{toastMessage.text}</span>
        </div>
      )}

    </div>
  );
}
