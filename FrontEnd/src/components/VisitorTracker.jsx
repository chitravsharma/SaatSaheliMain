import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";

const API = process.env.REACT_APP_API_URL;

// Generate or retrieve a persistent anonymous visitor ID
function getVisitorId() {
  let id = localStorage.getItem("ss_visitor_id");
  if (!id) {
    id = "v_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("ss_visitor_id", id);
  }
  return id;
}

// Generate a session ID (new per browser tab/session)
function getSessionId() {
  let id = sessionStorage.getItem("ss_session_id");
  if (!id) {
    id = "s_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem("ss_session_id", id);
  }
  return id;
}

function detectDevice() {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Other";
}

function VisitorTracker() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        await axios.post(`${API}/api/analytics/visit`, {
          visitorId: getVisitorId(),
          sessionId: getSessionId(),
          pagePath: location.pathname,
          referrer: document.referrer || null,
          userAgent: navigator.userAgent,
          device: detectDevice(),
          browser: detectBrowser(),
          userId: user?.userId || null,
        });
      } catch {
        // silently fail — tracking should never break the app
      }
    };

    trackVisit();
  }, [location.pathname, user?.userId]);

  return null; // invisible component
}

export default VisitorTracker;
