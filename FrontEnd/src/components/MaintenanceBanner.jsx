import React, { useState, useEffect } from "react";
import "./MaintenanceBanner.css";

function MaintenanceBanner() {
  const [activeWindow, setActiveWindow] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkMaintenance = () => {
      try {
        const windows = JSON.parse(localStorage.getItem("ss_maintenance_windows") || "[]");
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0]; // "YYYY-MM-DD"
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        // Find an active window that covers the current date and time
        const match = windows.find((w) => {
          if (!w.active) return false;
          if (w.date !== todayStr) return false;
          const [startH, startM] = w.startTime.split(":").map(Number);
          const [endH, endM] = w.endTime.split(":").map(Number);
          const startMin = startH * 60 + startM;
          const endMin = endH * 60 + endM;
          return nowMinutes >= startMin && nowMinutes <= endMin;
        });

        // Also show upcoming windows (within the next 2 hours today)
        if (!match) {
          const upcoming = windows.find((w) => {
            if (!w.active) return false;
            if (w.date !== todayStr) return false;
            const [startH, startM] = w.startTime.split(":").map(Number);
            const startMin = startH * 60 + startM;
            return startMin > nowMinutes && startMin - nowMinutes <= 120;
          });
          setActiveWindow(upcoming ? { ...upcoming, isUpcoming: true } : null);
        } else {
          setActiveWindow({ ...match, isUpcoming: false });
        }
      } catch {
        setActiveWindow(null);
      }
    };

    checkMaintenance();
    // Re-check every minute
    const interval = setInterval(checkMaintenance, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!activeWindow || dismissed) return null;

  return (
    <div className={`maintenance-banner ${activeWindow.isUpcoming ? "maintenance-upcoming" : "maintenance-active"}`}>
      <div className="maintenance-banner-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="maintenance-icon">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="maintenance-text">
          {activeWindow.isUpcoming ? (
            <>
              <strong>Upcoming Maintenance:</strong> {activeWindow.description} — scheduled today from {activeWindow.startTime} to {activeWindow.endTime}
            </>
          ) : (
            <>
              <strong>Maintenance in Progress:</strong> {activeWindow.description} — {activeWindow.startTime} to {activeWindow.endTime}. Some features may be unavailable.
            </>
          )}
        </span>
        <button className="maintenance-dismiss" onClick={() => setDismissed(true)} title="Dismiss">
          &times;
        </button>
      </div>
    </div>
  );
}

export default MaintenanceBanner;
