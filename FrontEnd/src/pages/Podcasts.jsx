import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { profileUrl } from "../utils/api";
import { useAuth } from "../AuthContext";
import AdBanner from "../modules/AdBanner";
import "./Podcasts.css";

const API = process.env.REACT_APP_API_URL;

const LANGUAGE_OPTIONS = ["Hindi", "English", "Bilingual"];
const CATEGORY_OPTIONS = ["Storytelling", "Poetry", "Interview", "Discussion", "Music", "Education", "Other"];

function formatTime(s) {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function PodcastAudio({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="podcast-cp">
      <button
        type="button"
        className="podcast-cp-play"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        )}
      </button>
      <span className="podcast-cp-time">{formatTime(currentTime)}</span>
      <div className="podcast-cp-bar" onClick={handleSeek} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progressPct)}>
        <div className="podcast-cp-bar-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <span className="podcast-cp-time">{formatTime(duration)}</span>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onContextMenu={(e) => e.preventDefault()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        style={{ display: "none" }}
      />
    </div>
  );
}

function Podcasts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.userId;
  const isAdmin = !!user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN");

  const [tab, setTab] = useState("browse"); // "my" | "browse"
  const [podcasts, setPodcasts] = useState([]);
  const [myPodcasts, setMyPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filterLang, setFilterLang] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [userLikes, setUserLikes] = useState({});
  const [userFavorites, setUserFavorites] = useState({});
  const [openComments, setOpenComments] = useState(null);
  const [podcastComments, setPodcastComments] = useState({});
  const [newCommentText, setNewCommentText] = useState("");

  // Create/Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [category, setCategory] = useState("");
  const [publishOnSave, setPublishOnSave] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const showMsg = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const fetchPodcasts = async () => {
    try {
      const res = await api.get(`${API}/api/podcasts`);
      setPodcasts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPodcasts = async () => {
    if (!userId) return;
    try {
      const res = await api.get(`${API}/api/podcasts/user/${userId}`);
      setMyPodcasts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMyPodcasts([]);
    }
  };

  useEffect(() => {
    fetchPodcasts();
    if (userId) fetchMyPodcasts();
  }, [userId]);

  // Fetch social counts for all podcasts (likes + comments).
  // For anonymous users also hydrate userLikes/userFavorites from localStorage so the
  // heart/star icons reflect their prior toggles across reloads.
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`${API}/api/social/counts?targetType=PODCAST`);
        setLikeCounts(res.data?.likes || {});
        setCommentCounts(res.data?.comments || {});
      } catch {
        /* non-fatal */
      }
      if (!userId) {
        const allIds = [...podcasts, ...myPodcasts].map(p => p.id);
        const likes = {};
        const favs = {};
        allIds.forEach(id => {
          if (localStorage.getItem(`anon_like_PODCAST_${id}`) === "true") likes[id] = true;
          if (localStorage.getItem(`anon_fav_PODCAST_${id}`) === "true") favs[id] = true;
        });
        setUserLikes(likes);
        setUserFavorites(favs);
      }
    })();
  }, [podcasts, myPodcasts, userId]);

  const handleLike = async (podcastId) => {
    if (!userId) {
      const key = `anon_like_PODCAST_${podcastId}`;
      const wasLiked = localStorage.getItem(key) === "true";
      localStorage.setItem(key, wasLiked ? "false" : "true");
      setUserLikes(prev => ({ ...prev, [podcastId]: !wasLiked }));
      return;
    }
    try {
      const res = await api.post(`${API}/api/social/like`, {
        userId, targetType: "PODCAST", targetId: Number(podcastId),
      });
      setUserLikes(prev => ({ ...prev, [podcastId]: res.data.liked }));
      setLikeCounts(prev => ({ ...prev, [podcastId]: res.data.count }));
    } catch { showMsg("Failed to update like"); }
  };

  const handleFavorite = async (podcastId) => {
    if (!userId) {
      const key = `anon_fav_PODCAST_${podcastId}`;
      const wasFav = localStorage.getItem(key) === "true";
      localStorage.setItem(key, wasFav ? "false" : "true");
      setUserFavorites(prev => ({ ...prev, [podcastId]: !wasFav }));
      return;
    }
    try {
      const res = await api.post(`${API}/api/social/favorite`, {
        userId, targetType: "PODCAST", targetId: Number(podcastId),
      });
      setUserFavorites(prev => ({ ...prev, [podcastId]: res.data.favorited }));
    } catch { showMsg("Failed to update favorite"); }
  };

  const toggleComments = async (podcastId) => {
    if (openComments === podcastId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(podcastId);
    setNewCommentText("");
    // Lazy-load comments if not already fetched
    if (!podcastComments[podcastId]) {
      try {
        const res = await api.get(`${API}/api/social/comments?targetType=PODCAST&targetId=${podcastId}`);
        setPodcastComments(prev => ({ ...prev, [podcastId]: Array.isArray(res.data) ? res.data : [] }));
      } catch {
        setPodcastComments(prev => ({ ...prev, [podcastId]: [] }));
      }
    }
  };

  const handleAddComment = async (podcastId) => {
    if (!userId || !newCommentText.trim()) return;
    try {
      const res = await api.post(`${API}/api/social/comment`, {
        userId, targetType: "PODCAST", targetId: Number(podcastId), content: newCommentText.trim(),
      });
      setPodcastComments(prev => ({
        ...prev,
        [podcastId]: [...(prev[podcastId] || []), res.data],
      }));
      setCommentCounts(prev => ({ ...prev, [podcastId]: (prev[podcastId] || 0) + 1 }));
      setNewCommentText("");
    } catch { showMsg("Failed to post comment"); }
  };

  const handleDeleteComment = async (podcastId, commentId) => {
    try {
      await api.delete(`${API}/api/social/comment/${commentId}?userId=${userId}`);
      setPodcastComments(prev => ({
        ...prev,
        [podcastId]: (prev[podcastId] || []).filter(c => c.id !== commentId),
      }));
      setCommentCounts(prev => ({ ...prev, [podcastId]: Math.max(0, (prev[podcastId] || 1) - 1) }));
    } catch { showMsg("Failed to delete comment"); }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`${API}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAudioUrl(res.data.url);
    } catch {
      showMsg("Audio upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`${API}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCoverImageUrl(res.data.url);
    } catch {
      showMsg("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { showMsg("Title is required"); return; }
    if (!audioUrl) { showMsg("Please upload an audio file"); return; }
    setSaving(true);
    try {
      const status = publishOnSave ? "PUBLISHED" : "DRAFT";
      const body = {
        userId, title: title.trim(), description: description.trim(),
        audioUrl, coverImageUrl, language, category: category || null, status,
      };
      if (editingId) {
        await api.put(`${API}/api/podcasts/${editingId}`, body);
        showMsg("Podcast updated!");
      } else {
        await api.post(`${API}/api/podcasts`, body);
        showMsg(`Podcast ${publishOnSave ? "published" : "saved as draft"}!`);
      }
      resetForm();
      fetchPodcasts();
      fetchMyPodcasts();
    } catch {
      showMsg("Failed to save podcast");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this podcast?")) return;
    try {
      await api.delete(`${API}/api/podcasts/${id}?userId=${userId}`);
      showMsg("Deleted!");
      fetchPodcasts();
      fetchMyPodcasts();
    } catch {
      showMsg("Failed to delete");
    }
  };

  const startEdit = (podcast) => {
    setEditingId(podcast.id);
    setTitle(podcast.title);
    setDescription(podcast.description || "");
    setAudioUrl(podcast.audioUrl || "");
    setCoverImageUrl(podcast.coverImageUrl || "");
    setLanguage(podcast.language || "Hindi");
    setCategory(podcast.category || "");
    setShowForm(true);
    setTab("my");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setDescription("");
    setAudioUrl("");
    setCoverImageUrl("");
    setLanguage("Hindi");
    setCategory("");
  };

  const handleShare = async (podcast) => {
    const url = `${window.location.origin}/podcasts`;
    const text = `Listen to "${podcast.title}" on Saat Saheli!`;
    if (navigator.share) {
      try { await navigator.share({ title: podcast.title, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopiedId(podcast.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const togglePublish = async (podcast) => {
    const newStatus = podcast.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await api.put(`${API}/api/podcasts/${podcast.id}`, { userId, status: newStatus });
      showMsg(newStatus === "PUBLISHED" ? "Published!" : "Moved to draft");
      fetchMyPodcasts();
      fetchPodcasts();
    } catch { showMsg("Failed to update status"); }
  };

  const filteredPodcasts = filterLang
    ? podcasts.filter(p => p.language === filterLang)
    : podcasts;

  const renderPodcastCard = (podcast, isOwner) => (
    <div key={podcast.id} className="podcast-card">
      <div className="podcast-card-top">
        {podcast.coverImageUrl ? (
          <img src={podcast.coverImageUrl} alt={podcast.title} className="podcast-cover" />
        ) : (
          <div className="podcast-cover-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
        )}
        <div className="podcast-info">
          <div className="podcast-badges">
            <span className={`podcast-lang-badge podcast-lang-${(podcast.language || "hindi").toLowerCase()}`}>
              {podcast.language || "Hindi"}
            </span>
            {podcast.category && <span className="podcast-cat-badge">{podcast.category}</span>}
            {isOwner && podcast.status === "DRAFT" && <span className="podcast-draft-badge">Draft</span>}
          </div>
          <h3 className="podcast-title">{podcast.title}</h3>
          {!isOwner && podcast.authorName && (
            <Link to={profileUrl(podcast.userId, podcast.authorName)} className="podcast-author">by {podcast.authorName}</Link>
          )}
          {podcast.description && <p className="podcast-desc">{podcast.description}</p>}
          <span className="podcast-date">{new Date(podcast.createdDate).toLocaleDateString()}</span>
        </div>
      </div>

      {podcast.audioUrl && (
        <div className="podcast-player">
          <PodcastAudio src={podcast.audioUrl} />
        </div>
      )}

      <div className="podcast-actions-bar">
        <button className={`ss-btn-icon-sm ${userLikes[podcast.id] ? "active" : ""}`} onClick={() => handleLike(podcast.id)} title="Like">
          <svg width="14" height="14" viewBox="0 0 24 24" fill={userLikes[podcast.id] ? "#e74c3c" : "none"} stroke={userLikes[podcast.id] ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <span>{likeCounts[podcast.id] || 0}</span>
        </button>
        <button className={`ss-btn-icon-sm ${openComments === podcast.id ? "active" : ""}`} onClick={() => toggleComments(podcast.id)} title="Comments">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span>{commentCounts[podcast.id] || 0}</span>
        </button>
        <button className={`ss-btn-icon-sm ${userFavorites[podcast.id] ? "active" : ""}`} onClick={() => handleFavorite(podcast.id)} title="Favorite">
          <svg width="14" height="14" viewBox="0 0 24 24" fill={userFavorites[podcast.id] ? "#d4a017" : "none"} stroke={userFavorites[podcast.id] ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button className="ss-btn-icon-sm" onClick={() => handleShare(podcast)} title="Share">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          {copiedId === podcast.id ? <span>Copied!</span> : <span>Share</span>}
        </button>
        {isOwner && (
          <>
            <button className={`bm-btn bm-btn-sm ${podcast.status === "PUBLISHED" ? "bm-btn-back" : "bm-btn-create"}`} onClick={() => togglePublish(podcast)}>
              {podcast.status === "PUBLISHED" ? "Unpublish" : "Publish"}
            </button>
            <button className="bm-btn bm-btn-edit bm-btn-sm" onClick={() => startEdit(podcast)}>Edit</button>
            <button className="bm-btn bm-btn-delete bm-btn-sm" onClick={() => handleDelete(podcast.id)}>Delete</button>
          </>
        )}
      </div>

      {openComments === podcast.id && (
        <div className="podcast-comments">
          <h4 className="podcast-comments-heading">Comments ({commentCounts[podcast.id] || 0})</h4>
          {userId ? (
            <form
              onSubmit={(e) => { e.preventDefault(); handleAddComment(podcast.id); }}
              className="podcast-comment-form"
            >
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="podcast-comment-input"
              />
              <button type="submit" className="bm-btn bm-btn-create bm-btn-sm" disabled={!newCommentText.trim()}>Post</button>
            </form>
          ) : (
            <p className="podcast-login-prompt">
              <Link to={`/Login?redirect=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`}>Login with Google or create an account</Link> to comment on this item.
            </p>
          )}
          <div className="podcast-comment-list">
            {(podcastComments[podcast.id] || []).map(c => (
              <div key={c.id} className="podcast-comment-item">
                <div className="podcast-comment-header">
                  <span className="podcast-comment-author">{c.userName}</span>
                  <span className="podcast-comment-date">{new Date(c.createdDate).toLocaleDateString()}</span>
                  {userId && userId === c.userId && (
                    <button className="podcast-comment-delete" onClick={() => handleDeleteComment(podcast.id, c.id)}>Delete</button>
                  )}
                </div>
                <p className="podcast-comment-text">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="podcasts-page">
      <AdBanner placement="PODCAST_TOP" />
      <h1>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 8 }}>
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        Podcasts / पॉडकास्ट
      </h1>
      {message && <div className="podcast-message">{message}</div>}

      <div className="podcast-section-card">
      {/* Tabs */}
      <div className="podcast-tabs">
        <button className={tab === "browse" ? "active" : ""} onClick={() => setTab("browse")}>Browse All</button>
        {isAdmin && <button className={tab === "my" ? "active" : ""} onClick={() => setTab("my")}>My Podcasts</button>}
      </div>

      {/* Language filter */}
      {tab === "browse" && (
        <div className="podcast-filter-bar">
          <button className={filterLang === "" ? "active" : ""} onClick={() => setFilterLang("")}>All</button>
          {LANGUAGE_OPTIONS.map(lang => (
            <button key={lang} className={filterLang === lang ? "active" : ""} onClick={() => setFilterLang(lang)}>
              {lang === "Hindi" ? "हिंदी" : lang}
            </button>
          ))}
        </div>
      )}

      {/* Browse tab */}
      {tab === "browse" && (
        <div className="podcast-list">
          {loading ? <p>Loading...</p> :
            filteredPodcasts.length === 0 ? <p className="podcast-empty">No podcasts yet. Be the first to share!</p> :
            filteredPodcasts.map(p => renderPodcastCard(p, isAdmin))
          }
        </div>
      )}

      {/* My Podcasts tab — admin-only */}
      {tab === "my" && isAdmin && (
        <>
          <div className="podcast-top-actions">
            <button className="bm-btn bm-btn-create" onClick={() => { resetForm(); setShowForm(true); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              + Upload Podcast
            </button>
          </div>

          {showForm && (
            <div className="podcast-form">
              <h2>{editingId ? "Edit" : "Upload"} Podcast</h2>
              <div className="podcast-field">
                <label>Title / शीर्षक *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Podcast title..." className="bm-input" maxLength={200} />
              </div>
              <div className="podcast-field">
                <label>Description / विवरण</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your podcast..." className="bm-input bm-textarea" rows={4} />
              </div>
              <div className="podcast-field">
                <label>Language / भाषा</label>
                <div className="podcast-lang-selector">
                  {LANGUAGE_OPTIONS.map(lang => (
                    <button key={lang} type="button" className={`podcast-lang-btn ${language === lang ? "active" : ""}`} onClick={() => setLanguage(lang)}>
                      {lang === "Hindi" ? "हिंदी" : lang}
                    </button>
                  ))}
                </div>
              </div>
              <div className="podcast-field">
                <label>Category / श्रेणी</label>
                <div className="podcast-cat-selector">
                  {CATEGORY_OPTIONS.map(cat => (
                    <button key={cat} type="button" className={`podcast-cat-btn ${category === cat ? "active" : ""}`} onClick={() => setCategory(category === cat ? "" : cat)}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="podcast-field">
                <label>Audio File / ऑडियो फ़ाइल *</label>
                {audioUrl ? (
                  <div className="podcast-audio-preview">
                    <audio controls src={audioUrl} style={{ width: "100%" }} />
                    <button className="bm-btn bm-btn-delete bm-btn-sm" onClick={() => setAudioUrl("")}>Remove</button>
                  </div>
                ) : (
                  <div className="podcast-upload-area">
                    <input type="file" accept="audio/*" id="podcast-audio-upload" className="bm-file-input" onChange={handleAudioUpload} />
                    <label htmlFor="podcast-audio-upload" className="bm-btn bm-btn-edit bm-btn-sm">
                      {uploading ? "Uploading..." : "Choose Audio File"}
                    </label>
                  </div>
                )}
              </div>
              <div className="podcast-field">
                <label>Cover Image / कवर छवि</label>
                {coverImageUrl ? (
                  <div className="podcast-cover-preview">
                    <img src={coverImageUrl} alt="Cover" className="podcast-preview-img" />
                    <button className="bm-btn bm-btn-delete bm-btn-sm" onClick={() => setCoverImageUrl("")}>Remove</button>
                  </div>
                ) : (
                  <div className="podcast-upload-area">
                    <input type="file" accept="image/*" id="podcast-cover-upload" className="bm-file-input" onChange={handleCoverUpload} />
                    <label htmlFor="podcast-cover-upload" className="bm-btn bm-btn-edit bm-btn-sm">
                      {uploading ? "Uploading..." : "Choose Cover Image"}
                    </label>
                  </div>
                )}
              </div>
              <div className="podcast-form-actions">
                <button className="bm-btn bm-btn-create" onClick={() => { setPublishOnSave(true); handleSave(); }} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update & Publish" : "Publish Podcast"}
                </button>
                <button className="bm-btn bm-btn-edit" onClick={() => { setPublishOnSave(false); handleSave(); }} disabled={saving}>
                  Save as Draft
                </button>
                <button className="bm-btn bm-btn-back" onClick={resetForm}>Cancel</button>
              </div>
            </div>
          )}

          <div className="podcast-list">
            {myPodcasts.length === 0 && !showForm ? (
              <p className="podcast-empty">No podcasts yet. Click "+ Upload Podcast" to add your first one!</p>
            ) : (
              myPodcasts.map(p => renderPodcastCard(p, true))
            )}
          </div>
        </>
      )}
      </div>{/* end podcast-section-card */}
    </div>
  );
}

export default Podcasts;
