import React, { useState } from "react";

export default function Login({ onLoginSuccess, theme, toggleTheme }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const API_URL = "http://localhost:8000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isRegister) {
        // Register flow
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Registration failed");
        }

        setSuccessMsg("Account successfully provisioned. You can now sign in.");
        setIsRegister(false);
        setPassword("");
      } else {
        // Login flow - standard OAuth2 form encoding required by FastAPI backend
        const params = new URLSearchParams();
        params.append("username", username);
        params.append("password", password);

        const res = await fetch(`${API_URL}/api/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Incorrect username or password");
        }

        onLoginSuccess(data.access_token, username);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`font-body min-h-screen flex flex-col justify-between selection:bg-primary/20 selection:text-primary relative overflow-x-hidden transition-colors duration-200 ${
      theme === "light" ? "bg-slate-50 text-slate-900" : "bg-[#030712] text-on-surface"
    }`}>
      {/* Ethereal "Frozen Light" ambient glow backdrop matching Stitch */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-sky-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-[-10%] w-[500px] h-[400px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-950/20 via-transparent to-transparent" />
      </div>

      {/* Top Header Branding */}
      <header className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-sky-600/20 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(125,211,252,0.2)] backdrop-blur-md">
            <span className="material-symbols-outlined text-[20px]">hub</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-semibold text-base tracking-tight text-white leading-none">
              DiagramToSolutions
            </span>
            <span className="text-[10px] font-label font-medium text-primary/80 tracking-wide uppercase mt-0.5">
              Engineering Console v2.5
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {toggleTheme && (
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-xl bg-slate-900/60 border border-sky-400/20 text-slate-300 hover:text-primary flex items-center justify-center transition-all shadow-sm"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className="material-symbols-outlined text-[18px]">
                {theme === "dark" ? "light_mode" : "dark_mode"}
              </span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/60 border border-sky-400/15 px-3 py-1.5 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>FASTAPI CLUSTER ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="w-full flex-1 flex items-center justify-center px-6 py-10 relative z-10">
        <div className="w-full max-w-md relative flex flex-col items-center">
          
          {/* System Telemetry / Node Status Chip */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/70 border border-sky-400/20 text-on-surface-variant font-label text-[11px] font-medium tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-md mb-6">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="tracking-wider uppercase font-semibold text-primary">AUTH REGION: US-EAST-1</span>
            <span className="text-outline-variant">•</span>
            <span className="text-slate-300">NODE ACTIVE</span>
            <span className="text-outline-variant">•</span>
            <span className="text-primary/70 font-mono">v2.18.4-prod</span>
          </div>

          {/* Main Card: Frozen Light Translucent Glass */}
          <div className="w-full bg-[#0b1325]/70 backdrop-blur-xl border border-[rgba(125,211,252,0.2)] rounded-2xl p-8 lg:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(125,211,252,0.08)] relative overflow-hidden">
            {/* Top Frosted Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

            {/* Header Icon & Title */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-primary/25 flex items-center justify-center text-primary mb-4 shadow-[0_0_16px_rgba(125,211,252,0.15)]">
                <span className="material-symbols-outlined text-[26px]">terminal</span>
              </div>
              <h1 className="font-headline text-2xl lg:text-3xl font-semibold text-white tracking-tight leading-snug">
                {isRegister ? "Create Developer Account" : "Sign in to Console"}
              </h1>
              <p className="font-body text-sm text-on-surface-variant mt-2 leading-relaxed">
                {isRegister 
                  ? "Provision workspace credentials to analyze architecture blueprints."
                  : "Enter your engineering workspace credentials to continue."}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-[#070e1c] p-1 rounded-xl border border-sky-400/15 mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-2 text-xs font-label font-semibold rounded-lg transition-all ${
                  !isRegister
                    ? "bg-primary text-[#001f2e] shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-2 text-xs font-label font-semibold rounded-lg transition-all ${
                  isRegister
                    ? "bg-primary text-[#001f2e] shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3 text-xs flex items-center gap-2.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[18px] text-red-400 shrink-0">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="mb-5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-3 text-xs flex items-center gap-2.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[18px] text-emerald-400 shrink-0">check_circle</span>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Username / Email Field */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-xs font-semibold text-slate-200 tracking-wide flex items-center justify-between" htmlFor="username">
                  <span>{isRegister ? "Desired Username" : "Engineering Username / Email"}</span>
                  <span className="text-[11px] font-normal text-secondary">Directory Identity</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-slate-400 pointer-events-none">
                    alternate_email
                  </span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="engineer@company.com"
                    className="w-full pl-11 pr-4 py-3 bg-[#0f172a]/70 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-sm font-body outline-none focus:bg-[#0f172a]/95 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label text-xs font-semibold text-slate-200 tracking-wide" htmlFor="password">
                    Password
                  </label>
                  {!isRegister && (
                    <span className="font-label text-xs text-primary/80">
                      Standard Security Policy
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-slate-400 pointer-events-none">
                    lock
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full pl-11 pr-11 py-3 bg-[#0f172a]/70 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-sm font-body outline-none focus:bg-[#0f172a]/95 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center justify-center focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Workstation & Security Info */}
              {!isRegister && (
                <div className="flex items-start gap-3 pt-1">
                  <div className="flex items-center h-5">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-primary bg-[#0f172a]/70 border-slate-700 focus:ring-primary/40 cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="remember" className="text-xs font-label font-medium text-slate-300 cursor-pointer select-none">
                      Remember workstation for 30 days
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono tracking-tight flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[13px] text-primary">key</span>
                      Hardware-bound TLS 1.3 token handshake
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3.5 px-6 rounded-xl bg-gradient-to-r from-primary to-[#38bdf8] hover:from-[#38bdf8] hover:to-primary text-[#001f2e] font-label font-bold text-sm tracking-wide flex items-center justify-center gap-2 active:scale-[0.99] transition-all duration-200 shadow-[0_0_24px_rgba(125,211,252,0.35)] disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#001f2e]/30 border-t-[#001f2e] rounded-full animate-spin" />
                    <span>Processing Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>{isRegister ? "Create Developer Account" : "Sign In to Workspace"}</span>
                    <span className="font-mono text-xs opacity-75 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                      ↵ ENTER
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Toggle Mode Footer */}
            <div className="mt-8 pt-6 border-t border-slate-700/50 flex items-center justify-center text-center">
              <p className="text-xs text-on-surface-variant font-body">
                {isRegister ? "Already registered?" : "Don't have an engineering profile?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="font-label font-semibold text-primary hover:text-sky-300 transition-colors ml-1 focus:underline outline-none"
                >
                  {isRegister ? "Sign in to existing account" : "Create an account"}
                </button>
              </p>
            </div>
          </div>

          {/* Zero Trust Architecture Badges */}
          <div className="w-full mt-8 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[15px] text-primary">verified_user</span>
              <span className="text-[11px] font-label font-semibold text-primary uppercase tracking-wider">
                Zero Trust Architecture
              </span>
            </div>
            <div className="w-full grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center py-2.5 px-2 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-xl hover:border-primary/30 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-primary mb-1">tag</span>
                <span className="text-[11px] font-label font-semibold text-white leading-tight">SHA-256 JWT</span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">HMAC-signed</span>
              </div>
              <div className="flex flex-col items-center py-2.5 px-2 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-xl hover:border-primary/30 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-primary mb-1">policy</span>
                <span className="text-[11px] font-label font-semibold text-white leading-tight">SOC 2 Type II</span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">Continuous Audit</span>
              </div>
              <div className="flex flex-col items-center py-2.5 px-2 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-xl hover:border-primary/30 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-primary mb-1">lock</span>
                <span className="text-[11px] font-label font-semibold text-white leading-tight">End-to-End TLS</span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">Strict TLS 1.3</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-6 text-center text-xs text-slate-500 font-mono relative z-10">
        DiagramToSolutions Engineering Platform • Powered by PaddleOCR &amp; Gemini Multi-Modal Architecture Engine
      </footer>
    </div>
  );
}
