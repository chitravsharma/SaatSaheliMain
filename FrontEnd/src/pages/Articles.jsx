import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import "../Articles.css";

const API = process.env.REACT_APP_API_URL;

function resolveImageUrl(url) {
  if (!url) return url;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  return url;
}

const CONTENT_TYPE_MAP = {
  poems: "Poetry",
  articles: "Article",
  blogs: "Blog",
};

function Articles() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { contentType: urlContentType } = useParams();
  const userId = user?.userId;

  const [tab, setTab] = useState(urlContentType ? "published" : "my"); // "my" | "published"
  const [filterType, setFilterType] = useState(
    urlContentType ? (CONTENT_TYPE_MAP[urlContentType] || "") : ""
  );
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
  const [contentType, setContentType] = useState(
    urlContentType ? (CONTENT_TYPE_MAP[urlContentType] || "Blog") : "Blog"
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishOnSave, setPublishOnSave] = useState(true);

  // Social state per article
  const [socialData, setSocialData] = useState({});
  const [openComments, setOpenComments] = useState(null);
  const [newComment, setNewComment] = useState("");
  const commentInputRef = useRef(null);

  const showMsg = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const fetchArticles = async () => {
    try {
      const res = await axios.get(`${API}/api/articles/user/${userId}`);
      setArticles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicArticles = async () => {
    try {
      const res = await axios.get(`${API}/api/articles`);
      setPublicArticles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPublicArticles([]);
    }
  };

  const fetchSocialForArticle = async (articleId) => {
    try {
      const [likeRes, favRes, commentsRes] = await Promise.all([
        axios.get(`${API}/api/social/like?targetType=ARTICLE&targetId=${articleId}${userId ? `&userId=${userId}` : ""}`),
        userId
          ? axios.get(`${API}/api/social/favorite?targetType=ARTICLE&targetId=${articleId}&userId=${userId}`)
          : Promise.resolve({ data: { favorited: false } }),
        axios.get(`${API}/api/social/comments?targetType=ARTICLE&targetId=${articleId}`),
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
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (urlContentType) {
      setFilterType(CONTENT_TYPE_MAP[urlContentType] || "");
      setTab("published");
    }
  }, [urlContentType]);

  useEffect(() => {
    if (userId) fetchArticles();
    fetchPublicArticles();
  }, [userId]);

  useEffect(() => {
    const list = tab === "my" ? articles : publicArticles;
    list.forEach((a) => fetchSocialForArticle(a.id));
  }, [articles.length, publicArticles.length, tab]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImageUrl(res.data.url);
    } catch {
      showMsg("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!headline.trim()) {
      showMsg("Title is required");
      return;
    }
    setSaving(true);
    try {
      const status = publishOnSave ? "PUBLISHED" : "DRAFT";
      if (editingId) {
        await axios.put(`${API}/api/articles/${editingId}`, {
          userId,
          headline: headline.trim(),
          content: content.trim(),
          imageUrl,
          contentType,
          status,
        });
        showMsg(`${contentType} updated!`);
      } else {
        await axios.post(`${API}/api/articles`, {
          userId,
          headline: headline.trim(),
          content: content.trim(),
          imageUrl,
          contentType,
          status,
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
      await axios.put(`${API}/api/articles/${article.id}`, {
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
      await axios.delete(`${API}/api/articles/${id}?userId=${userId}`);
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
    setContentType(urlContentType ? (CONTENT_TYPE_MAP[urlContentType] || "Blog") : "Blog");
  };

  const handleLike = async (articleId) => {
    if (!userId) {
      const key = `anon_like_ARTICLE_${articleId}`;
      const was = localStorage.getItem(key) === "true";
      localStorage.setItem(key, was ? "false" : "true");
      setSocialData((prev) => ({
        ...prev,
        [articleId]: { ...prev[articleId], liked: !was },
      }));
      return;
    }
    try {
      const res = await axios.post(`${API}/api/social/like`, {
        userId, targetType: "ARTICLE", targetId: articleId,
      });
      setSocialData((prev) => ({
        ...prev,
        [articleId]: { ...prev[articleId], liked: res.data.liked, likeCount: res.data.count },
      }));
    } catch { /* ignore */ }
  };

  const handleFavorite = async (articleId) => {
    if (!userId) {
      const key = `anon_fav_ARTICLE_${articleId}`;
      const was = localStorage.getItem(key) === "true";
      localStorage.setItem(key, was ? "false" : "true");
      setSocialData((prev) => ({
        ...prev,
        [articleId]: { ...prev[articleId], favorited: !was },
      }));
      return;
    }
    try {
      const res = await axios.post(`${API}/api/social/favorite`, {
        userId, targetType: "ARTICLE", targetId: articleId,
      });
      setSocialData((prev) => ({
        ...prev,
        [articleId]: { ...prev[articleId], favorited: res.data.favorited },
      }));
    } catch { /* ignore */ }
  };

  const handleAddComment = async (e, articleId) => {
    e.preventDefault();
    if (!userId) return navigate("/Login");
    if (!newComment.trim()) return;
    try {
      const res = await axios.post(`${API}/api/social/comment`, {
        userId, targetType: "ARTICLE", targetId: articleId, content: newComment.trim(),
      });
      setSocialData((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          comments: [res.data, ...(prev[articleId]?.comments || [])],
        },
      }));
      setNewComment("");
    } catch { /* ignore */ }
  };

  const handleDeleteComment = async (commentId, articleId) => {
    try {
      await axios.delete(`${API}/api/social/comment/${commentId}?userId=${userId}`);
      setSocialData((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          comments: (prev[articleId]?.comments || []).filter((c) => c.id !== commentId),
        },
      }));
    } catch { /* ignore */ }
  };

  const handleShare = async (article) => {
    const url = `${window.location.origin}/#/articles`;
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
      setTimeout(() => commentInputRef.current?.focus(), 100);
    }
  };

  const renderArticleCard = (article, isOwner) => {
    const social = socialData[article.id] || {};
    const commentsArr = social.comments || [];
    const isCommentsOpen = openComments === article.id;
    const typeLabel = article.contentType || "Article";

    return (
      <div key={article.id} className="art-card">
        <div className="art-card-header">
          <div>
            <div className="art-badges-row">
            <span className={`art-type-badge art-type-${typeLabel.toLowerCase()}`}>{typeLabel}</span>
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
          <Link to={`/profile/${article.userId}`} className="art-author-link">
            by {article.authorName}
          </Link>
        )}

        {article.imageUrl && (
          <img src={resolveImageUrl(article.imageUrl)} alt={article.headline} className="art-card-image" />
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
              <p className="rb-login-prompt"><Link to="/Login">Log in</Link> to post a comment.</p>
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
        {userId && (
          <button className={tab === "my" ? "active" : ""} onClick={() => setTab("my")}>My Content</button>
        )}
        <button className={tab === "published" ? "active" : ""} onClick={() => setTab("published")}>Browse All</button>
      </div>

      {/* Content type filter tabs */}
      <div className="art-filter-tabs">
        <button className={filterType === "" ? "active" : ""} onClick={() => setFilterType("")}>All</button>
        <button className={filterType === "Poetry" ? "active" : ""} onClick={() => setFilterType("Poetry")}>Poems</button>
        <button className={filterType === "Blog" ? "active" : ""} onClick={() => setFilterType("Blog")}>Blogs</button>
        <button className={filterType === "Article" ? "active" : ""} onClick={() => setFilterType("Article")}>Articles</button>
      </div>

      {tab === "my" && userId && (
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
                    <img src={resolveImageUrl(imageUrl)} alt="Cover" className="art-preview-img" />
                    <button className="bm-btn bm-btn-delete bm-btn-sm" onClick={() => setImageUrl("")}>Remove</button>
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
        <div className="art-list">
          {(() => {
            const filtered = filterType
              ? publicArticles.filter((a) => a.contentType === filterType)
              : publicArticles;
            return filtered.length === 0 ? (
              <p className="art-empty">No published {filterType ? filterType.toLowerCase() + "s" : "content"} yet.</p>
            ) : (
              filtered.map((article) => renderArticleCard(article, userId && article.userId === userId))
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default Articles;
