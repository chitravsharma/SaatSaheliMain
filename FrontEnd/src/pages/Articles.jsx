import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useParams, useLocation } from "react-router-dom";
import api, { profileUrl, getAnonId } from "../utils/api";
import { useAuth } from "../AuthContext";
import useProfile from "../hooks/useProfile";
import ImageEditor from "../components/ImageEditor";
import "../Articles.css";

const API = process.env.REACT_APP_API_URL;

function resolveImageUrl(url) {
  if (!url) return url;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  return url;
}

const CATEGORY_OPTIONS = ["Tech", "Creativity", "Community", "Art", "Music", "DIY", "Other"];

// Map URL path segment (first part of pathname) → content type label used in the DB/UI.
// Each content type now has its own top-level route (/poems, /blogs, /articles) for SEO.
const PATH_TO_CONTENT_TYPE = {
  poems: "Poetry",
  blogs: "Blog",
  articles: "Article",
};

function Articles() {
  const { user } = useAuth();
  const { hasProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const { articleId: urlArticleId } = useParams();
  const userId = user?.userId;

  // Derive the active content type from the URL path (/poems → Poetry, etc.)
  const pathSegment = location.pathname.split("/").filter(Boolean)[0] || "";
  const urlContentType = PATH_TO_CONTENT_TYPE[pathSegment] || "";

  // Article id may come from the URL path (/poems/42) or from a legacy ?id= query param.
  const urlParams = new URLSearchParams(location.search);
  const sharedArticleId = urlArticleId || urlParams.get("id");

  const [tab, setTab] = useState("published"); // default to browse all
  const [filterType, setFilterType] = useState(urlContentType || "");
  const [copiedId, setCopiedId] = useState(null);
  const [articles, setArticles] = useState([]);
  const [publicArticles, setPublicArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Create/Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [contentType, setContentType] = useState(urlContentType || "Blog");
  const [category, setCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editorFile, setEditorFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishOnSave, setPublishOnSave] = useState(true);
  const [formImageSize, setFormImageSize] = useState(100); // image preview size %
  const [cardImageSizes, setCardImageSizes] = useState({}); // per-card image zoom %

  // Social state per article
  const [socialData, setSocialData] = useState({});
  const [openComments, setOpenComments] = useState(null);
  const [newComment, setNewComment] = useState("");
  const commentInputRef = useRef(null);
  const loginPromptRef = useRef(null);

  const showMsg = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const fetchArticles = async () => {
    try {
      const res = await api.get(`${API}/api/articles/user/${userId}`);
      setArticles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicArticles = async () => {
    try {
      const res = await api.get(`${API}/api/articles`);
      setPublicArticles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPublicArticles([]);
    }
  };

  const fetchSocialForArticle = async (articleId) => {
    try {
      const [likeRes, favRes, commentsRes] = await Promise.all([
        api.get(`${API}/api/social/like?targetType=ARTICLE&targetId=${articleId}${userId ? `&userId=${userId}` : ""}`),
        userId
          ? api.get(`${API}/api/social/favorite?targetType=ARTICLE&targetId=${articleId}&userId=${userId}`)
          : Promise.resolve({ data: { favorited: false } }),
        api.get(`${API}/api/social/comments?targetType=ARTICLE&targetId=${articleId}`),
      ]);
      setSocialData((prev) => ({
        ...prev,
        [articleId]: {
          liked: userId ? likeRes.data.liked : localStorage.getItem(`anon_like_ARTICLE_${articleId}`) === "true",
          likeCount: likeRes.data.count,
          favorited: userId ? favRes.data.favorited : localStorage.getItem(`anon_fav_ARTICLE_${articleId}`) === "true",
          comments: commentsRes.data || [],
        },
      }));
    } catch (err) { console.error("Failed to load social data for article", articleId, err); }
  };

  // Scroll to top on mount / route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [urlContentType, sharedArticleId]);

  useEffect(() => {
    if (urlContentType) {
      setFilterType(urlContentType);
      setTab("published");
    }
  }, [urlContentType]);

  useEffect(() => {
    if (userId) fetchArticles();
    fetchPublicArticles();
  }, [userId]);

  // Scroll to specific article if shared link has ?id= param
  useEffect(() => {
    if (sharedArticleId && publicArticles.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`art-detail-${sharedArticleId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [sharedArticleId, publicArticles.length]);

  useEffect(() => {
    const list = tab === "my" ? articles : publicArticles;
    list.forEach((a) => fetchSocialForArticle(a.id));
  }, [articles.length, publicArticles.length, tab]);

  const uploadImageFile = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`${API}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImageUrl(res.data.url);
    } catch {
      showMsg("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditorFile(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!headline.trim()) {
      showMsg("Title is required");
      return;
    }
    if (publishOnSave && content.trim().length < 50) {
      showMsg("Content must be at least 50 characters to publish. Save as draft instead.");
      return;
    }
    setSaving(true);
    try {
      const status = publishOnSave ? "PUBLISHED" : "DRAFT";
      if (editingId) {
        await api.put(`${API}/api/articles/${editingId}`, {
          userId,
          headline: headline.trim(),
          content: content.trim(),
          imageUrl,
          contentType,
          status,
          category: category || null,
        });
        showMsg(`${contentType} updated!`);
      } else {
        await api.post(`${API}/api/articles`, {
          userId,
          headline: headline.trim(),
          content: content.trim(),
          imageUrl,
          contentType,
          status,
          category: category || null,
        });
        showMsg(`${contentType} ${publishOnSave ? "published" : "saved as draft"}!`);
      }
      resetForm();
      fetchArticles();
      fetchPublicArticles();
    } catch (err) {
      showMsg(`Failed to save ${contentType.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (article) => {
    const newStatus = article.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await api.put(`${API}/api/articles/${article.id}`, {
        userId,
        status: newStatus,
      });
      showMsg(newStatus === "PUBLISHED" ? "Published!" : "Moved to draft");
      fetchArticles();
      fetchPublicArticles();
    } catch {
      showMsg("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this content?")) return;
    try {
      await api.delete(`${API}/api/articles/${id}?userId=${userId}`);
      showMsg("Deleted!");
      fetchArticles();
      fetchPublicArticles();
    } catch {
      showMsg("Failed to delete");
    }
  };

  const startEdit = (article) => {
    setEditingId(article.id);
    setHeadline(article.headline);
    setContent(article.content || "");
    setImageUrl(article.imageUrl || "");
    setContentType(article.contentType || "Article");
    setCategory(article.category || "");
    setShowForm(true);
    setTab("my");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setHeadline("");
    setContent("");
    setImageUrl("");
    setCategory("");
    setFormImageSize(100);
    setContentType(urlContentType || "Blog");
  };

  const handleLike = async (articleId) => {
    try {
      const body = userId
        ? { userId, targetType: "ARTICLE", targetId: articleId }
        : { anonId: getAnonId(), targetType: "ARTICLE", targetId: articleId };
      const res = await api.post(`${API}/api/social/like`, body);
      setSocialData((prev) => ({
        ...prev,
        [articleId]: { ...prev[articleId], liked: res.data.liked, likeCount: res.data.count },
      }));
    } catch { showMsg("Failed to like. Please try again."); }
  };

  const handleFavorite = async (articleId) => {
    try {
      const body = userId
        ? { userId, targetType: "ARTICLE", targetId: articleId }
        : { anonId: getAnonId(), targetType: "ARTICLE", targetId: articleId };
      const res = await api.post(`${API}/api/social/favorite`, body);
      setSocialData((prev) => ({
        ...prev,
        [articleId]: { ...prev[articleId], favorited: res.data.favorited },
      }));
    } catch { showMsg("Failed to favorite. Please try again."); }
  };

  const handleAddComment = async (e, articleId) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const body = userId
        ? { userId, targetType: "ARTICLE", targetId: articleId, content: newComment.trim() }
        : { anonId: getAnonId(), guestName: "Guest", targetType: "ARTICLE", targetId: articleId, content: newComment.trim() };
      const res = await api.post(`${API}/api/social/comment`, body);
      setSocialData((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          comments: [res.data, ...(prev[articleId]?.comments || [])],
        },
      }));
      setNewComment("");
    } catch { showMsg("Failed to post comment. Please try again."); }
  };

  const handleDeleteComment = async (commentId, articleId) => {
    try {
      await api.delete(`${API}/api/social/comment/${commentId}?userId=${userId}`);
      setSocialData((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          comments: (prev[articleId]?.comments || []).filter((c) => c.id !== commentId),
        },
      }));
    } catch { showMsg("Failed to delete comment. Please try again."); }
  };

  const handleShare = async (article) => {
    const typePath = article.contentType === "Poetry" ? "poems"
      : article.contentType === "Blog" ? "blogs" : "articles";
    const url = `${window.location.origin}/${typePath}/${article.id}`;
    const text = `Check out "${article.headline}" on Saat Saheli!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: article.headline, text, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopiedId(article.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const toggleComments = (articleId) => {
    setOpenComments(openComments === articleId ? null : articleId);
    setNewComment("");
    if (openComments !== articleId) {
      setTimeout(() => {
        const target = commentInputRef.current || loginPromptRef.current;
        target?.focus();
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

  const renderArticleCard = (article, isOwner) => {
    const social = socialData[article.id] || {};
    const commentsArr = social.comments || [];
    const isCommentsOpen = openComments === article.id;
    const typeLabel = article.contentType || "Article";

    return (
      <div key={article.id} className="art-card">
        {/* Share button at top */}
        <div className="art-card-top-share">
          <button className="art-top-share-btn" onClick={() => handleShare(article)} title="Share">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {copiedId === article.id ? "Copied!" : "Share"}
          </button>
        </div>
        <div className="art-card-header">
          <div>
            <div className="art-badges-row">
            <span className={`art-type-badge art-type-${typeLabel.toLowerCase()}`}>{typeLabel}</span>
            {article.category && <span className="art-type-badge art-cat-badge">{article.category}</span>}
            {isOwner && article.status === "DRAFT" && <span className="art-type-badge art-draft-badge">Draft</span>}
          </div>
            <h3 className="art-headline">{article.headline}</h3>
          </div>
          {isOwner && (
            <div className="art-card-actions">
              <button
                className={`bm-btn bm-btn-sm ${article.status === "PUBLISHED" ? "bm-btn-back" : "bm-btn-create"}`}
                onClick={() => togglePublish(article)}
              >
                {article.status === "PUBLISHED" ? "Unpublish" : "Publish"}
              </button>
              <button className="bm-btn bm-btn-edit bm-btn-sm" onClick={() => startEdit(article)}>Edit</button>
              <button className="bm-btn bm-btn-delete bm-btn-sm" onClick={() => handleDelete(article.id)}>Delete</button>
            </div>
          )}
        </div>

        {!isOwner && article.authorName && (
          <Link to={profileUrl(article.userId, article.authorName)} className="art-author-link">
            by {article.authorName}
          </Link>
        )}

        {article.imageUrl && (
          <div className="art-card-image-wrap">
            <img
              src={resolveImageUrl(article.imageUrl)}
              alt={article.headline}
              className="art-card-image"
              style={{ width: `${cardImageSizes[article.id] || 100}%`, maxHeight: cardImageSizes[article.id] > 100 ? "none" : undefined }}
            />
            {isOwner && (
              <div className="art-card-image-controls">
                <button className="art-img-zoom-btn" onClick={() => setCardImageSizes(s => ({ ...s, [article.id]: Math.max(25, (s[article.id] || 100) - 25) }))} title="Zoom out">&minus;</button>
                <span className="art-img-zoom-label">{cardImageSizes[article.id] || 100}%</span>
                <button className="art-img-zoom-btn" onClick={() => setCardImageSizes(s => ({ ...s, [article.id]: Math.min(200, (s[article.id] || 100) + 25) }))} title="Zoom in">+</button>
                <button className="art-img-zoom-btn" onClick={() => setCardImageSizes(s => { const copy = { ...s }; delete copy[article.id]; return copy; })} title="Reset">Reset</button>
              </div>
            )}
          </div>
        )}

        {article.content && (
          <p className="art-card-content">{article.content}</p>
        )}

        <div className="art-card-date">
          {new Date(article.createdDate).toLocaleDateString()}
        </div>

        {/* Social Bar */}
        <div className="art-social-bar">
          <button className={`ss-btn-icon ${social.liked ? "active" : ""}`} onClick={() => handleLike(article.id)} title="Like">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={social.liked ? "#e74c3c" : "none"} stroke={social.liked ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            <span>{social.likeCount || 0}</span>
          </button>
          <button className={`ss-btn-icon ${isCommentsOpen ? "active" : ""}`} onClick={() => toggleComments(article.id)} title="Comments">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span>{commentsArr.length}</span>
          </button>
          <button className={`ss-btn-icon ${social.favorited ? "active" : ""}`} onClick={() => handleFavorite(article.id)} title="Favorite">
            <svg width="18" height="18" viewBox="0 0 24 24" fill={social.favorited ? "#d4a017" : "none"} stroke={social.favorited ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button className="ss-btn-icon" onClick={() => handleShare(article)} title="Share">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {copiedId === article.id && <span className="art-copied-tooltip">Copied!</span>}
          </button>
        </div>

        {/* Comments Section */}
        {isCommentsOpen && (
          <div className="art-comments">
            {userId ? (
              <form onSubmit={(e) => handleAddComment(e, article.id)} className="rb-comment-form">
                <input
                  ref={openComments === article.id ? commentInputRef : null}
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="rb-comment-input"
                />
                <button type="submit" className="bm-btn bm-btn-create bm-btn-sm" disabled={!newComment.trim()}>Post</button>
              </form>
            ) : (
              <p className="rb-login-prompt">
                <Link to={`/Login?redirect=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`} ref={openComments === article.id ? loginPromptRef : null}>Login with Google or create an account</Link> to comment on this item.
              </p>
            )}
            <div className="rb-comment-list">
              {commentsArr.map((c) => (
                <div key={c.id} className="rb-comment-item">
                  <div className="rb-comment-header">
                    <span className="rb-comment-author">{c.userName}</span>
                    <span className="rb-comment-date">{new Date(c.createdDate).toLocaleDateString()}</span>
                    {user && user.userId === c.userId && (
                      <button className="rb-comment-delete" onClick={() => handleDeleteComment(c.id, article.id)}>Delete</button>
                    )}
                  </div>
                  <p className="rb-comment-text">{c.content}</p>
                </div>
              ))}
              {commentsArr.length === 0 && <p className="rb-no-comments">No comments yet.</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="articles-page">
      <h1>{filterType ? `${filterType === "Poetry" ? "Poems" : filterType + "s"}` : "Writing"}</h1>
      {message && <div className="art-message">{message}</div>}

      {/* Tabs: My Content | Browse All */}
      <div className="art-tabs">
        {userId && hasProfile && (
          <button className={tab === "my" ? "active" : ""} onClick={() => setTab("my")}>My Content</button>
        )}
        <button className={tab === "published" ? "active" : ""} onClick={() => setTab("published")}>Browse All</button>
      </div>

      {/* Content type filter tabs */}
      <div className="art-section-card">
      <div className="art-filter-tabs">
        <button className={filterType === "" ? "active" : ""} onClick={() => setFilterType("")}>All</button>
        <button className={filterType === "Poetry" ? "active" : ""} onClick={() => setFilterType("Poetry")}>Poems</button>
        <button className={filterType === "Blog" ? "active" : ""} onClick={() => setFilterType("Blog")}>Blogs</button>
        <button className={filterType === "Article" ? "active" : ""} onClick={() => setFilterType("Article")}>Articles</button>
      </div>

      {tab === "my" && userId && hasProfile && (
        <>
          <div className="art-top-actions">
            <button className="bm-btn bm-btn-create" onClick={() => { resetForm(); setShowForm(true); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              + Create Blog / Article / Poem
            </button>
          </div>

          {/* Create / Edit Form */}
          {showForm && (
            <div className="art-form">
              <h2>{editingId ? "Edit" : "Create"} {contentType}</h2>
              <div className="art-field">
                <label>Type</label>
                <div className="art-type-selector">
                  <button
                    className={`art-type-btn ${contentType === "Blog" ? "active" : ""}`}
                    onClick={() => setContentType("Blog")}
                    type="button"
                  >Blog</button>
                  <button
                    className={`art-type-btn ${contentType === "Article" ? "active" : ""}`}
                    onClick={() => setContentType("Article")}
                    type="button"
                  >Article</button>
                  <button
                    className={`art-type-btn ${contentType === "Poetry" ? "active" : ""}`}
                    onClick={() => setContentType("Poetry")}
                    type="button"
                  >Poem</button>
                </div>
              </div>
              <div className="art-field">
                <label>Category</label>
                <div className="art-category-selector">
                  {CATEGORY_OPTIONS.map(cat => (
                    <button
                      key={cat}
                      className={`art-cat-btn ${category === cat ? "active" : ""}`}
                      onClick={() => setCategory(category === cat ? "" : cat)}
                      type="button"
                    >{cat}</button>
                  ))}
                </div>
              </div>
              <div className="art-field">
                <label>Title *</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder={`Enter ${contentType.toLowerCase()} title...`}
                  className="bm-input"
                  maxLength={200}
                />
              </div>
              <div className="art-field">
                <label>Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Write your ${contentType.toLowerCase()} content...`}
                  className="bm-input bm-textarea"
                  rows={10}
                />
              </div>
              <div className="art-field">
                <label>Cover Image</label>
                {imageUrl ? (
                  <div className="art-image-preview">
                    <img
                      src={resolveImageUrl(imageUrl)}
                      alt="Cover"
                      className="art-preview-img"
                      style={{ width: `${formImageSize}%`, maxWidth: `${formImageSize}%` }}
                    />
                    <div className="art-image-controls">
                      <button type="button" className="art-img-zoom-btn" onClick={() => setFormImageSize(s => Math.max(25, s - 25))} title="Smaller">&minus;</button>
                      <span className="art-img-zoom-label">{formImageSize}%</span>
                      <button type="button" className="art-img-zoom-btn" onClick={() => setFormImageSize(s => Math.min(200, s + 25))} title="Larger">+</button>
                      <button type="button" className="art-img-zoom-btn" onClick={() => setFormImageSize(100)} title="Reset size">Reset</button>
                      <button className="bm-btn bm-btn-delete bm-btn-sm" onClick={() => { setImageUrl(""); setFormImageSize(100); }}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="art-upload-area">
                    <input
                      type="file"
                      accept="image/*"
                      id="art-img-upload"
                      className="bm-file-input"
                      onChange={handleImageUpload}
                    />
                    <label htmlFor="art-img-upload" className="bm-btn bm-btn-edit bm-btn-sm">
                      {uploading ? "Uploading..." : "Choose Image"}
                    </label>
                  </div>
                )}
              </div>
              <div className="art-form-actions">
                <button className="bm-btn bm-btn-create" onClick={() => { setPublishOnSave(true); handleSave(); }} disabled={saving}>
                  {saving ? "Saving..." : editingId ? `Update & Publish` : `Publish ${contentType}`}
                </button>
                <button className="bm-btn bm-btn-edit" onClick={() => { setPublishOnSave(false); handleSave(); }} disabled={saving}>
                  Save as Draft
                </button>
                <button className="bm-btn bm-btn-back" onClick={resetForm}>Cancel</button>
              </div>
            </div>
          )}

          {/* My Articles List */}
          {loading ? (
            <p>Loading...</p>
          ) : articles.length === 0 && !showForm ? (
            <p className="art-empty">No content yet. Click &quot;+ Create Blog / Article / Poem&quot; to write your first one!</p>
          ) : (
            <div className="art-list">
              {(filterType ? articles.filter(a => a.contentType === filterType) : articles).map((article) => renderArticleCard(article, true))}
            </div>
          )}
        </>
      )}

      {tab === "published" && (
        <div className="art-browse-sections">
          {[
            { type: "Blog", label: "Blogs", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> },
            { type: "Article", label: "Articles", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
            { type: "Poetry", label: "Poems", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> },
          ]
            .filter(sec => !filterType || filterType === sec.type)
            .map(sec => {
              const items = publicArticles.filter(a => a.contentType === sec.type);
              return (
                <div key={sec.type} className="art-browse-section">
                  <h3 className={`art-browse-heading art-browse-heading-${sec.type.toLowerCase()}`}>
                    {sec.icon} {sec.label}
                    <span className="art-browse-count">{items.length}</span>
                  </h3>
                  {items.length === 0 ? (
                    <p className="art-browse-empty">No published {sec.label.toLowerCase()} yet.</p>
                  ) : (
                    <ul className="art-browse-list">
                      {items.map(article => (
                        <li key={article.id} className="art-browse-item" onClick={() => {
                          setFilterType(sec.type);
                          setTab("published");
                          const el = document.getElementById(`art-detail-${article.id}`);
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}>
                          <span className={`art-browse-dot art-browse-dot-${sec.type.toLowerCase()}`} />
                          <div className="art-browse-item-info">
                            <span className="art-browse-item-title">{article.headline}</span>
                            {article.authorName && <span className="art-browse-item-author">by {article.authorName}</span>}
                          </div>
                          <span className="art-browse-item-date">{new Date(article.createdDate).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

          {/* Full card detail view — always shown */}
          <div className="art-list" style={{ marginTop: 24 }}>
            {(filterType
              ? publicArticles.filter(a => a.contentType === filterType)
              : publicArticles
            ).map(article => (
              <div key={article.id} id={`art-detail-${article.id}`}>
                {renderArticleCard(article, userId && article.userId === userId)}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>{/* end art-section-card */}
      {editorFile && (
        <ImageEditor
          file={editorFile}
          onDone={(editedFile) => { uploadImageFile(editedFile); setEditorFile(null); }}
          onCancel={() => setEditorFile(null)}
        />
      )}
    </div>
  );
}

export default Articles;
