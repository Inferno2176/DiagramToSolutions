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
    // Reset stale dark setting from previous development session to default to Terra Light
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      localStorage.setItem("theme", "light");
      return "light";
    }
    return saved || "light";
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
    <div className="font-body antialiased min-h-screen flex flex-col relative overflow-x-hidden bg-surface text-on-surface selection:bg-primary/20 selection:text-primary transition-colors duration-200">
      
      {/* Top Header Navigation matching Terra Edition */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl border-b border-outline shadow-[0_1px_8px_rgba(36,40,32,0.04)] transition-colors duration-200">
        <div className="h-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-3">
          
          {/* Brand Logo & Version Pill */}
          <div 
            onClick={() => navigateTo("dashboard")} 
            className="flex items-center gap-3 shrink-0 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-all">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-headline font-bold text-base sm:text-lg tracking-tight text-on-surface whitespace-nowrap">
                DiagramToSolutions
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container tracking-wide">
                v2.5 Terra
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
                      px-3.5 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5 whitespace-nowrap
                      ${isActive
                        ? "bg-secondary-container text-on-secondary-container font-semibold rounded-lg shadow-2xs"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"}
                    `}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Command Trigger */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline text-on-surface-variant text-sm hover:text-on-surface hover:bg-surface-container transition-all shadow-2xs"
              title="Quick Command Palette (⌘K or Ctrl+K)"
            >
              <span className="material-symbols-outlined text-[17px]">search</span>
              <span className="text-xs">Search</span>
              <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-surface-container-high text-on-surface font-mono border border-outline">⌘K</kbd>
            </button>

            {/* Light / Dark Mode Toggle Button */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-xl border border-outline bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Light/Dark Theme"
            >
              <span className="material-symbols-outlined text-[18px]">
                {theme === "dark" ? "light_mode" : "dark_mode"}
              </span>
            </button>

            {/* Analyze Diagram Action Button */}
            <button
              id="new-blueprint-btn"
              type="button"
              onClick={() => navigateTo("upload")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold shadow-sm transition-all whitespace-nowrap cursor-pointer active:scale-95"
              title="Upload Blueprint"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Analyze Diagram</span>
            </button>

            {/* User Profile Avatar & Dropdown */}
            <div className="relative shrink-0">
              <button
                id="user-menu-btn"
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1 rounded-xl p-1 hover:bg-surface-container transition-all border border-transparent hover:border-outline cursor-pointer"
                aria-label="User Account Menu"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant text-[17px]">
                  {userMenuOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-[0_12px_40px_rgba(36,40,32,0.12)] bg-white border border-outline py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-outline">
                    <p className="text-xs font-semibold text-on-surface-variant">Authenticated as</p>
                    <p className="text-sm font-bold text-on-surface truncate" title={username}>{username}</p>
                  </div>
                  <button
                    onClick={() => navigateTo("settings")}
                    className="w-full px-4 py-2 text-left text-xs font-semibold flex items-center gap-2 text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">tune</span>
                    Workstation Settings
                  </button>
                  <button
                    onClick={() => navigateTo("history")}
                    className="w-full px-4 py-2 text-left text-xs font-semibold flex items-center gap-2 text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">history</span>
                    Telemetry Audit Log
                  </button>
                  <button
                    onClick={toggleTheme}
                    className="w-full px-4 py-2 text-left text-xs font-semibold flex items-center gap-2 text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      {theme === "dark" ? "light_mode" : "dark_mode"}
                    </span>
                    {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  </button>
                  <div className="border-t border-outline my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-error hover:bg-error-container/40 flex items-center gap-2 transition-colors"
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
              className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all shrink-0"
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
          <div className="lg:hidden bg-white/98 backdrop-blur-2xl border-b border-outline px-6 py-4 space-y-2 animate-fadeIn">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`
                    w-full px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all
                    ${isActive
                      ? "bg-secondary-container text-on-secondary-container border border-outline"
                      : "text-on-surface hover:bg-surface-container"}
                  `}
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Theme Toggle in Mobile Drawer */}
            <div className="pt-2 border-t border-outline flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Display Mode</span>
              <button
                onClick={toggleTheme}
                className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline text-xs font-semibold text-on-surface hover:bg-surface-container-high flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {theme === "dark" ? "light_mode" : "dark_mode"}
                </span>
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
            </div>

            <div className="border-t border-outline pt-3 mt-2 flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">Signed in as <b className="text-on-surface">{username}</b></span>
              <button
                onClick={handleLogout}
                className="text-xs text-error hover:underline font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-20 flex-1 relative z-10 bg-surface">
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
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-start justify-center pt-24 px-4 animate-fadeIn">
          <div className="w-full max-w-xl bg-white border border-outline rounded-2xl shadow-[0_20px_50px_rgba(36,40,32,0.15)] overflow-hidden">
            <div className="p-4 border-b border-outline flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[22px]">search</span>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to page or command (e.g. Upload, History, Specs)..."
                className="w-full bg-transparent text-on-surface placeholder:text-on-surface-variant font-body text-sm outline-none"
              />
              <kbd className="px-2 py-0.5 text-xs rounded bg-surface-container text-on-surface-variant font-mono border border-outline">ESC</kbd>
            </div>
            <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
              <button
                onClick={() => navigateTo("dashboard")}
                className="w-full p-3 rounded-xl flex items-center justify-between text-left hover:bg-surface-container text-on-surface group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">dashboard</span>
                  <div>
                    <p className="text-sm font-semibold">Operations Dashboard</p>
                    <p className="text-xs text-on-surface-variant">View live cluster metrics and pipeline throughput</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-on-surface-variant group-hover:text-primary">↵ JUMP</span>
              </button>
              <button
                onClick={() => navigateTo("upload")}
                className="w-full p-3 rounded-xl flex items-center justify-between text-left hover:bg-surface-container text-on-surface group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">cloud_upload</span>
                  <div>
                    <p className="text-sm font-semibold">Upload Architecture Blueprint</p>
                    <p className="text-xs text-on-surface-variant">Run OCR and Gemini architectural analysis on diagram</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-on-surface-variant group-hover:text-primary">↵ JUMP</span>
              </button>
              <button
                onClick={() => navigateTo("history")}
                className="w-full p-3 rounded-xl flex items-center justify-between text-left hover:bg-surface-container text-on-surface group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                  <div>
                    <p className="text-sm font-semibold">Historic Pipeline Telemetry</p>
                    <p className="text-xs text-on-surface-variant">Inspect previously generated architecture solutions</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-on-surface-variant group-hover:text-primary">↵ JUMP</span>
              </button>
              <button
                onClick={() => navigateTo("settings")}
                className="w-full p-3 rounded-xl flex items-center justify-between text-left hover:bg-surface-container text-on-surface group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                  <div>
                    <p className="text-sm font-semibold">Workstation Settings</p>
                    <p className="text-xs text-on-surface-variant">Configure export formats and pipeline credentials</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-on-surface-variant group-hover:text-primary">↵ JUMP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
