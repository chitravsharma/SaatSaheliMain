import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "./NotificationBell.css";

const API = process.env.REACT_APP_API_URL;
const POLL_MS = 45000;

/**
 * Header envelope → /messages with an unread badge. Only rendered for users
 * whose plan includes private messaging (the API returns 0 for everyone else,
 * and we hide the icon entirely when the plan can't use it).
 */
function MessagesEnvelope() {
  const { user } = useAuth();
  const strings = useStrings();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [eligible, setEligible] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const u = await api.get(`${API}/api/account/usage`);
      const ok = !!(u.data?.canUseMarketChat || u.data?.admin);
      setEligible(ok);
      if (!ok) return;
      const r = await api.get(`${API}/api/messages/unread-count`);
      setUnread(Number(r.data?.count) || 0);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh, location.pathname]);

  if (!user || !eligible) return null;
  const label = strings.messages?.headerTitle || "Messages";
  return (
    <Link to="/messages" className="notif-bell-btn" aria-label={label} title={label} style={{ display: "inline-flex", textDecoration: "none" }}>
      <svg className="notif-bell-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      {unread > 0 && <span className="notif-badge" aria-label={`${unread} unread`}>{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}

export default MessagesEnvelope;
