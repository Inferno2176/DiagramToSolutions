import React, { useState, useEffect } from "react";

export default function Settings({ token, navigateTo, onAuthError }) {
  const [settings, setSettings] = useState({
    username: "",
    email: "",
    notifications_enabled: true,
    theme: "dark",
    default_export_format: "pdf",
    api_key_placeholder: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const API_URL = "http://localhost:8000";

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/dashboard/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) {
          if (onAuthError) onAuthError();
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to load settings");
        }
        const data = await res.json();
        setSettings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleToggle = () => {
    setSettings((prev) => ({
      ...prev,
      notifications_enabled: !prev.notifications_enabled
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/dashboard/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.status === 401) {
        if (onAuthError) onAuthError();
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to save changes");
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-3 border-sky-400/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-slate-300 text-sm font-label font-medium tracking-wide">
          Loading workstation configuration...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 animate-fadeIn">
      
      {/* Return Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateTo("dashboard")}
          className="inline-flex items-center gap-2 text-xs font-label font-semibold text-slate-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Return to Operations Dashboard
        </button>

        <span className="text-xs font-mono text-sky-400/80 bg-sky-950/60 border border-sky-400/20 px-3 py-1 rounded-full">
          WORKSTATION PREFERENCES
        </span>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary font-label">
            Engineering Configuration
          </span>
        </div>
        <h1 className="font-headline font-bold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
          Workstation Settings
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          Manage your engineering identity, notification triggers, and default architecture export conventions.
        </p>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl p-4 text-xs flex items-center gap-3 animate-fadeIn">
          <span className="material-symbols-outlined text-[20px] text-emerald-400">check_circle</span>
          <span>Configuration saved successfully across cluster profile.</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl p-4 text-xs flex items-center gap-3 animate-fadeIn">
          <span className="material-symbols-outlined text-[20px] text-red-400">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Settings Form Container */}
      <div className="glass-panel rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Identity Section */}
          <div className="space-y-4">
            <h3 className="font-headline font-bold text-lg text-white flex items-center gap-2 pb-2 border-b border-sky-400/10">
              <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
              Identity &amp; Authentication Directory
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-label font-semibold text-slate-200" htmlFor="settings-user">
                  Username
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-slate-400 pointer-events-none">
                    person
                  </span>
                  <input
                    id="settings-user"
                    type="text"
                    value={settings.username || ""}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700/80 rounded-xl text-slate-400 text-xs font-mono outline-none cursor-not-allowed shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-label font-semibold text-slate-200" htmlFor="settings-email">
                  Work Email
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-slate-400 pointer-events-none">
                    alternate_email
                  </span>
                  <input
                    id="settings-email"
                    type="email"
                    value={settings.email || ""}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    placeholder="engineer@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a]/70 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-xs font-body outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Export Conventions */}
          <div className="space-y-4">
            <h3 className="font-headline font-bold text-lg text-white flex items-center gap-2 pb-2 border-b border-sky-400/10">
              <span className="material-symbols-outlined text-primary text-[20px]">download</span>
              Default Specification Export Format
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "pdf", label: "PDF Document", desc: "Compiled executive report with diagrams", icon: "picture_as_pdf" },
                { id: "markdown", label: "Markdown (.md)", desc: "GitHub-compatible engineering specs", icon: "code" },
                { id: "json", label: "Raw JSON Schema", desc: "Machine-parsable AST representation", icon: "data_object" }
              ].map((fmt) => (
                <div
                  key={fmt.id}
                  onClick={() => setSettings({ ...settings, default_export_format: fmt.id })}
                  className={`
                    p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between
                    ${settings.default_export_format === fmt.id
                      ? "bg-sky-500/10 border-primary shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[20px] text-primary">{fmt.icon}</span>
                    <input
                      type="radio"
                      name="export_format"
                      checked={settings.default_export_format === fmt.id}
                      onChange={() => setSettings({ ...settings, default_export_format: fmt.id })}
                      className="accent-primary"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-bold text-white">{fmt.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{fmt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry & Notifications Toggle */}
          <div className="space-y-4">
            <h3 className="font-headline font-bold text-lg text-white flex items-center gap-2 pb-2 border-b border-sky-400/10">
              <span className="material-symbols-outlined text-primary text-[20px]">notifications</span>
              Pipeline Notifications &amp; Telemetry
            </h3>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-sky-400/15">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">Asynchronous Synthesis Notifications</p>
                <p className="text-[11px] text-slate-400">Receive real-time completion status for multi-modal OCR runs</p>
              </div>

              <button
                type="button"
                onClick={handleToggle}
                className={`
                  w-12 h-6 flex items-center rounded-full p-1 transition-colors
                  ${settings.notifications_enabled ? "bg-primary" : "bg-slate-700"}
                `}
              >
                <div
                  className={`
                    bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform
                    ${settings.notifications_enabled ? "translate-x-6" : "translate-x-0"}
                  `}
                />
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-label font-bold text-xs shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
