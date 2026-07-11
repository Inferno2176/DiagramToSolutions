import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

export default function AnalysisProgress({ token, navigateTo, selectedDiagramId, onAuthError }) {
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState("");
  const API_URL = "http://localhost:8000";

  const runAnalysis = async () => {
    setStatus("PROCESSING");
    setError("");
    
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
      
      setStatus("COMPLETED");
      
      // Navigate to results and pass the analysis data (or let Results refetch it)
      setTimeout(() => {
        navigateTo("results", { analysis: data.analysis });
      }, 1200);
      
    } catch (err) {
      setError(err.message);
      setStatus("FAILED");
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

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 animate-fadeIn text-center">
      {/* Visual Header */}
      <div className="space-y-3">
        <div className="w-16 h-16 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center mx-auto text-brand-cyan">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">Analyzing Architecture</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Extracting diagram information and generating engineering insights...
          </p>
        </div>
      </div>

      <div className="glass-card p-8 border border-dark-700/60 text-left relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
        {status === "FAILED" || error ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Architecture analysis failed.</h3>
              <p className="text-sm text-slate-400 mt-1.5">
                {error || "An error occurred during OCR text extraction or LLM architecture synthesis."}
              </p>
            </div>
            <div className="flex gap-4 justify-center mt-6">
              <button
                onClick={() => runAnalysis()}
                className="glass-btn text-sm"
              >
                Retry Analysis
              </button>
              <button
                onClick={() => navigateTo("dashboard")}
                className="glass-btn-secondary text-sm"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : status === "COMPLETED" ? (
          <div className="flex flex-col items-center justify-center gap-4 text-brand-emerald animate-bounce">
            <CheckCircle2 className="w-16 h-16" />
            <span className="text-lg font-bold">Analysis Successful! Redirecting...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-6">
             <Loader2 className="w-16 h-16 text-brand-cyan animate-spin" />
             <p className="text-brand-cyan font-semibold text-lg animate-pulse">Running Analysis Pipeline...</p>
          </div>
        )}
      </div>
    </div>
  );
}
