import React, { useState, useEffect } from "react";

// Page imports
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UploadDiagram from "./pages/UploadDiagram";
import AnalysisProgress from "./pages/AnalysisProgress";
import Results from "./pages/Results";
import History from "./pages/History";
import Settings from "./pages/Settings";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const getStoredToken = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryToken = urlParams.get("token") || urlParams.get("jwt_token");
      const queryUser = urlParams.get("username");
      if (queryToken) {
        localStorage.setItem("jwt_token", queryToken);
        if (queryUser) localStorage.setItem("username", queryUser);
        return queryToken;
      }
    } catch {
      // ignore
    }
    const t = localStorage.getItem("jwt_token");
    if (t === "null" || t === "undefined" || !t) return null;
    return t;
  };

  const [token, setToken] = useState(getStoredToken());
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedDiagramId, setSelectedDiagramId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Synchronize auth state with local storage
  const handleLoginSuccess = (userToken, name) => {
    localStorage.setItem("jwt_token", userToken);
    localStorage.setItem("username", name);
    setToken(userToken);
    setUsername(name);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername("");
    setCurrentPage("login");
    setUserMenuOpen(false);
  };

  const navigateTo = (page, options = {}) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setSearchModalOpen(false);
    if (options.diagramId) {
      setSelectedDiagramId(options.diagramId);
    }
  };

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setSearchModalOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auth Guard
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} theme={theme} toggleTheme={toggleTheme} />;
  }

  // Navigation Items according to Stitch Glacier Edition
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "results", label: "Architecture Specs", icon: "schema" },
    { id: "upload", label: "Upload Blueprint", icon: "cloud_upload" },
    { id: "history", label: "Analysis History", icon: "history" },
    { id: "settings", label: "Settings", icon: "tune" },
  ];

  return (
    <div className={`font-body antialiased min-h-screen flex flex-col relative overflow-x-hidden selection:bg-primary/20 selection:text-primary transition-colors duration-200 ${
      theme === "dark" ? "bg-[#0b0f19] text-on-surface" : "bg-slate-50 text-slate-800"
    }`}>
      
      {/* Ambient background glows matching Stitch Glacier Edition */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-10 left-1/4 w-96 h-96 rounded-full blur-3xl transition-opacity duration-300 ${theme === "dark" ? "bg-sky-500/5" : "bg-sky-500/10 opacity-70"}`} />
        <div className={`absolute top-80 right-10 w-[30rem] h-[30rem] rounded-full blur-3xl transition-opacity duration-300 ${theme === "dark" ? "bg-cyan-500/5" : "bg-cyan-500/10 opacity-70"}`} />
        <div className={`absolute bottom-10 left-1/3 w-[28rem] h-[28rem] rounded-full blur-3xl transition-opacity duration-300 ${theme === "dark" ? "bg-blue-600/5" : "bg-blue-600/10 opacity-60"}`} />
      </div>

      {/* Top Header Navigation matching dashboard_glacier.html */}
      <header className={`fixed top-0 w-full z-50 backdrop-blur-xl border-b transition-colors duration-200 ${
        theme === "dark"
          ? "bg-[#0b0f19]/90 border-primary/10 shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
          : "bg-white/90 border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
      }`}>
        <div className="h-16 w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2">
          
          {/* Brand Logo & Version Pill */}
          <div 
            onClick={() => navigateTo("dashboard")} 
            className="flex items-center gap-2 shrink-0 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-300 flex items-center justify-center text-[#001f2e] font-bold shadow-[0_0_15px_rgba(56,189,248,0.4)] group-hover:scale-105 transition-all">
              <span className="material-symbols-outlined text-[18px]">hub</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`font-headline font-bold text-base sm:text-lg tracking-tight drop-shadow-sm whitespace-nowrap ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}>
                DiagramToSolutions
              </span>
              <span className="hidden xl:inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-400/20 tracking-wide">
                v2.5
              </span>
            </div>
          </div>

          {/* Center Navigation Links (Clean, compact, no duplication with CTA button) */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0">
            {navItems
              .filter((item) => item.id !== "upload")
              .map((item) => {
                const isActive = 
                  currentPage === item.id ||
                  (item.id === "results" && currentPage === "results");

                const renderLabel = () => {
                  if (item.id === "results") return "Specs";
                  if (item.id === "history") return "History";
                  return item.label;
                };

                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`
                      px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm transition-all flex items-center gap-1.5 whitespace-nowrap
                      ${isActive
                        ? theme === "dark"
                          ? "bg-sky-500/15 border border-sky-400/30 text-sky-200 font-semibold shadow-[0_0_12px_rgba(56,189,248,0.15)]"
                          : "bg-sky-50 border border-sky-300 text-sky-800 font-bold shadow-sm"
                        : theme === "dark"
                          ? "text-slate-400 hover:bg-sky-500/10 hover:text-sky-200 font-medium"
                          : "text-slate-600 hover:bg-slate-100 hover:text-sky-700 font-medium"}
                    `}
                  >
                    <span className="material-symbols-outlined text-[16px] xl:text-[17px] opacity-80">{item.icon}</span>
                    <span>{renderLabel()}</span>
                  </button>
                );
              })}
          </nav>

          {/* Right Action Cluster: Quick Command + Theme Toggle + New Blueprint + User Section */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Command Trigger */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs transition-all shadow-sm ${
                theme === "dark"
                  ? "bg-slate-900/80 border-sky-500/15 text-slate-400 hover:text-slate-200 hover:border-sky-400/30"
                  : "bg-slate-100/90 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
              title="Quick Command Palette (⌘K or Ctrl+K)"
            >
              <span className="material-symbols-outlined text-[16px] text-sky-400">search</span>
              <kbd className={`px-1 py-0.5 text-[10px] rounded font-mono border ${
                theme === "dark" ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-white text-slate-600 border-slate-300"
              }`}>⌘K</kbd>
            </button>

            {/* Light / Dark Mode Toggle Button */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer ${
                theme === "dark"
                  ? "bg-slate-900/80 border-sky-500/15 text-amber-300 hover:text-amber-200 hover:border-sky-400/35"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:text-sky-600 hover:border-sky-300"
              }`}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Light/Dark Theme"
            >
              <span className="material-symbols-outlined text-[18px]">
                {theme === "dark" ? "light_mode" : "dark_mode"}
              </span>
            </button>

            {/* New Blueprint Action Button */}
            <button
              id="new-blueprint-btn"
              type="button"
              onClick={() => navigateTo("upload")}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 text-xs sm:text-sm font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] whitespace-nowrap cursor-pointer"
              title="Upload Blueprint"
            >
              <span className="material-symbols-outlined text-[17px]">add</span>
              <span>New Blueprint</span>
            </button>

            {/* User Profile Avatar & Dropdown */}
            <div className="relative shrink-0">
              <button
                id="user-menu-btn"
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1 rounded-xl p-1 hover:bg-white/5 transition-all border border-transparent hover:border-sky-400/20 cursor-pointer"
                aria-label="User Account Menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 p-[1px] shadow-[0_0_10px_rgba(56,189,248,0.3)] shrink-0">
                  <div className={`w-full h-full rounded-full flex items-center justify-center ${
                    theme === "dark" ? "bg-slate-900" : "bg-white"
                  }`}>
                    <span className="material-symbols-outlined text-sky-400 text-[18px]">person</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-[17px]">
                  {userMenuOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl py-2 z-50 animate-fadeIn border ${
                  theme === "dark"
                    ? "bg-[#111828] border-sky-400/20"
                    : "bg-white border-slate-200 text-slate-800"
                }`}>
                  <div className={`px-4 py-2 border-b ${theme === "dark" ? "border-sky-400/10" : "border-slate-100"}`}>
                    <p className="text-xs font-semibold text-slate-400">Authenticated as</p>
                    <p className={`text-sm font-bold truncate ${theme === "dark" ? "text-white" : "text-slate-900"}`} title={username}>{username}</p>
                  </div>
                  <button
                    onClick={() => navigateTo("settings")}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center gap-2 transition-colors ${
                      theme === "dark" ? "text-slate-300 hover:text-white hover:bg-sky-500/10" : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-sky-400">tune</span>
                    Workstation Settings
                  </button>
                  <button
                    onClick={() => navigateTo("history")}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center gap-2 transition-colors ${
                      theme === "dark" ? "text-slate-300 hover:text-white hover:bg-sky-500/10" : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-sky-400">history</span>
                    Telemetry Audit Log
                  </button>
                  <button
                    onClick={toggleTheme}
                    className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center gap-2 transition-colors ${
                      theme === "dark" ? "text-slate-300 hover:text-white hover:bg-sky-500/10" : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-sky-400">
                      {theme === "dark" ? "light_mode" : "dark_mode"}
                    </span>
                    {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  </button>
                  <div className={`border-t my-1 ${theme === "dark" ? "border-sky-400/10" : "border-slate-100"}`} />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile / Tablet Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-sky-500/10 hover:text-sky-300 transition-all shrink-0"
              type="button"
              aria-label="Toggle Navigation"
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0b0f19]/95 backdrop-blur-2xl border-b border-sky-400/20 px-6 py-4 space-y-2 animate-fadeIn">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`
                    w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all
                    ${isActive
                      ? "bg-sky-500/20 text-sky-200 border border-sky-400/30"
                      : "text-slate-300 hover:bg-white/5"}
                  `}
                >
                  <span className="material-symbols-outlined text-[20px] text-sky-400">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Theme Toggle in Mobile Drawer */}
            <div className="pt-2 border-t border-sky-400/10 flex items-center justify-between">
              <span className="text-xs text-slate-400">Display Mode</span>
              <button
                onClick={toggleTheme}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-sky-400/20 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {theme === "dark" ? "light_mode" : "dark_mode"}
                </span>
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
            </div>

            <div className="border-t border-sky-400/10 pt-3 mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">Signed in as <b className="text-white">{username}</b></span>
              <button
                onClick={handleLogout}
                className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-20 flex-1 relative z-10">
        <ErrorBoundary navigateTo={navigateTo} onReset={() => setCurrentPage("dashboard")}>
          {currentPage === "dashboard" && (
            <Dashboard
              token={token}
              navigateTo={navigateTo}
              setSelectedDiagramId={setSelectedDiagramId}
              onAuthError={handleLogout}
            />
          )}
          {currentPage === "upload" && (
            <UploadDiagram
              token={token}
              navigateTo={navigateTo}
              setSelectedDiagramId={setSelectedDiagramId}
              onAuthError={handleLogout}
            />
          )}
          {currentPage === "progress" && (
            <AnalysisProgress
              token={token}
              navigateTo={navigateTo}
              selectedDiagramId={selectedDiagramId}
              onAuthError={handleLogout}
            />
          )}
          {currentPage === "results" && (
            <Results
              token={token}
              navigateTo={navigateTo}
              selectedDiagramId={selectedDiagramId}
              setSelectedDiagramId={setSelectedDiagramId}
              onAuthError={handleLogout}
            />
          )}
          {currentPage === "history" && (
            <History
              token={token}
              navigateTo={navigateTo}
              setSelectedDiagramId={setSelectedDiagramId}
              onAuthError={handleLogout}
            />
          )}
          {currentPage === "settings" && (
            <Settings
              token={token}
              navigateTo={navigateTo}
              onAuthError={handleLogout}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Quick Command Palette (Cmd + K Modal) */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/80 backdrop-blur-md flex items-start justify-center pt-24 px-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-[#111828] border border-sky-400/25 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="p-4 border-b border-sky-400/15 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[22px]">search</span>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to page or command (e.g. Upload, History, Specs)..."
                className="w-full bg-transparent text-white placeholder:text-slate-500 font-body text-sm outline-none"
              />
              <kbd className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">ESC</kbd>
            </div>
            <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
              <button
                onClick={() => navigateTo("dashboard")}
                className="w-full p-3 rounded-xl flex items-center justify-between text-left hover:bg-sky-500/10 text-slate-200 hover:text-white group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sky-400 text-[20px]">dashboard</span>
                  <div>
                    <p className="text-sm font-semibold">Operations Dashboard</p>
                    <p className="text-xs text-slate-400">View live cluster metrics and pipeline throughput</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500 group-hover:text-primary">↵ JUMP</span>
              </button>
              <button
                onClick={() => navigateTo("upload")}
                className="w-full p-3 rounded-xl flex items-center justify-between text-left hover:bg-sky-500/10 text-slate-200 hover:text-white group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sky-400 text-[20px]">cloud_upload</span>
                  <div>
                    <p className="text-sm font-semibold">Upload Architecture Blueprint</p>
                    <p className="text-xs text-slate-400">Run OCR and Gemini architectural analysis on diagram</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500 group-hover:text-primary">↵ JUMP</span>
              </button>
              <button
                onClick={() => navigateTo("history")}
                className="w-full p-3 rounded-xl flex items-center justify-between text-left hover:bg-sky-500/10 text-slate-200 hover:text-white group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sky-400 text-[20px]">history</span>
                  <div>
                    <p className="text-sm font-semibold">Historic Pipeline Telemetry</p>
                    <p className="text-xs text-slate-400">Inspect previously generated architecture solutions</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500 group-hover:text-primary">↵ JUMP</span>
              </button>
              <button
                onClick={() => navigateTo("settings")}
                className="w-full p-3 rounded-xl flex items-center justify-between text-left hover:bg-sky-500/10 text-slate-200 hover:text-white group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-sky-400 text-[20px]">tune</span>
                  <div>
                    <p className="text-sm font-semibold">Workstation Settings</p>
                    <p className="text-xs text-slate-400">Configure export formats and pipeline credentials</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500 group-hover:text-primary">↵ JUMP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
