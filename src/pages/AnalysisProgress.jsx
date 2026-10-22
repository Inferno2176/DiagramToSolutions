import React, { useState, useEffect } from "react";

export default function AnalysisProgress({
  token,
  navigateTo,
  selectedDiagramId,
  selectedDiagramMode = "auto",
  onAuthError
}) {
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState("");
  const [activeStage, setActiveStage] = useState(1);
  const API_URL = "http://localhost:8000";

  const runAnalysis = async () => {
    setStatus("PROCESSING");
    setError("");
    setActiveStage(1);

    const timer1 = setTimeout(() => setActiveStage(2), 2500);
    const timer2 = setTimeout(() => setActiveStage(3), 6000);

    try {
      const modeParam = encodeURIComponent(selectedDiagramMode || "auto");
      const res = await fetch(`${API_URL}/api/analyze/${selectedDiagramId}?mode=${modeParam}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        if (onAuthError) onAuthError();
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to analyze architecture.");
      }

      setActiveStage(4);
      setStatus("COMPLETED");

      // Auto redirect to specs studio results
      setTimeout(() => {
        navigateTo("results", { diagramId: selectedDiagramId });
      }, 1000);

    } catch (err) {
      setError(err.message);
      setStatus("FAILED");
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  };

  useEffect(() => {
    if (!selectedDiagramId) {
      navigateTo("dashboard");
      return;
    }
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDiagramId, token, selectedDiagramMode]);

  const stages = [
    { id: 1, title: "Blueprint Ingestion & Normalization", desc: "Verifying MIME headers, image geometry, and background illumination." },
    {
      id: 2,
      title: selectedDiagramMode === "handwritten" ? "Multimodal Vision & Shadow-Free OCR" : "Hybrid Spatial Entity Mining & OCR",
      desc: selectedDiagramMode === "handwritten"
        ? "Eliminating paper/whiteboard shadows and transcribing handwritten notes with Gemini Vision."
        : "Extracting service names, technologies, protocols, and text bounding boxes via PaddleOCR & Vision."
    },
    { id: 3, title: "Gemini Multi-Modal Architecture Reasoning", desc: "Synthesizing microservice topology, workflows, and infrastructure guardrails." },
    { id: 4, title: "API Specifications & Schema Synthesis", desc: "Generating REST contracts, database tables, and exportable engineering docs." },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8 animate-fadeIn text-center">
      
      {/* Visual Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#f0e8db] border border-[#E5E1D8] text-[#5e5548] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#397A55] animate-ping" />
          <span>ASYNCHRONOUS PIPELINE EXECUTION</span>
        </div>
        <h1 className="font-headline font-bold text-3xl sm:text-4xl text-[#242820] tracking-tight">
          Synthesizing Architecture Blueprint
        </h1>
        <p className="text-sm text-[#73766F] max-w-lg mx-auto leading-relaxed">
          Running OCR text extraction and multi-modal Gemini architectural reasoning on blueprint #{selectedDiagramId}.
        </p>
      </div>

      {/* Main Progress Container */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E5E1D8] shadow-[0_4px_20px_rgba(46,50,48,0.04)] relative overflow-hidden text-left">
        {/* Top green accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#397A55] to-transparent opacity-80" />

        {status === "FAILED" || error ? (
          <div className="space-y-6 text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-[#FCE8E7] border border-red-200 text-[#A82826] flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-xl text-[#242820]">Pipeline Execution Halted</h3>
              <p className="text-xs text-[#73766F] max-w-md mx-auto leading-relaxed">
                {error || "An error occurred during OCR text extraction or Gemini multi-modal architecture synthesis."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => runAnalysis()}
                className="px-5 py-2.5 rounded-xl bg-[#397A55] hover:bg-[#2E6345] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                Retry Analysis
              </button>
              <button
                type="button"
                onClick={() => navigateTo("dashboard")}
                className="px-5 py-2.5 rounded-xl bg-white border border-[#E5E1D8] text-[#242820] hover:bg-[#F2EFE7] text-xs font-semibold transition-all shadow-xs"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : status === "COMPLETED" ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E7F0E8] border border-green-200 text-[#397A55] flex items-center justify-center shadow-sm animate-bounce">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-xl text-[#242820]">Synthesis Complete</h3>
              <p className="text-xs text-[#73766F] mt-1">Redirecting to Architecture Studio...</p>
            </div>
          </div>
        ) : (
          /* Processing Stages Stepper */
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E1D8]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#397A55] font-label">
                Pipeline Telemetry Stepper
              </span>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-green-200 border-t-[#397A55] rounded-full animate-spin" />
                <span className="text-xs font-mono text-[#73766F] font-semibold">STAGE 0{activeStage} / 04</span>
              </div>
            </div>

            <div className="space-y-4">
              {stages.map((stage) => {
                const isDone = activeStage > stage.id;
                const isCurrent = activeStage === stage.id;

                return (
                  <div
                    key={stage.id}
                    className={`
                      p-4 rounded-xl border transition-all flex items-start gap-3.5
                      ${isCurrent
                        ? "bg-[#E7F0E8]/40 border-green-200/80 shadow-xs"
                        : isDone
                        ? "bg-[#f5f1ea] border-[#E5E1D8]"
                        : "bg-[#faf6f0] border-[#E5E1D8]/60 opacity-60"}
                    `}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <span className="w-6 h-6 rounded-full bg-[#397A55] text-white flex items-center justify-center shadow-xs">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </span>
                      ) : isCurrent ? (
                        <span className="w-6 h-6 rounded-full bg-[#E7F0E8] text-[#397A55] border border-green-200 flex items-center justify-center animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-[#397A55]" />
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-[#f0ece4] text-[#73766F] border border-[#E5E1D8] flex items-center justify-center font-mono text-[11px]">
                          {stage.id}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-bold ${isCurrent ? "text-[#242820]" : isDone ? "text-[#242820]" : "text-[#73766F]"}`}>
                          {stage.title}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] font-mono text-[#397A55] uppercase font-bold tracking-wider">
                            Active Stream
                          </span>
                        )}
                        {isDone && (
                          <span className="text-[10px] font-mono text-[#2A5A3F] uppercase font-bold tracking-wider">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#73766F] leading-relaxed">
                        {stage.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center">
              <span className="text-xs font-mono text-[#73766F]">
                Average processing latency: 6.4s • PaddleOCR + Gemini 2.5 Flash
              </span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
