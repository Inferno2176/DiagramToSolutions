import React, { useState } from "react";
import { Lock, User as UserIcon, ArrowRight, Sparkles } from "lucide-react";

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

        setSuccessMsg("Registration successful! You can now log in.");
        setIsRegister(false);
        setPassword("");
      } else {
        // Login flow
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
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Dynamic Cosmic Background Blur Blobs */}
      <div 
        className="neon-bg-glow w-96 h-96 bg-brand-cyan/20 -top-12 -left-12"
        style={{ animationDuration: "12s" }}
      />
      <div 
        className="neon-bg-glow w-[500px] h-[500px] bg-brand-purple/10 bottom-0 right-0"
        style={{ animationDuration: "18s" }}
      />

      <div className="w-full max-w-md glass-card p-8 border border-dark-700/60 relative z-10">
        {/* App Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-cyan to-brand-purple flex items-center justify-center shadow-lg shadow-brand-cyan/20 mb-4 animate-pulse-slow">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent text-center">
            Diagram-to-Solution
          </h1>
          <p className="text-xs text-brand-cyan font-semibold tracking-widest uppercase mt-1 glow-cyan">
            Engineering Platform MVP
          </p>
        </div>

        {/* Form Selection Tabs */}
        <div className="flex border-b border-dark-700 mb-6">
          <button
            type="button"
            className={`flex-1 pb-3 text-sm font-medium transition-all ${
              !isRegister
                ? "border-b-2 border-brand-cyan text-brand-cyan font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => {
              setIsRegister(false);
              setError("");
              setSuccessMsg("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 pb-3 text-sm font-medium transition-all ${
              isRegister
                ? "border-b-2 border-brand-cyan text-brand-cyan font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => {
              setIsRegister(true);
              setError("");
              setSuccessMsg("");
            }}
          >
            Register
          </button>
        </div>

        {/* Message Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald/90 rounded-lg p-3 text-sm mb-4">
            {successMsg}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 pointer-events-none z-20">
                <UserIcon className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                className="w-full glass-input"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="e.g. blesson"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 pointer-events-none z-20">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                className="w-full glass-input"
                style={{ paddingLeft: "2.75rem" }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn-primary flex items-center justify-center gap-2 mt-8 py-3 text-sm font-semibold"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isRegister ? "Create Account" : "Sign In"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
