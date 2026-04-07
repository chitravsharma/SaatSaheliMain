import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "./Home.css";
import "./Magazine.css";

const API = process.env.REACT_APP_API_URL;

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
  return url;
}

const Magazine = () => {
  const strings = useStrings();
  const { user } = useAuth();
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bookCounts, setBookCounts] = useState({ likes: {}, comments: {} });
  const [userLikes, setUserLikes] = useState({});
  const [userFavorites, setUserFavorites] = useState({});
  const [actionError, setActionError] = useState("");
  const [busyActions, setBusyActions] = useState(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [magRes, countsRes] = await Promise.all([
          axios.get(`${API}/api/books/magazines`),
          axios.get(`${API}/api/social/counts?targetType=BOOK`).catch(() => ({ data: { likes: {}, comments: {} } })),
        ]);
        setMagazines(Array.isArray(magRes.data) ? magRes.data : []);
        setBookCounts(countsRes.data || { likes: {}, comments: {} });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch user likes & favorites
  useEffect(() => {
    if (!user) {
      const likeMap = {};
      const favMap = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith("anon_like_") && localStorage.getItem(k) === "true") {
          likeMap[k.replace("anon_like_", "")] = true;
        }
        if (k.startsWith("anon_fav_") && localStorage.getItem(k) === "true") {
          favMap[k.replace("anon_fav_", "")] = true;
        }
      }
      setUserLikes(likeMap);
      setUserFavorites(favMap);
      return;
    }
    const fetchUserSocial = async () => {
      try {
        const [bookFavs] = await Promise.all([
          axios.get(`${API}/api/social/favorites?userId=${user.userId}&targetType=BOOK`),
        ]);
        const favMap = {};
        (bookFavs.data || []).forEach(f => { favMap[`BOOK_${f.targetId}`] = true; });
        setUserFavorites(favMap);
      } catch (err) { console.error("Failed to fetch user social data:", err); }
    };
    fetchUserSocial();
  }, [user]);

  const handleLike = async (targetId) => {
    const actionKey = `like_BOOK_${targetId}`;
    if (busyActions.has(actionKey)) return;
    if (!user) {
      const anonKey = `anon_like_BOOK_${targetId}`;
      const wasLiked = localStorage.getItem(anonKey) === "true";
      localStorage.setItem(anonKey, wasLiked ? "false" : "true");
      setUserLikes(prev => ({ ...prev, [`BOOK_${targetId}`]: !wasLiked }));
      return;
    }
    setBusyActions(prev => new Set(prev).add(actionKey));
    const key = `BOOK_${targetId}`;
    const prevLiked = userLikes[key];
    setUserLikes(prev => ({ ...prev, [key]: !prevLiked }));
    try {
      const res = await axios.post(`${API}/api/social/like`, { userId: user.userId, targetType: "BOOK", targetId });
      setUserLikes(prev => ({ ...prev, [key]: res.data.liked }));
      setBookCounts(prev => ({ ...prev, likes: { ...prev.likes, [targetId]: res.data.count } }));
    } catch {
      setUserLikes(prev => ({ ...prev, [key]: prevLiked }));
      setActionError("Something went wrong. Please try again.");
    } finally {
      setBusyActions(prev => { const n = new Set(prev); n.delete(actionKey); return n; });
    }
  };

  const handleFavorite = async (targetId) => {
    const actionKey = `fav_BOOK_${targetId}`;
    if (busyActions.has(actionKey)) return;
    if (!user) {
      const anonKey = `anon_fav_BOOK_${targetId}`;
      const wasFav = localStorage.getItem(anonKey) === "true";
      localStorage.setItem(anonKey, wasFav ? "false" : "true");
      setUserFavorites(prev => ({ ...prev, [`BOOK_${targetId}`]: !wasFav }));
      return;
    }
    setBusyActions(prev => new Set(prev).add(actionKey));
    const key = `BOOK_${targetId}`;
    const prevFav = userFavorites[key];
    setUserFavorites(prev => ({ ...prev, [key]: !prevFav }));
    try {
      const res = await axios.post(`${API}/api/social/favorite`, { userId: user.userId, targetType: "BOOK", targetId });
      setUserFavorites(prev => ({ ...prev, [key]: res.data.favorited }));
    } catch {
      setUserFavorites(prev => ({ ...prev, [key]: prevFav }));
      setActionError("Something went wrong. Please try again.");
    } finally {
      setBusyActions(prev => { const n = new Set(prev); n.delete(actionKey); return n; });
    }
  };

  // Auto-dismiss error
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(""), 4000);
    return () => clearTimeout(t);
  }, [actionError]);

  if (loading) {
    return (
      <div className="magazine-container">
        <div className="loading-spinner" />
        <p className="magazine-loading">{strings.magazine.loading}</p>
      </div>
    );
  }

  if (error || magazines.length === 0) {
    return (
      <div className="magazine-container">
        <h2 className="magazine-heading">{strings.magazine.heading}</h2>
        <p className="magazine-not-found">{strings.magazine.notFound}</p>
      </div>
    );
  }

  // Sort: English first, then Hindi
  const sorted = [...magazines].sort((a, b) => {
    const aH = a.language === "hi" ? 1 : 0;
    const bH = b.language === "hi" ? 1 : 0;
    return aH - bH;
  });

  return (
    <div className="magazine-container">
      <h2 className="magazine-heading">{strings.magazine.heading}</h2>
      <p className="magazine-subtitle">{strings.magazine.pickEdition}</p>

      {actionError && (
        <div className="magazine-action-error" role="alert">
          {actionError}
          <button onClick={() => setActionError("")} className="magazine-error-dismiss" aria-label="Dismiss">&times;</button>
        </div>
      )}

      <div className="magazine-list">
        {sorted.map((mag) => {
          const likeC = bookCounts.likes[mag.id] || 0;
          const commentC = bookCounts.comments[mag.id] || 0;
          const isLiked = userLikes[`BOOK_${mag.id}`];
          const isFav = userFavorites[`BOOK_${mag.id}`];

          return (
            <div key={mag.id} className="home-book-card">
              <Link to={`/read/${mag.id}`} className="home-book-link">
                <div className="home-book-cover">
                  {mag.coverImageUrl ? (
                    <img
                      src={resolveImageUrl(mag.coverImageUrl)}
                      alt={mag.title}
                      className="home-book-cover-img"
                    />
                  ) : (
                    <span className="home-book-cover-title">{mag.title}</span>
                  )}
                  {mag.language && (
                    <span className={`home-book-lang-badge ${mag.language === "hi" ? "lang-hi" : "lang-en"}`}>
                      {mag.language === "hi" ? "हिंदी" : "English"}
                    </span>
                  )}
                </div>
                <div className="home-book-info">
                  <span className="home-book-title">{mag.title}</span>
                </div>
              </Link>
              <div className="home-card-social">
                <button className={`ss-btn-icon-sm ${isLiked ? "active" : ""}`} onClick={() => handleLike(mag.id)} title="Like">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? "#e74c3c" : "none"} stroke={isLiked ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  <span>{likeC}</span>
                </button>
                <Link to={`/read/${mag.id}`} className="ss-btn-icon-sm" title="Comments">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  <span>{commentC}</span>
                </Link>
                <button className={`ss-btn-icon-sm ${isFav ? "active" : ""}`} onClick={() => handleFavorite(mag.id)} title="Favorite">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? "#d4a017" : "none"} stroke={isFav ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Magazine;
