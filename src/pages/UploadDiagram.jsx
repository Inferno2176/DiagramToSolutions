import React, { useState, useRef } from "react";

export default function UploadDiagram({ token, navigateTo, setSelectedDiagramId, onAuthError }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const API_URL = "http://localhost:8000";

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError("");
    if (!selectedFile) return;

    const fileExt = selectedFile.name.split(".").pop().toLowerCase();
    const validExtensions = ["png", "jpg", "jpeg", "pdf"];

    if (!validExtensions.includes(fileExt)) {
      setError("Unsupported file format. Please upload PNG, JPG, JPEG, or PDF.");
      setFile(null);
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError("File exceeds the maximum allowed size (15 MB).");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a valid blueprint file to upload.");
      return;
    }

    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/diagrams/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        if (onAuthError) onAuthError();
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to upload diagram");
      }

      setSelectedDiagramId(data.id);
      navigateTo("progress");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 animate-fadeIn">
      
      {/* Return Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateTo("dashboard")}
          className="inline-flex items-center gap-1.5 text-xs font-label font-semibold text-slate-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[17px]">arrow_back</span>
          Return to Operations Dashboard
        </button>

        <span className="text-[11px] font-mono text-sky-400/80 bg-sky-950/60 border border-sky-400/20 px-2.5 py-0.5 rounded-full">
          PIPELINE: MULTI-MODAL INGESTION
        </span>
      </div>

      {/* Title & Introduction */}
      <div className="space-y-1 sm:space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary font-label">
            Architecture Blueprint Ingestion
          </span>
        </div>
        <h1 className="font-headline font-bold text-2xl sm:text-3xl text-white tracking-tight leading-snug">
          Upload Architecture Blueprint
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
          Upload a network layout, microservice block diagram, or database schema. PaddleOCR extracts spatial entity tokens, and Gemini synthesizes production-grade engineering documentation.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3 text-xs flex items-center gap-2.5 animate-fadeIn">
          <span className="material-symbols-outlined text-[18px] text-red-400 shrink-0">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Upload Card */}
      <div className="glass-panel rounded-2xl p-5 sm:p-7 relative overflow-hidden">
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          
          {/* Drag and Drop Surface */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
            className={`
              border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[190px] sm:min-h-[220px]
              ${dragActive
                ? "border-primary bg-sky-500/10 shadow-[0_0_30px_rgba(56,189,248,0.25)] scale-[1.01]"
                : file
                ? "border-primary/60 bg-sky-500/5 shadow-inner"
                : "border-sky-400/20 hover:border-sky-400/50 hover:bg-white/[0.02]"}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={handleChange}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500/20 to-cyan-400/20 border border-sky-400/30 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(56,189,248,0.2)] mb-3">
              <span className="material-symbols-outlined text-[26px]">cloud_upload</span>
            </div>

            <h3 className="font-headline font-bold text-base sm:text-lg text-white">
              {file ? file.name : "Drag and drop architecture blueprint"}
            </h3>

            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {file 
                ? `Selected file size: ${formatFileSize(file.size)} • Click to replace` 
                : "Select an image or vector PDF from your workstation"}
            </p>

            {/* Allowed format tags */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium bg-slate-900 border border-sky-400/20 text-sky-300">
                PNG
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium bg-slate-900 border border-sky-400/20 text-sky-300">
                JPG / JPEG
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium bg-slate-900 border border-purple-400/20 text-purple-300">
                PDF
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium bg-slate-900 border border-slate-700 text-slate-400">
                Max 15 MB
              </span>
            </div>
          </div>

          {/* Selected File Details Bar */}
          {file && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-sky-400/25 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[22px]">
                    {file.name.endsWith(".pdf") ? "picture_as_pdf" : "image"}
                  </span>
                </span>
                <div>
                  <p className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    {formatFileSize(file.size)} • Ready for OCR Ingestion
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/20 flex items-center justify-center transition-colors"
                title="Remove file"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
              <span>Encrypted transfer via HMAC-SHA256 authenticated tunnel</span>
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-label font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_24px_rgba(56,189,248,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Uploading to Cluster...</span>
                </>
              ) : (
                <>
                  <span>Initiate Architecture Ingestion</span>
                  <span className="font-mono text-xs opacity-75">↵</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
