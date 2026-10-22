import React, { useState, useRef } from "react";

export default function UploadDiagram({
  token,
  navigateTo,
  setSelectedDiagramId,
  selectedDiagramMode = "auto",
  setSelectedDiagramMode,
  onAuthError
}) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [extractionMode, setExtractionMode] = useState(selectedDiagramMode || "auto");
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
    formData.append("mode", extractionMode);

    if (setSelectedDiagramMode) {
      setSelectedDiagramMode(extractionMode);
    }

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
      navigateTo("progress", { diagramId: data.id, mode: extractionMode });
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#73766F] hover:text-[#242820] transition-colors"
        >
          <span className="material-symbols-outlined text-[17px]">arrow_back</span>
          Return to Operations Dashboard
        </button>

        <span className="text-[11px] font-mono text-[#5e5548] bg-[#f0e8db] border border-[#E5E1D8] px-2.5 py-0.5 rounded-full font-semibold">
          PIPELINE: MULTI-MODAL INGESTION
        </span>
      </div>

      {/* Title & Introduction */}
      <div className="space-y-1 sm:space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#397A55] animate-ping" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#397A55] font-label">
            Architecture Blueprint Ingestion
          </span>
        </div>
        <h1 className="font-headline font-bold text-2xl sm:text-3xl text-[#242820] tracking-tight leading-snug">
          Upload Architecture Blueprint
        </h1>
        <p className="text-xs sm:text-sm text-[#73766F] max-w-2xl leading-relaxed">
          Upload a network layout, microservice block diagram, or database schema. PaddleOCR extracts spatial entity tokens, and Gemini synthesizes production-grade engineering documentation.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-[#FCE8E7] border border-red-200 text-[#A82826] rounded-xl p-3 text-xs flex items-center gap-2.5 animate-fadeIn">
          <span className="material-symbols-outlined text-[18px] text-[#A82826] shrink-0">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Upload Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-[0_4px_20px_rgba(46,50,48,0.04)] border border-[#E5E1D8] relative overflow-hidden">
        {/* Subtle green top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#397A55] to-transparent opacity-80" />

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
                ? "border-[#397A55] bg-[#E7F0E8]/40 shadow-sm scale-[1.01]"
                : file
                ? "border-[#397A55]/60 bg-[#E7F0E8]/20"
                : "border-[#E5E1D8] hover:border-[#397A55]/60 hover:bg-[#f5f1ea]/50 bg-white"}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={handleChange}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-xl bg-[#E7F0E8] border border-green-200/60 flex items-center justify-center text-[#397A55] shadow-xs mb-3">
              <span className="material-symbols-outlined text-[26px]">cloud_upload</span>
            </div>

            <h3 className="font-headline font-bold text-base sm:text-lg text-[#242820]">
              {file ? file.name : "Drag and drop architecture blueprint"}
            </h3>

            <p className="text-xs text-[#73766F] mt-1 max-w-sm">
              {file 
                ? `Selected file size: ${formatFileSize(file.size)} • Click to replace` 
                : "Select an image or vector PDF from your workstation"}
            </p>

            {/* Allowed format tags */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium bg-[#f0e8db] border border-[#E5E1D8] text-[#5e5548]">
                PNG
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium bg-[#f0e8db] border border-[#E5E1D8] text-[#5e5548]">
                JPG / JPEG
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium bg-[#f8e0a8] border border-amber-300 text-[#554020]">
                PDF
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium bg-[#eae6de] border border-[#E5E1D8] text-[#242820]">
                Max 15 MB
              </span>
            </div>
          </div>

          {/* Selected File Details Bar */}
          {file && (
            <div className="p-4 rounded-xl bg-[#f5f1ea] border border-[#E5E1D8] flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#E7F0E8] border border-green-200 flex items-center justify-center text-[#397A55] shrink-0">
                  <span className="material-symbols-outlined text-[22px]">
                    {file.name.endsWith(".pdf") ? "picture_as_pdf" : "image"}
                  </span>
                </span>
                <div>
                  <p className="text-sm font-bold text-[#242820] truncate max-w-xs sm:max-w-md">
                    {file.name}
                  </p>
                  <p className="text-xs text-[#73766F] font-mono">
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
                className="w-8 h-8 rounded-lg bg-[#FCE8E7] border border-red-200 text-[#A82826] hover:bg-red-100 flex items-center justify-center transition-colors"
                title="Remove file"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}

          {/* Extraction Engine & Handwriting Optimization Mode */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f1ea] border border-[#E5E1D8] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#397A55]">draw</span>
                <span className="text-xs sm:text-sm font-bold text-[#242820]">Extraction &amp; Handwriting Engine</span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#E7F0E8] border border-green-200/80 text-[#2A5A3F] font-semibold">
                SMART HYBRID OCR
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#73766F] leading-relaxed">
              Choose how text and layout will be parsed. Auto-detect balances local PaddleOCR speed with Gemini Multimodal Vision for whiteboard photos, paper sketches, and cursive handwriting.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {[
                {
                  id: "auto",
                  label: "Auto-Detect (Smart)",
                  badge: "Recommended",
                  desc: "Analyzes stroke variance & switches dynamically between local OCR and vision",
                  icon: "auto_awesome"
                },
                {
                  id: "handwritten",
                  label: "Handwritten / Whiteboard",
                  badge: "Shadow Filter",
                  desc: "Applies background division, contrast enhancement, and multimodal vision transcription",
                  icon: "edit"
                },
                {
                  id: "digital",
                  label: "Standard Digital Blueprint",
                  badge: "Fast Local",
                  desc: "Runs high-speed local PaddleOCR for clean vector/raster architecture diagrams",
                  icon: "terminal"
                },
              ].map((m) => {
                const isSelected = extractionMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setExtractionMode(m.id)}
                    className={`
                      p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer
                      ${isSelected
                        ? "bg-white border-[#397A55] shadow-xs text-[#242820] ring-1 ring-[#397A55]/30"
                        : "bg-[#eae6de]/50 border-transparent hover:border-[#E5E1D8] text-[#73766F] hover:bg-white/60"}
                    `}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined text-[19px] ${isSelected ? "text-[#397A55]" : "text-[#73766F]"}`}>
                          {m.icon}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                          isSelected ? "bg-[#E7F0E8] text-[#2A5A3F]" : "bg-[#ded9cf] text-[#5e5548]"
                        }`}>
                          {m.badge}
                        </span>
                      </div>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-[#397A55] bg-[#397A55]" : "border-[#73766F]"
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <p className="text-xs font-bold text-[#242820]">{m.label}</p>
                      <p className="text-[11px] text-[#73766F] mt-0.5 leading-snug">{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-[#73766F] font-mono flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#397A55]">verified_user</span>
              <span>Encrypted transfer via HMAC-SHA256 authenticated tunnel</span>
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#397A55] hover:bg-[#2E6345] text-white font-label font-bold text-sm tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
