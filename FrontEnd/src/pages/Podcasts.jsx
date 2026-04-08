import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../AuthContext";
import "./Podcasts.css";

const API = process.env.REACT_APP_API_URL;

const LANGUAGE_OPTIONS = ["Hindi", "English", "Bilingual"];
const CATEGORY_OPTIONS = ["Storytelling", "Poetry", "Interview", "Discussion", "Music", "Education", "Other"];

function Podcasts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.userId;

  const [tab, setTab] = useState("browse"); // "my" | "browse"
  const [podcasts, setPodcasts] = useState([]);
  const [myPodcasts, setMyPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filterLang, setFilterLang] = useState("");
  const [copiedId, setCopiedId] = useState(null);

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

  // Playing state
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

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

  const togglePlay = (podcastId, url) => {
    if (playingId === podcastId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => setPlayingId(null);
      setPlayingId(podcastId);
    }
  };

  const handleShare = async (podcast) => {
    const url = `${window.location.origin}/#/podcasts`;
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
            <Link to={`/profile/${podcast.userId}`} className="podcast-author">by {podcast.authorName}</Link>
          )}
          {podcast.description && <p className="podcast-desc">{podcast.description}</p>}
          <span className="podcast-date">{new Date(podcast.createdDate).toLocaleDateString()}</span>
        </div>
      </div>

      {podcast.audioUrl && (
        <div className="podcast-player">
          <button className="podcast-play-btn" onClick={() => togglePlay(podcast.id, podcast.audioUrl)}>
            {playingId === podcast.id ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            )}
          </button>
          <audio controls className="podcast-audio" src={podcast.audioUrl} />
        </div>
      )}

      <div className="podcast-actions-bar">
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
    </div>
  );

  return (
    <div className="podcasts-page">
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
        {userId && <button className={tab === "my" ? "active" : ""} onClick={() => setTab("my")}>My Podcasts</button>}
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
            filteredPodcasts.map(p => renderPodcastCard(p, userId && p.userId === userId))
          }
        </div>
      )}

      {/* My Podcasts tab */}
      {tab === "my" && userId && (
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
