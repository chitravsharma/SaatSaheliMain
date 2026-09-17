import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { profileUrl } from "../utils/api";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import { optimizeCloudinary } from "../utils/imageUrl";
import "./Messages.css";

const API = process.env.REACT_APP_API_URL;
const POLL_MS = 5000;

const fmtTime = (s) => {
  if (!s) return "";
  const d = new Date(typeof s === "string" && !s.endsWith("Z") ? s.replace(" ", "T") + "Z" : s);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
};

/**
 * Private buyer ↔ seller inbox. Two panes on desktop; on phones the list and
 * the thread are separate screens (list → thread → back).
 */
function Messages() {
  const { user } = useAuth();
  const strings = useStrings();
  const s = strings.messages;
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const activeId = conversationId ? Number(conversationId) : null;

  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [locked, setLocked] = useState(false); // not authenticated (shouldn't happen behind ProtectedRoute)
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const lastIdRef = useRef(0);

  const loadList = useCallback(async () => {
    try {
      const r = await api.get(`${API}/api/messages/conversations`);
      setConversations(Array.isArray(r.data) ? r.data : []);
      setLocked(false);
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) setLocked(true);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // Open a thread: load header + full history, mark read.
  useEffect(() => {
    if (!activeId) { setActive(null); setMessages([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const [c, m] = await Promise.all([
          api.get(`${API}/api/messages/conversations/${activeId}`),
          api.get(`${API}/api/messages/conversations/${activeId}/messages`),
        ]);
        if (cancelled) return;
        setActive(c.data);
        const list = Array.isArray(m.data) ? m.data : [];
        setMessages(list);
        lastIdRef.current = list.length ? list[list.length - 1].id : 0;
        setError("");
        await api.post(`${API}/api/messages/conversations/${activeId}/read`).catch(() => {});
        loadList();
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || s.loadError);
      }
    })();
    return () => { cancelled = true; };
  }, [activeId, loadList, s.loadError]);

  // Poll for new messages in the open thread.
  useEffect(() => {
    if (!activeId) return;
    const t = setInterval(async () => {
      try {
        const r = await api.get(`${API}/api/messages/conversations/${activeId}/messages`, { params: { after: lastIdRef.current } });
        const fresh = Array.isArray(r.data) ? r.data : [];
        if (fresh.length) {
          setMessages(prev => [...prev, ...fresh]);
          lastIdRef.current = fresh[fresh.length - 1].id;
          api.post(`${API}/api/messages/conversations/${activeId}/read`).catch(() => {});
          loadList();
        }
      } catch { /* transient */ }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [activeId, loadList]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    try {
      const r = await api.post(`${API}/api/messages/conversations/${activeId}/messages`, { body });
      setMessages(prev => [...prev, r.data]);
      lastIdRef.current = r.data.id;
      setDraft("");
      setError("");
      loadList();
    } catch (err) {
      setError(err?.response?.data?.error || s.sendFailed);
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  const otherOf = (c) => {
    const isSeller = String(c.sellerId) === String(user.userId);
    return {
      guest: !!c.guestEmail && c.buyerId == null,
      name: isSeller ? c.buyerName : c.sellerName,
      handle: isSeller ? c.buyerHandle : c.sellerHandle,
      id: isSeller ? c.buyerId : c.sellerId,
      role: isSeller ? s.roleBuyer : s.roleSeller,
      unread: isSeller ? c.sellerUnread : c.buyerUnread,
    };
  };

  if (locked) {
    return (
      <div className="msg-page">
        <div className="msg-locked">
          <h1>{s.title}</h1>
          <p>{s.lockedText}</p>
          <Link to="/Login" className="ss-btn ss-btn-primary">{s.lockedCta}</Link>
        </div>
      </div>
    );
  }

  const other = active ? otherOf(active) : null;

  return (
    <div className={`msg-page ${activeId ? "msg-page-thread-open" : ""}`}>
      <aside className="msg-list">
        <div className="msg-list-head">
          <h1>{s.title}</h1>
        </div>
        {listLoading && <p className="msg-muted">{strings.common.loading || "Loading…"}</p>}
        {!listLoading && conversations.length === 0 && (
          <div className="msg-empty">
            <p>{s.emptyTitle}</p>
            <p className="msg-muted">{s.emptyHint}</p>
            <Link to="/galleries" className="ss-btn ss-btn-outline ss-btn-sm">{s.browseGalleries}</Link>
          </div>
        )}
        <ul>
          {conversations.map(c => {
            const o = otherOf(c);
            return (
              <li key={c.id} className={`msg-row ${c.id === activeId ? "msg-row-active" : ""}`} onClick={() => navigate(`/messages/${c.id}`)}>
                <img src={optimizeCloudinary(c.itemImageUrl)} alt="" className="msg-row-thumb" loading="lazy" />
                <div className="msg-row-body">
                  <div className="msg-row-top">
                    <span className="msg-row-name">{o.name}{o.guest && <span className="msg-guest-badge">{s.guestBadge}</span>}</span>
                    <span className="msg-row-time">{fmtTime(c.lastMessageAt)}</span>
                  </div>
                  <div className="msg-row-item">{c.itemTitle}</div>
                  <div className="msg-row-preview">{c.lastPreview || s.noMessagesYet}</div>
                </div>
                {o.unread > 0 && <span className="msg-row-unread">{o.unread}</span>}
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="msg-thread">
        {!activeId && (
          <div className="msg-thread-placeholder">
            <p>{s.pickThread}</p>
          </div>
        )}
        {activeId && active && (
          <>
            <header className="msg-thread-head">
              <button type="button" className="msg-back" onClick={() => navigate("/messages")} aria-label={strings.common.back}>&#8592;</button>
              <img src={optimizeCloudinary(active.itemImageUrl)} alt="" className="msg-thread-thumb" />
              <div className="msg-thread-meta">
                {other.guest
                  ? <span className="msg-thread-name">{other.name}</span>
                  : <Link to={profileUrl(other.id, other.name, other.handle)} className="msg-thread-name">{other.name}</Link>}
                <span className="msg-thread-role">{other.role}</span>
                <a href={active.itemLink} className="msg-thread-item" target="_blank" rel="noreferrer">{active.itemTitle}</a>
              </div>
              {active.status === "CLOSED" && <span className="msg-closed">{s.closed}</span>}
            </header>

            {other.guest && (
              <div className="msg-guest-banner">
                <p>{s.guestBanner}</p>
                <div className="msg-guest-contact">
                  <a href={`mailto:${active.guestEmail}?subject=${encodeURIComponent(`Re: ${active.itemTitle || ""} on Saat Saheli`)}`} className="ss-btn ss-btn-primary ss-btn-sm">{s.guestReplyEmail}: {active.guestEmail}</a>
                  {active.guestPhone && <a href={`tel:${active.guestPhone.replace(/[^+\d]/g, "")}`} className="ss-btn ss-btn-outline ss-btn-sm">{s.guestCall}: {active.guestPhone}</a>}
                </div>
              </div>
            )}
            <div className="msg-scroll">
              {messages.length === 0 && <p className="msg-muted msg-first-hint">{s.firstHint}</p>}
              {messages.map(m => {
                const mine = String(m.senderId) === String(user.userId);
                return (
                  <div key={m.id} className={`msg-bubble-row ${mine ? "mine" : ""}`}>
                    <div className="msg-bubble">
                      {!mine && <div className="msg-bubble-sender">{m.senderName}</div>}
                      <div className="msg-bubble-text">{m.body}</div>
                      <div className="msg-bubble-time">{fmtTime(m.createdDate)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <p className="msg-privacy">{s.privacyNote}</p>
            {error && <p className="msg-error">{error}</p>}
            <form className="msg-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={active.status === "CLOSED" ? s.closedHint : other.guest ? s.guestNotePlaceholder : s.composePlaceholder}
                maxLength={2000}
                rows={1}
                disabled={active.status === "CLOSED"}
                onKeyDown={(e) => {
                  // Enter sends on desktop; on touch devices Enter makes a newline and the button sends.
                  if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(hover: hover)").matches) { e.preventDefault(); send(); }
                }}
              />
              <button type="submit" className="ss-btn ss-btn-primary" disabled={sending || !draft.trim() || active.status === "CLOSED"}>
                {sending ? "…" : s.send}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default Messages;
