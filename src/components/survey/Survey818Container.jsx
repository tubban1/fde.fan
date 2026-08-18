import { useState, useEffect } from "react";
import Survey818App from "./Survey818App";
import Survey818Dashboard from "./Survey818Dashboard";

export default function Survey818Container() {
  const [tab, setTab] = useState("survey");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("tab") || params.get("view") || (params.has("admin") ? "dashboard" : null);
      if (view === "dashboard" || view === "admin") {
        setTab("dashboard");
      }
    }
  }, []);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", newTab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-[#f8fbff] py-6 px-4 sm:px-6">
      {/* Top Navigation Bar: Survey vs Dashboard */}
      <div className="max-w-7xl mx-auto flex justify-center mb-6">
        <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl inline-flex gap-2 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => handleTabChange("survey")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              tab === "survey"
                ? "bg-gradient-to-r from-cyan-500/20 to-cyan-400/10 border border-cyan-400/50 text-cyan-300 shadow-lg shadow-cyan-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <span>📝 现场诊断问卷</span>
          </button>
          <button
            onClick={() => handleTabChange("dashboard")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              tab === "dashboard"
                ? "bg-gradient-to-r from-lime-500/20 to-cyan-400/10 border border-lime-400/50 text-lime-300 shadow-lg shadow-lime-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <span>📊 数据看板 (Dashboard)</span>
          </button>
        </div>
      </div>

      {/* View Switching Container */}
      {tab === "dashboard" ? (
        <Survey818Dashboard />
      ) : (
        <Survey818App />
      )}
    </div>
  );
}
