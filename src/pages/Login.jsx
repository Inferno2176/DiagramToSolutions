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
    <div className="font-body min-h-screen flex flex-col justify-between bg-surface text-on-surface selection:bg-primary/20 selection:text-primary relative overflow-x-hidden transition-colors duration-200">
      
      {/* Top Header Branding */}
      <header className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-[20px]">hub</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-headline font-bold text-lg tracking-tight text-on-surface leading-none">
              DiagramToSolutions
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container tracking-wide">
              v2.5 Terra
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {toggleTheme && (
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-xl bg-white border border-outline text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-all shadow-2xs"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className="material-symbols-outlined text-[18px]">
                {theme === "dark" ? "light_mode" : "dark_mode"}
              </span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-on-surface-variant bg-white border border-outline px-3.5 py-1.5 rounded-full shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>FASTAPI CLUSTER ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="w-full flex-1 flex items-center justify-center px-4 sm:px-6 py-8 relative z-10">
        <div className="w-full max-w-md relative flex flex-col items-center">
          
          {/* System Telemetry / Node Status Chip */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-outline text-on-surface-variant font-label text-[11px] font-medium tracking-wide shadow-2xs mb-6">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="tracking-wider uppercase font-bold text-primary">AUTH REGION: US-EAST-1</span>
            <span className="text-outline">•</span>
            <span>NODE ACTIVE</span>
            <span className="text-outline">•</span>
            <span className="font-mono text-on-surface-variant">v2.18.4-prod</span>
          </div>

          {/* Main Card: Clean White Surface */}
          <div className="w-full bg-white border border-outline rounded-2xl p-8 lg:p-10 shadow-[0_4px_24px_rgba(36,40,32,0.06)] relative overflow-hidden">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />

            {/* Header Icon & Title */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-fixed border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-2xs">
                <span className="material-symbols-outlined text-[26px]">terminal</span>
              </div>
              <h1 className="font-headline text-2xl lg:text-3xl font-bold text-on-surface tracking-tight leading-snug">
                {isRegister ? "Create Developer Account" : "Sign in to Console"}
              </h1>
              <p className="font-body text-sm text-on-surface-variant mt-2 leading-relaxed">
                {isRegister 
                  ? "Provision workspace credentials to analyze architecture blueprints."
                  : "Enter your engineering workspace credentials to continue."}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-surface-container p-1 rounded-xl border border-outline mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-2 text-xs font-label font-semibold rounded-lg transition-all ${
                  !isRegister
                    ? "bg-primary text-white shadow-2xs"
                    : "text-on-surface-variant hover:text-on-surface"
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
                    ? "bg-primary text-white shadow-2xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Register
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 bg-error-container text-error rounded-xl p-3 text-xs flex items-center gap-2.5 animate-fadeIn border border-error/20">
                <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="mb-5 bg-primary-fixed text-on-primary-fixed rounded-xl p-3 text-xs flex items-center gap-2.5 animate-fadeIn border border-primary/20">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">check_circle</span>
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Username / Email Field */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-xs font-semibold text-on-surface tracking-wide flex items-center justify-between" htmlFor="username">
                  <span>{isRegister ? "Desired Username" : "Engineering Username / Email"}</span>
                  <span className="text-[11px] font-normal text-on-surface-variant">Directory Identity</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-on-surface-variant pointer-events-none">
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
                    className="w-full pl-11 pr-4 py-3 bg-white border border-outline rounded-xl text-on-surface placeholder:text-on-surface-variant/60 text-sm font-body outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label text-xs font-semibold text-on-surface tracking-wide" htmlFor="password">
                    Password
                  </label>
                  {!isRegister && (
                    <span className="font-label text-xs text-on-surface-variant">
                      Standard Security Policy
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-[20px] text-on-surface-variant pointer-events-none">
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
                    className="w-full pl-11 pr-11 py-3 bg-white border border-outline rounded-xl text-on-surface placeholder:text-on-surface-variant/60 text-sm font-body outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 p-1 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center focus:outline-none"
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
                      className="w-4 h-4 rounded text-primary bg-white border-outline focus:ring-primary/40 cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="remember" className="text-xs font-label font-medium text-on-surface cursor-pointer select-none">
                      Remember workstation for 30 days
                    </label>
                    <span className="text-[10px] text-on-surface-variant font-mono tracking-tight flex items-center gap-1 mt-0.5">
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
                className="w-full mt-3 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white font-label font-bold text-sm tracking-wide flex items-center justify-center gap-2 active:scale-[0.99] transition-all shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>{isRegister ? "Create Developer Account" : "Sign In to Workspace"}</span>
                    <span className="font-mono text-xs opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                      ↵ ENTER
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Toggle Mode Footer */}
            <div className="mt-8 pt-6 border-t border-outline flex items-center justify-center text-center">
              <p className="text-xs text-on-surface-variant font-body">
                {isRegister ? "Already registered?" : "Don't have an engineering profile?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="font-label font-semibold text-primary hover:text-primary-hover transition-colors ml-1 focus:underline outline-none cursor-pointer"
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
            <div className="w-full grid grid-cols-3 gap-2.5 text-center">
              <div className="flex flex-col items-center py-2.5 px-2 bg-white border border-outline rounded-xl shadow-2xs hover:border-primary/40 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-primary mb-1">tag</span>
                <span className="text-[11px] font-label font-semibold text-on-surface leading-tight">SHA-256 JWT</span>
                <span className="text-[10px] text-on-surface-variant font-mono mt-0.5">HMAC-signed</span>
              </div>
              <div className="flex flex-col items-center py-2.5 px-2 bg-white border border-outline rounded-xl shadow-2xs hover:border-primary/40 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-primary mb-1">policy</span>
                <span className="text-[11px] font-label font-semibold text-on-surface leading-tight">SOC 2 Type II</span>
                <span className="text-[10px] text-on-surface-variant font-mono mt-0.5">Continuous Audit</span>
              </div>
              <div className="flex flex-col items-center py-2.5 px-2 bg-white border border-outline rounded-xl shadow-2xs hover:border-primary/40 transition-colors">
                <span className="material-symbols-outlined text-[18px] text-primary mb-1">lock</span>
                <span className="text-[11px] font-label font-semibold text-on-surface leading-tight">End-to-End TLS</span>
                <span className="text-[10px] text-on-surface-variant font-mono mt-0.5">Strict TLS 1.3</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-6 text-center text-xs text-on-surface-variant font-mono relative z-10">
        © 2026 DiagramToSolutions Platform • Enterprise Architecture Synthesizer
      </footer>
    </div>
  );
}
