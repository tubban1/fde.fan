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


      {/* View Switching Container */}
      {tab === "dashboard" ? (
        <Survey818Dashboard />
      ) : (
        <Survey818App />
      )}
    </div>
  );
}
