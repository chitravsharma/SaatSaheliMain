import React, { useState, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

function ServerWakeUp({ children }) {
  const [serverReady, setServerReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const checkServer = async () => {
      try {
        await axios.get(`${API}/api/books/search?status=PUBLISHED`, { timeout: 8000 });
        if (!cancelled) setServerReady(true);
      } catch {
        if (!cancelled) {
          setRetryCount((c) => c + 1);
          timer = setTimeout(checkServer, 4000);
        }
      }
    };

    checkServer();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (serverReady) return children;

  return (
    <div className="server-wakeup-overlay">
      <div className="server-wakeup-card">
        <div className="server-wakeup-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h2 className="server-wakeup-title">Saat Saheli is waking up...</h2>
        <p className="server-wakeup-msg">
          Our server is starting up. This usually takes 30–60 seconds on first visit.
        </p>
        <div className="server-wakeup-spinner" />
        {retryCount > 0 && (
          <p className="server-wakeup-retry">
            Connecting... attempt {retryCount}
          </p>
        )}
      </div>
    </div>
  );
}

export default ServerWakeUp;
