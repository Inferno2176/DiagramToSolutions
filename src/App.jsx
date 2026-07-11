import React, { useState, useEffect } from "react";
import { 
  Home, Upload, Clock, Settings as SettingsIcon, LogOut, 
  Sparkles, Menu, X, User as UserIcon
} from "lucide-react";

// Page imports
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UploadDiagram from "./pages/UploadDiagram";
import AnalysisProgress from "./pages/AnalysisProgress";
import Results from "./pages/Results";
import History from "./pages/History";
import Settings from "./pages/Settings";

export default function App() {
  const getStoredToken = () => {
    const t = localStorage.getItem("jwt_token");
    if (t === "null" || t === "undefined" || !t) return null;
    return t;
  };
  const [token, setToken] = useState(getStoredToken());
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedDiagramId, setSelectedDiagramId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  };

  const navigateTo = (page) => {
    setCurrentPage(page);
    setMobileMenuOpen(false); // Close mobile drawer on navigation
  };

  // Auth Guard
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Sidebar navigation options
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <Home className="w-5 h-5" /> },
    { id: "upload", label: "Upload Diagram", icon: <Upload className="w-5 h-5" /> },
    { id: "history", label: "Analysis History", icon: <Clock className="w-5 h-5" /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      
      {/* Mobile Top Navbar */}
      <header className="md:hidden bg-dark-900/80 backdrop-blur-md border-b border-dark-700 px-4 py-3 flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-cyan to-brand-purple flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading font-extrabold text-white text-base tracking-tight">Diagram-to-Solution</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 transform -translate-x-full md:translate-x-0 
        transition-transform duration-300 md:relative md:flex flex-col 
        w-64 bg-dark-900/60 backdrop-blur-2xl border-r border-dark-700/60 p-6 z-50 
        ${mobileMenuOpen ? "translate-x-0" : ""}
      `}>
        {/* Brand Logo Header */}
        <div className="hidden md:flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-cyan to-brand-purple flex items-center justify-center shadow-lg shadow-brand-cyan/20 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-white text-base tracking-tight leading-none">Diagram-to-Solution</h2>
            <span className="text-[9px] text-brand-cyan font-bold tracking-wider uppercase">Engineering MVP</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.id || 
              (item.id === "upload" && currentPage === "progress") ||
              (item.id === "history" && currentPage === "results");
              
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`
                  w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                  ${isActive 
                    ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 shadow-inner shadow-brand-cyan/5" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"}
                `}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout bottom region */}
        <div className="border-t border-dark-700/60 pt-5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="truncate max-w-[140px]">
              <p className="text-xs font-semibold text-slate-400 leading-none">Logged in as</p>
              <p className="text-sm font-bold text-slate-200 mt-1 truncate" title={username}>{username}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all border border-transparent"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen px-4 md:px-8 py-6 md:py-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
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
        </div>
      </main>
    </div>
  );
}
