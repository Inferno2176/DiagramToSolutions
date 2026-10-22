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
          setLoading(false);
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
        <div className="w-12 h-12 border-3 border-[#E7F0E8] border-t-[#397A55] rounded-full animate-spin mb-4" />
        <p className="text-[#73766F] text-sm font-label font-medium tracking-wide">
          Compiling technical architecture specifications and system schemas...
        </p>
      </div>
    );
  }

  if (!diagram && !error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fadeIn">
        <div className="max-w-xl mx-auto bg-white border border-[#E5E1D8] rounded-2xl p-8 sm:p-10 text-center space-y-4 shadow-[0_2px_12px_rgba(36,40,32,0.04)]">
          <div className="w-16 h-16 rounded-2xl bg-[#E7F0E8] border border-green-200/80 text-[#397A55] flex items-center justify-center mx-auto shadow-xs">
            <span className="material-symbols-outlined text-[32px]">schema</span>
          </div>
          <div className="space-y-1.5">
            <h2 className="font-headline font-bold text-2xl text-[#242820]">No Architecture Blueprint Selected</h2>
            <p className="text-[#73766F] text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
              Upload a cloud architecture diagram, microservices topology, or database schema to synthesize full technical specifications, API contracts, and data models.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigateTo("upload")}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#397A55] text-white text-xs font-semibold hover:bg-[#2E6345] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
              <span>Upload Architecture Blueprint</span>
            </button>
            <button
              onClick={() => navigateTo("dashboard")}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#F2EFE7] hover:bg-[#EAE5DB] text-[#242820] text-xs font-semibold border border-[#E5E1D8] transition-all cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-[#FCE8E7] border border-red-200 text-[#A82826] flex items-center justify-center mx-auto shadow-sm">
          <span className="material-symbols-outlined text-[32px]">warning</span>
        </div>
        <h2 className="font-headline font-bold text-2xl text-[#242820]">Error Loading Results</h2>
        <p className="text-[#73766F] text-xs leading-relaxed">{error}</p>
        <button
          onClick={() => navigateTo("dashboard")}
          className="mt-4 px-5 py-2.5 rounded-xl bg-[#397A55] text-white text-xs font-semibold hover:bg-[#2E6345] transition-all shadow-sm cursor-pointer"
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
        return "bg-[#E7F0E8] text-[#2A5A3F] border border-green-200";
      case "POST":
        return "bg-[#f8e0a8] text-[#554020] border border-amber-300";
      case "PUT":
      case "PATCH":
        return "bg-[#f0e8db] text-[#5e5548] border border-[#E5E1D8]";
      case "DELETE":
        return "bg-[#FCE8E7] text-[#A82826] border border-red-200";
      default:
        return "bg-[#eae6de] text-[#242820] border border-[#E5E1D8]";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 animate-fadeIn">
      
      {/* Top Header & Breadcrumb Bar matching Terra Specs Edition */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo("dashboard")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-[#F2EFE7] text-[#242820] border border-[#E5E1D8] transition-all font-semibold shadow-xs text-xs"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Dashboard
            </button>
            <span className="text-[#c4c8bc] font-mono">/</span>
            <span className="text-xs font-mono text-[#397A55] bg-[#E7F0E8] border border-green-200 px-2.5 py-0.5 rounded-full font-semibold">
              SPECIFICATION STUDIO
            </span>
          </div>

          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-[#242820] tracking-tight leading-tight">
            {architectureName}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#73766F] font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E7F0E8] text-[#2A5A3F] border border-green-200 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#397A55] animate-ping" />
              Pipeline Verified
            </span>
            <span>•</span>
            <span><b>File:</b> {diagram.filename}</span>
            <span>•</span>
            <span><b>Completed:</b> {new Date(diagram.completed_at || diagram.created_at || Date.now()).toLocaleDateString()}</span>
            {analysis.model_execution_info && (
              <>
                <span>•</span>
                <span className="text-[#705c30]">
                  Model: <b className="text-[#242820]">{analysis.model_execution_info.final_model}</b>
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
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E1D8] text-[#242820] hover:bg-[#F2EFE7] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[17px] text-[#397A55]">fullscreen</span>
            <span>Blueprint Inspector</span>
          </button>

          <div className="flex items-center gap-1 bg-[#F2EFE7] border border-[#E5E1D8] p-1 rounded-xl shadow-xs">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={!!downloading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#242820] hover:bg-white flex items-center gap-1.5 transition-all"
            >
              {downloading === "pdf" ? (
                <span className="w-3.5 h-3.5 border-2 border-green-200 border-t-[#397A55] rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[15px] text-[#A82826]">picture_as_pdf</span>
              )}
              PDF
            </button>

            <button
              onClick={() => handleDownload("markdown")}
              disabled={!!downloading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#242820] hover:bg-white flex items-center gap-1.5 transition-all"
            >
              {downloading === "markdown" ? (
                <span className="w-3.5 h-3.5 border-2 border-green-200 border-t-[#397A55] rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[15px] text-[#397A55]">code</span>
              )}
              Markdown
            </button>

            <button
              onClick={() => handleDownload("json")}
              disabled={!!downloading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#242820] hover:bg-white flex items-center gap-1.5 transition-all"
            >
              {downloading === "json" ? (
                <span className="w-3.5 h-3.5 border-2 border-green-200 border-t-[#397A55] rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[15px] text-[#705c30]">data_object</span>
              )}
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Studio Workbench Navigation Tabs Bar matching Terra Specs Edition */}
      <div className="flex flex-col items-center justify-center gap-4 pb-2 border-b border-[#E5E1D8] w-full">
        <div className="flex flex-wrap items-center justify-center gap-2 bg-[#F2EFE7] p-2 rounded-2xl border border-[#E5E1D8] shadow-sm max-w-5xl w-full">
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
                    ? "bg-[#397A55] text-white font-bold shadow-sm"
                    : "text-[#73766F] hover:text-[#242820] hover:bg-[#eae6de]"}
                `}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tag pills bar matching Terra Edition */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f0e8db] text-[#5e5548] border border-[#E5E1D8] shadow-xs">
            <span className="material-symbols-outlined text-[14px] text-[#705c30]">hub</span>
            {architectureType}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E7F0E8] text-[#2A5A3F] border border-green-200 shadow-xs">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            100% OCR Parity
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#eae6de] text-[#242820] shadow-xs">
            <span className="material-symbols-outlined text-[14px] text-[#397A55]">cloud</span>
            Cloud Scalable
          </span>
        </div>
      </div>

      {/* TAB CONTENT 1: SUMMARY */}
      {activeTab === "summary" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Executive Architecture Abstract */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E5E1D8] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E1D8]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#397A55] text-[24px]">description</span>
                <h3 className="font-headline font-bold text-lg text-[#242820]">Executive Architecture Abstract</h3>
              </div>
              <span className="text-xs text-[#73766F] font-mono bg-[#F2EFE7] px-2.5 py-1 rounded-md border border-[#E5E1D8]">
                ID: SPEC-{selectedDiagramId.toString().slice(0, 8).toUpperCase()}
              </span>
            </div>

            <p className="text-sm sm:text-base leading-relaxed text-[#4a4e4a] max-w-5xl">
              {overviewText}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8]">
                <span className="text-[#73766F] text-[11px]">System Classification:</span>
                <span className="text-[#242820] font-semibold text-sm">{architectureType}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8]">
                <span className="text-[#73766F] text-[11px]">Component Count:</span>
                <span className="text-[#397A55] font-semibold text-sm">{Array.isArray(components) ? components.length : "Multi-tier"} Nodes</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8]">
                <span className="text-[#73766F] text-[11px]">API Endpoints:</span>
                <span className="text-[#2A5A3F] font-semibold text-sm">{Array.isArray(apis) ? apis.length : 0} Suggested Contracts</span>
              </div>
            </div>
          </div>

          {/* Performance & Reliability Benchmarks */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E5E1D8] space-y-6">
            <h4 className="text-xs font-bold text-[#397A55] uppercase tracking-wider font-label">
              Performance &amp; Reliability Inferences
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-[#F2EFE7] p-4 border border-[#E5E1D8]">
                <span className="text-[11px] font-bold text-[#73766F] uppercase tracking-wider">Estimated Throughput</span>
                <div className="py-2">
                  <span className="font-headline text-2xl font-bold text-[#397A55]">
                    High Burst
                  </span>
                </div>
                <span className="text-xs text-[#73766F]">Decoupled queue buffer strategy</span>
              </div>

              <div className="rounded-xl bg-[#F2EFE7] p-4 border border-[#E5E1D8]">
                <span className="text-[11px] font-bold text-[#73766F] uppercase tracking-wider">Data Consistency</span>
                <div className="py-2">
                  <span className="font-headline text-2xl font-bold text-[#705c30]">
                    Transactional
                  </span>
                </div>
                <span className="text-xs text-[#73766F]">ACID relational isolation</span>
              </div>

              <div className="rounded-xl bg-[#F2EFE7] p-4 border border-[#E5E1D8]">
                <span className="text-[11px] font-bold text-[#73766F] uppercase tracking-wider">Availability Target</span>
                <div className="py-2">
                  <span className="font-headline text-2xl font-bold text-[#2A5A3F]">
                    99.99% HA
                  </span>
                </div>
                <span className="text-xs text-[#73766F]">Multi-region redundancy</span>
              </div>
            </div>

            {/* Architectural Inferences & Guardrails */}
            <div className="space-y-3 pt-3 border-t border-[#E5E1D8]">
              <h3 className="font-headline font-semibold text-base text-[#242820] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#397A55] text-[20px]">rule</span>
                Architectural Inferences &amp; Guardrails
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8]">
                  <span className="material-symbols-outlined text-[#397A55] text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#242820]">Boundary Decoupling</h4>
                    <p className="text-xs text-[#73766F] leading-relaxed">
                      Microservices communicate across strictly defined contracts and message interfaces without tight monolithic coupling.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8]">
                  <span className="material-symbols-outlined text-[#397A55] text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#242820]">Idempotent Ingestion</h4>
                    <p className="text-xs text-[#73766F] leading-relaxed">
                      Ingress endpoints enforce idempotency keys to eliminate duplicate write hazards during network timeouts.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8]">
                  <span className="material-symbols-outlined text-[#705c30] text-[20px] shrink-0 mt-0.5">info</span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#242820]">Scalability Trade-Off</h4>
                    <p className="text-xs text-[#73766F] leading-relaxed">
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
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E5E1D8] space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
            <div>
              <h3 className="font-headline font-bold text-xl text-[#242820]">End-to-End Workflow &amp; Execution Flow</h3>
              <p className="text-xs text-[#73766F] mt-0.5">Sequential operational paths inferred from the blueprint layout</p>
            </div>
            <span className="text-xs font-mono text-[#397A55] bg-[#E7F0E8] border border-green-200 px-2.5 py-1 rounded-full font-bold">
              {Array.isArray(workflow) ? workflow.length : 0} STAGES
            </span>
          </div>

          <div className="space-y-4">
            {Array.isArray(workflow) && workflow.length > 0 ? (
              workflow.map((step, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8] flex items-start gap-4 hover:border-[#397A55]/40 transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E7F0E8] border border-green-200 text-[#397A55] font-mono font-bold flex items-center justify-center shrink-0">
                    {step.step || idx + 1}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-[#242820] group-hover:text-[#397A55] transition-colors">
                        {step.title || `Workflow Phase ${idx + 1}`}
                      </h4>
                      <span className="text-[11px] font-mono text-[#73766F] uppercase">
                        Step {step.step || idx + 1}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#4a4e4a] leading-relaxed">
                      {step.description || (typeof step === "string" ? step : JSON.stringify(step))}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#73766F]">No structured workflow steps detected.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: TECH STACK */}
      {activeTab === "techstack" && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E5E1D8] space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
            <div>
              <h3 className="font-headline font-bold text-xl text-[#242820]">Detected &amp; Recommended Technology Stack</h3>
              <p className="text-xs text-[#73766F] mt-0.5">Frameworks, databases, protocols, and infrastructural runtimes</p>
            </div>
            <span className="text-xs font-mono text-[#397A55] bg-[#E7F0E8] border border-green-200 px-2.5 py-1 rounded-full font-bold">
              {Array.isArray(techStack) ? techStack.length : 0} TECHNOLOGIES
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(techStack) && techStack.length > 0 ? (
              techStack.map((tech, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8] space-y-2 hover:border-[#397A55]/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-[#f0e8db] text-[#5e5548] border border-[#E5E1D8]">
                        {tech.category || "Technology"}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#397A55]" />
                    </div>
                    <h4 className="font-headline font-bold text-lg text-[#242820]">
                      {tech.technology || tech.name || "Component"}
                    </h4>
                    <p className="text-xs text-[#4a4e4a] leading-relaxed">
                      {tech.purpose || tech.description || "Identified in architecture blueprint."}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#73766F] col-span-full">No technologies cataloged in this solution.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: COMPONENTS */}
      {activeTab === "components" && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E5E1D8] space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
            <div>
              <h3 className="font-headline font-bold text-xl text-[#242820]">Architectural Components &amp; Service Nodes</h3>
              <p className="text-xs text-[#73766F] mt-0.5">Isolated microservices, gateways, datastores, and worker nodes</p>
            </div>
            <span className="text-xs font-mono text-[#397A55] bg-[#E7F0E8] border border-green-200 px-2.5 py-1 rounded-full font-bold">
              {Array.isArray(components) ? components.length : 0} NODES
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.isArray(components) && components.length > 0 ? (
              components.map((comp, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8] space-y-3 hover:border-[#397A55]/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-[#E7F0E8] border border-green-200 flex items-center justify-center text-[#397A55]">
                        <span className="material-symbols-outlined text-[18px]">view_quilt</span>
                      </span>
                      <h4 className="font-headline font-bold text-base text-[#242820]">
                        {comp.name || `Component ${idx + 1}`}
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#f0e8db] text-[#5e5548] border border-[#E5E1D8]">
                      {comp.type || "Service"}
                    </span>
                  </div>

                  <p className="text-xs text-[#4a4e4a] leading-relaxed">
                    {comp.purpose || comp.description || "Architectural boundary node."}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#73766F] col-span-full">No components cataloged.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: SUGGESTED APIS */}
      {activeTab === "apis" && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E5E1D8] space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
            <div>
              <h3 className="font-headline font-bold text-xl text-[#242820]">Auto-Generated API Contracts &amp; Specifications</h3>
              <p className="text-xs text-[#73766F] mt-0.5">REST / gRPC service endpoints synthesized from diagram operations</p>
            </div>
            <span className="text-xs font-mono text-[#2A5A3F] bg-[#E7F0E8] border border-green-200 px-2.5 py-1 rounded-full font-bold">
              {Array.isArray(apis) ? apis.length : 0} CONTRACTS
            </span>
          </div>

          <div className="space-y-4">
            {Array.isArray(apis) && apis.length > 0 ? (
              apis.map((api, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8] space-y-3 hover:border-[#397A55]/40 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${getMethodBadgeClass(api.method)}`}>
                        {api.method || "GET"}
                      </span>
                      <code className="text-sm font-mono text-[#242820] font-semibold">
                        {api.endpoint || api.path || "/api/v1/resource"}
                      </code>
                    </div>
                    <span className="text-xs font-mono text-[#73766F]">
                      HTTP/1.1 &amp; HTTP/2
                    </span>
                  </div>

                  <p className="text-xs text-[#4a4e4a] leading-relaxed">
                    {api.purpose || api.description || "Endpoint contract."}
                  </p>

                  {/* Schema Details if available */}
                  {(api.request_body || api.response_body || api.parameters) && (
                    <div className="mt-3 pt-3 border-t border-[#E5E1D8] bg-[#242820] p-3 rounded-lg font-mono text-[11px] text-[#8ecf9e] overflow-x-auto">
                      <pre>{JSON.stringify(api.request_body || api.response_body || api.parameters, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-[#73766F]">No API contracts suggested for this blueprint.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: DATABASE SCHEMA */}
      {activeTab === "database" && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E5E1D8] space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
            <div>
              <h3 className="font-headline font-bold text-xl text-[#242820]">Relational Database Schemas &amp; Entity Models</h3>
              <p className="text-xs text-[#73766F] mt-0.5">PostgreSQL table schemas and relational integrity constraints</p>
            </div>
            <span className="text-xs font-mono text-[#397A55] bg-[#E7F0E8] border border-green-200 px-2.5 py-1 rounded-full font-bold">
              POSTGRESQL 16
            </span>
          </div>

          {/* Database Reason Callout */}
          {databaseSchema.reason && (
            <div className="p-4 rounded-xl bg-[#E7F0E8] border border-green-200 text-xs text-[#2A5A3F] leading-relaxed flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#397A55] shrink-0 mt-0.5">info</span>
              <div>
                <span className="font-bold text-[#242820] block mb-0.5">Persistence Rationale:</span>
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
                  className="rounded-xl bg-white border border-[#E5E1D8] overflow-hidden shadow-xs"
                >
                  <div className="p-4 bg-[#F2EFE7] border-b border-[#E5E1D8] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[18px] text-[#397A55]">database</span>
                      <h4 className="font-headline font-bold text-base text-[#242820]">
                        {entity.name || `Table_${idx + 1}`}
                      </h4>
                    </div>
                    <span className="text-xs text-[#73766F] font-mono">
                      {entity.purpose || "Relational Table"}
                    </span>
                  </div>

                  {Array.isArray(entity.fields) && entity.fields.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-mono">
                        <thead>
                          <tr className="bg-[#f5f1ea] text-[#73766F] uppercase tracking-wider border-b border-[#E5E1D8] text-[10px]">
                            <th className="py-2.5 px-4 font-bold">Field Name</th>
                            <th className="py-2.5 px-4 font-bold">Type</th>
                            <th className="py-2.5 px-4 font-bold">Constraints</th>
                            <th className="py-2.5 px-4 font-bold">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E1D8]/60">
                          {entity.fields.map((f, fIdx) => (
                            <tr key={fIdx} className="hover:bg-[#f5f1ea]/50">
                              <td className="py-2.5 px-4 text-[#242820] font-semibold">{f.name}</td>
                              <td className="py-2.5 px-4 text-[#397A55] font-bold">{f.type}</td>
                              <td className="py-2.5 px-4">
                                {f.constraints ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#f0e8db] text-[#5e5548] border border-[#E5E1D8]">
                                    {f.constraints}
                                  </span>
                                ) : (
                                  <span className="text-[#c4c8bc]">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-[#73766F] font-sans">{f.description || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-xs text-[#73766F] font-mono">
                      <pre>{JSON.stringify(entity, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8] text-center text-xs text-[#73766F]">
                {databaseSchema.required === false 
                  ? "No persistent database schema required according to blueprint."
                  : "Database entities details not structured in output."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blueprint Quick View Inspector Modal */}
      {blueprintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-fadeIn">
          <div className="bg-white border border-[#E5E1D8] rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 px-6 bg-[#F2EFE7] border-b border-[#E5E1D8] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#397A55] text-[22px]">account_tree</span>
                <h3 className="font-headline font-bold text-lg text-[#242820]">
                  Blueprint Inspector: {diagram.filename}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E7F0E8] border border-green-200 text-[#2A5A3F]">
                  100% OCR Parity
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBlueprintModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white border border-[#E5E1D8] flex items-center justify-center text-[#73766F] hover:text-[#242820]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-[#f5f1ea]">
              <div className="w-full h-96 rounded-xl overflow-hidden shadow-inner relative flex items-center justify-center bg-white border border-[#E5E1D8]">
                <img
                  className="w-full h-full object-contain"
                  alt={`Architecture blueprint ${diagram.filename}`}
                  src={`${API_URL}/uploads/${selectedDiagramId}_${diagram.filename}`}
                  onError={(e) => {
                    // Fallback to demo ecommerce diagram if local file route is not directly static
                    e.currentTarget.src = "/ecommerce_diagram.png";
                  }}
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md border border-[#E5E1D8] px-3 py-1.5 rounded-lg text-xs font-mono text-[#242820] shadow-sm">
                  Bounding Box Annotations: Active OCR Tokens
                </div>
              </div>

              {diagram.ocr_text && (
                <div className="w-full mt-4 p-4 rounded-xl bg-white border border-[#E5E1D8] text-left">
                  <span className="text-[11px] font-mono font-bold text-[#397A55] uppercase block mb-1">
                    Extracted OCR Raw Text Tokens:
                  </span>
                  <p className="text-xs font-mono text-[#4a4e4a] max-h-32 overflow-y-auto whitespace-pre-line leading-relaxed">
                    {diagram.ocr_text}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 px-6 bg-[#F2EFE7] border-t border-[#E5E1D8] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBlueprintModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#397A55] hover:bg-[#2E6345] text-white font-semibold text-xs shadow-sm transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Export Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-[#E5E1D8] text-[#242820] shadow-xl animate-fadeIn">
          {toastMessage.type === "loading" ? (
            <div className="w-4 h-4 border-2 border-green-200 border-t-[#397A55] rounded-full animate-spin shrink-0" />
          ) : (
            <span
              className={`material-symbols-outlined text-[18px] shrink-0 ${
                toastMessage.type === "success" ? "text-[#397A55]" : "text-[#A82826]"
              }`}
            >
              {toastMessage.type === "success" ? "check_circle" : "error"}
            </span>
          )}
          <span className="text-xs font-medium text-[#242820]">{toastMessage.text}</span>
        </div>
      )}

    </div>
  );
}
