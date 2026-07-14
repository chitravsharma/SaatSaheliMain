import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import api from "../utils/api";
import { useAuth } from "../AuthContext";

const API = process.env.REACT_APP_API_URL || "";
const POLL_MS = 45000; // poll the unread count every 45s while logged in

const NotificationContext = createContext({
  unreadCount: 0,
  notifications: [],
  loading: false,
  refreshCount: async () => {},
  fetchNotifications: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
});

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.userId;
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  const refreshCount = useCallback(async () => {
    if (!userId) { setUnreadCount(0); return; }
    try {
      const res = await api.get(`${API}/api/notifications/unread-count`);
      setUnreadCount(Number(res.data?.count) || 0);
    } catch { /* keep current count on transient error */ }
  }, [userId]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) { setNotifications([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`${API}/api/notifications`);
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch {
      /* leave existing list on transient error */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markRead = useCallback(async (id) => {
    // optimistic — flip the row, then resync the count from the server
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.post(`${API}/api/notifications/${id}/read`);
    } catch { /* ignore */ } finally {
      refreshCount();
    }
  }, [refreshCount]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.post(`${API}/api/notifications/read-all`);
    } catch { /* ignore */ } finally {
      refreshCount();
    }
  }, [refreshCount]);

  // Poll the unread count while logged in; clear everything on logout.
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }
    refreshCount();
    pollRef.current = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [userId, refreshCount]);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, notifications, loading, refreshCount, fetchNotifications, markRead, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export default NotificationContext;
