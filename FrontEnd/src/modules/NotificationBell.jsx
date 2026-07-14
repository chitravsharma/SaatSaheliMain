import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import { useStrings } from "../LanguageContext";
import "./NotificationBell.css";

// "2026-07-14 00:18:26" (server local time, no TZ) -> a short relative label.
function relativeTime(raw, t) {
  if (!raw) return "";
  const then = new Date(String(raw).replace(" ", "T"));
  if (isNaN(then.getTime())) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));
  if (secs < 60) return t.justNow;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}${t.minute}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${t.hour}`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}${t.day}`;
  return then.toLocaleDateString();
}

const NotificationBell = () => {
  const { unreadCount, notifications, loading, fetchNotifications, markRead, markAllRead } = useNotifications();
  const strings = useStrings();
  const t = (strings && strings.notifications) || {};
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications();
  };

  const handleOpenItem = (n) => {
    if (!n.read) markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <div className="notif-menu" ref={ref}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          unreadCount > 0
            ? `${t.title || "Notifications"} (${unreadCount} ${t.unread || "unread"})`
            : t.title || "Notifications"
        }
      >
        <svg className="notif-bell-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notif-badge" aria-hidden="true">{badge}</span>}
      </button>

      {open && (
        <div className="notif-dropdown" role="menu">
          <div className="notif-dropdown-head">
            <span className="notif-dropdown-title">{t.title || "Notifications"}</span>
            {unreadCount > 0 && (
              <button type="button" className="notif-markall" onClick={markAllRead}>
                {t.markAllRead || "Mark all read"}
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading && notifications.length === 0 && (
              <div className="notif-empty">{t.loading || "Loading…"}</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="notif-empty">{t.empty || "No notifications yet"}</div>
            )}
            {notifications.map((n) => (
              <button
                type="button"
                key={n.id}
                className={`notif-item${n.read ? "" : " notif-item-unread"}`}
                role="menuitem"
                onClick={() => handleOpenItem(n)}
              >
                {!n.read && <span className="notif-dot" aria-hidden="true" />}
                <span className="notif-item-body">
                  <span className="notif-item-msg">{n.message}</span>
                  <span className="notif-item-time">{relativeTime(n.createdDate, t)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
