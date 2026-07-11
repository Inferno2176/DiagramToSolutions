import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Shield, Key, Mail, ToggleLeft, ToggleRight, Check } from "lucide-react";

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
  }, [token]);

  const handleToggle = () => {
    setSettings(prev => ({
      ...prev,
      notifications_enabled: !prev.notifications_enabled
    }));
  };

  const handleSelectChange = (e) => {
    setSettings(prev => ({
      ...prev,
      default_export_format: e.target.value
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
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-brand-cyan/20 border-t-brand-cyan rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading settings panel...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Breadcrumb */}
      <button
        onClick={() => navigateTo("dashboard")}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </button>

      <div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Platform Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Customize your analysis preferences and developer credentials.
        </p>
      </div>

      <div className="glass-card p-6 border border-dark-700/60">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Profile */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-brand-cyan uppercase tracking-wider border-b border-dark-700/50 pb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Account Settings
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">Username</label>
                <input 
                  type="text" 
                  disabled 
                  value={settings.username} 
                  className="w-full glass-input bg-dark-950/40 text-slate-400 border-dark-700 cursor-not-allowed text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input 
                    type="email" 
                    value={settings.email}
                    onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full glass-input pl-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Preferences */}
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-bold text-brand-cyan uppercase tracking-wider border-b border-dark-700/50 pb-2">
              Pipeline Preferences
            </h3>
            
            <div className="flex items-center justify-between py-2 border-b border-dark-700/30">
              <div>
                <p className="text-sm font-semibold text-slate-200">Email Notifications</p>
                <p className="text-xs text-slate-400 mt-0.5">Receive an email summary when async analyses complete.</p>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                className="text-slate-400 hover:text-white transition-colors focus:outline-none"
              >
                {settings.notifications_enabled ? (
                  <ToggleRight className="w-10 h-10 text-brand-cyan" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-600" />
                )}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-200">Default Export Format</p>
                <p className="text-xs text-slate-400 mt-0.5">Select the default format when triggering batch downloads.</p>
              </div>
              <select
                value={settings.default_export_format}
                onChange={handleSelectChange}
                className="glass-input bg-dark-950 text-sm max-w-[140px]"
              >
                <option value="pdf">PDF</option>
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>

          {/* Section 3: Developer credentials */}
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-bold text-brand-cyan uppercase tracking-wider border-b border-dark-700/50 pb-2 flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Settings
            </h3>
            <div>
              <p className="text-sm font-semibold text-slate-200">Authentication Token Key</p>
              <p className="text-xs text-slate-400 mt-0.5 mb-2">Used to authorize script uploads or CLI clients.</p>
              <div className="font-mono text-xs text-brand-purple bg-dark-950 p-3 rounded-lg border border-dark-700/60 select-all break-all">
                {settings.api_key_placeholder || "sk_diag_••••••••••••••••••••"}
              </div>
            </div>
          </div>

          {/* Save button and alerts */}
          <div className="flex items-center justify-between border-t border-dark-700/60 pt-6">
            <div>
              {success && (
                <span className="flex items-center gap-1.5 text-xs text-brand-emerald font-semibold animate-fadeIn">
                  <Check className="w-4 h-4" />
                  Settings saved successfully
                </span>
              )}
            </div>
            
            <button
              type="submit"
              disabled={saving}
              className="glass-btn-primary flex items-center gap-2 text-sm px-6"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
