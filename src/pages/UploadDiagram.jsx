import React, { useState, useRef } from "react";
import { Upload, File, AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";

export default function UploadDiagram({ token, navigateTo, setSelectedDiagramId }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [showDevOutput, setShowDevOutput] = useState(false);
  
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
      setError("Unsupported file format. Please upload a PNG, JPG, or PDF blueprint.");
      setFile(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
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
      setError("Please select a file to upload.");
      return;
    }

    setError("");
    setLoading(true);
    setOcrResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/api/diagrams/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

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

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Header back navigation */}
      <button
        onClick={() => navigateTo("dashboard")}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </button>

      <div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Upload Architecture Blueprint
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload a network layout, database structure, or system block diagram to extract OCR text labels.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {ocrResult ? (
        <div className="space-y-6">
          {/* Main OCR Output Display */}
          <div className="glass-card p-8 border border-dark-700/60 shadow-2xl relative overflow-hidden">
            {/* Glowing accent indicator */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-cyan" />
            
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">OCR Output</h2>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="font-semibold text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded border border-brand-cyan/20">SUCCESS</span>
                  <span>•</span>
                  <span><b>File:</b> {ocrResult.filename || file.name}</span>
                  <span>•</span>
                  <span><b>Total Detections:</b> {ocrResult.total_detections}</span>
                </div>
              </div>

              <div className="border-t border-dark-700/60 pt-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Extracted Text</h3>
                <div className="bg-dark-950/80 border border-dark-700 rounded-xl p-6 font-mono text-sm text-slate-200 whitespace-pre-line leading-relaxed max-h-[400px] overflow-y-auto shadow-inner">
                  {ocrResult.plain_text}
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Developer Output for Debugging */}
          <div className="glass-card p-6 border border-dark-700/60">
            <button
              type="button"
              onClick={() => setShowDevOutput(!showDevOutput)}
              className="flex items-center justify-between w-full text-slate-300 hover:text-white transition-colors"
            >
              <span className="text-sm font-extrabold tracking-tight flex items-center gap-2">
                Developer Output
              </span>
              {showDevOutput ? <ChevronDown className="w-5 h-5 text-brand-cyan" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </button>
            
            {showDevOutput && (
              <div className="mt-4 bg-dark-950 border border-dark-700 rounded-xl p-4 font-mono text-xs text-brand-cyan overflow-x-auto max-h-[300px] scrollbar-thin">
                <pre>{JSON.stringify(ocrResult, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Action button to perform another run */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setOcrResult(null);
                setFile(null);
                setError("");
              }}
              className="glass-btn-primary flex items-center gap-2 text-sm"
            >
              Upload Another Diagram
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card p-8 border border-dark-700/60">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Drag and Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={onButtonClick}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[260px] ${
                dragActive
                  ? "border-brand-cyan bg-brand-cyan/5 shadow-lg shadow-brand-cyan/5 scale-[1.01]"
                  : file
                  ? "border-brand-purple bg-brand-purple/5"
                  : "border-dark-700 hover:border-slate-500 hover:bg-white/5"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleChange}
                accept=".png,.jpg,.jpeg,.pdf"
              />

              {file ? (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple mx-auto border border-brand-purple/20">
                    <File className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-xs text-red-400 hover:underline hover:text-red-300 font-medium"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-dark-800 flex items-center justify-center text-slate-400 mx-auto border border-dark-700">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">
                      Drag and drop file here, or click to browse
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Accepts PNG, JPG, JPEG, and PDF blueprints up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action button */}
            {file && (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="glass-btn-secondary text-sm"
                  disabled={loading}
                >
                  Clear Selection
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-btn-primary flex items-center gap-2 text-sm"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Upload & Analyze
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

