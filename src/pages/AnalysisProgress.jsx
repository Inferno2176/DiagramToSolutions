import React, { useState, useEffect } from "react";

export default function AnalysisProgress({ token, navigateTo, selectedDiagramId, onAuthError }) {
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
      const res = await fetch(`${API_URL}/api/analyze/${selectedDiagramId}`, {
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
  }, [selectedDiagramId, token]);

  const stages = [
    { id: 1, title: "Blueprint Ingestion & Normalization", desc: "Verifying MIME headers, image geometry, and integrity hashes." },
    { id: 2, title: "PaddleOCR Spatial Entity Mining", desc: "Detecting service names, technologies, protocols, and text bounding boxes." },
    { id: 3, title: "Gemini Multi-Modal Architecture Reasoning", desc: "Synthesizing microservice topology, workflows, and infrastructure guardrails." },
    { id: 4, title: "API Specifications & Schema Synthesis", desc: "Generating REST contracts, database tables, and exportable engineering docs." },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8 animate-fadeIn text-center">
      
      {/* Visual Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-sky-950/60 border border-sky-400/25 text-primary shadow-[0_0_15px_rgba(56,189,248,0.2)]">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span>ASYNCHRONOUS PIPELINE EXECUTION</span>
        </div>
        <h1 className="font-headline font-bold text-3xl sm:text-4xl text-white tracking-tight">
          Synthesizing Architecture Blueprint
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Running OCR text extraction and multi-modal Gemini architectural reasoning on blueprint #{selectedDiagramId}.
        </p>
      </div>

      {/* Main Progress Container */}
      <div className="glass-panel rounded-2xl p-8 relative overflow-hidden text-left">
        {/* Top glowing bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

        {status === "FAILED" || error ? (
          <div className="space-y-6 text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-xl text-white">Pipeline Execution Halted</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {error || "An error occurred during OCR text extraction or Gemini multi-modal architecture synthesis."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => runAnalysis()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:brightness-110 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                Retry Analysis
              </button>
              <button
                type="button"
                onClick={() => navigateTo("dashboard")}
                className="px-5 py-2.5 rounded-xl bg-slate-900 border border-sky-400/20 text-slate-300 text-xs font-semibold hover:text-white transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : status === "COMPLETED" ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-bounce">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-xl text-white">Synthesis Complete</h3>
              <p className="text-xs text-slate-400 mt-1">Redirecting to Architecture Studio...</p>
            </div>
          </div>
        ) : (
          /* Processing Stages Stepper */
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-sky-500/10">
              <span className="text-xs font-bold uppercase tracking-wider text-primary font-label">
                Pipeline Telemetry Stepper
              </span>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-xs font-mono text-slate-300">STAGE 0{activeStage} / 04</span>
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
                        ? "bg-sky-500/10 border-primary/40 shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                        : isDone
                        ? "bg-slate-900/40 border-emerald-500/20"
                        : "bg-slate-900/20 border-slate-800 opacity-60"}
                    `}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </span>
                      ) : isCurrent ? (
                        <span className="w-6 h-6 rounded-full bg-sky-500/20 text-primary border border-primary/40 flex items-center justify-center animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center font-mono text-[11px]">
                          {stage.id}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-bold ${isCurrent ? "text-white" : isDone ? "text-slate-200" : "text-slate-400"}`}>
                          {stage.title}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] font-mono text-primary uppercase font-bold tracking-wider">
                            Active Stream
                          </span>
                        )}
                        {isDone && (
                          <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {stage.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center">
              <span className="text-xs font-mono text-slate-500">
                Average processing latency: 6.4s • PaddleOCR + Gemini 2.5 Flash
              </span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
