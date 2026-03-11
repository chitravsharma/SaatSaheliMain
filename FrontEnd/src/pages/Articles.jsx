import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

function Articles() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.userId;

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Create/Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const fetchSocialForArticle = async (articleId) => {
    try {
      const [likeRes, favRes, commentsRes] = await Promise.all([
        axios.get(`${API}/api/social/like?targetType=ARTICLE&targetId=${articleId}&userId=${userId}`),
        axios.get(`${API}/api/social/favorite?targetType=ARTICLE&targetId=${articleId}&userId=${userId}`),
        axios.get(`${API}/api/social/comments?targetType=ARTICLE&targetId=${articleId}`),
      ]);
      setSocialData((prev) => ({
        ...prev,
        [articleId]: {
          liked: likeRes.data.liked,
          likeCount: likeRes.data.count,
          favorited: favRes.data.favorited,
          comments: commentsRes.data || [],
        },
      }));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (userId) fetchArticles();
  }, [userId]);

  useEffect(() => {
    articles.forEach((a) => fetchSocialForArticle(a.id));
  }, [articles.length]);

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
      showMsg("Headline is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${API}/api/articles/${editingId}`, {
          userId,
          headline: headline.trim(),
          content: content.trim(),
          imageUrl,
        });
        showMsg("Article updated!");
      } else {
        await axios.post(`${API}/api/articles`, {
          userId,
          headline: headline.trim(),
          content: content.trim(),
          imageUrl,
        });
        showMsg("Article created!");
      }
      resetForm();
      fetchArticles();
    } catch (err) {
      showMsg("Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this article?")) return;
    try {
      await axios.delete(`${API}/api/articles/${id}?userId=${userId}`);
      showMsg("Article deleted!");
      fetchArticles();
    } catch {
      showMsg("Failed to delete article");
    }
  };

  const startEdit = (article) => {
    setEditingId(article.id);
    setHeadline(article.headline);
    setContent(article.content || "");
    setImageUrl(article.imageUrl || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setHeadline("");
    setContent("");
    setImageUrl("");
  };

  const handleLike = async (articleId) => {
    try {
      const res = await axios.post(`${API}/api/social/like`, {
        userId, targetType: "ARTICLE", targetId: articleId,
      });
      setSocialData((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          liked: res.data.liked,
          likeCount: res.data.count,
        },
      }));
    } catch { /* ignore */ }
  };

  const handleFavorite = async (articleId) => {
    try {
      const res = await axios.post(`${API}/api/social/favorite`, {
        userId, targetType: "ARTICLE", targetId: articleId,
      });
      setSocialData((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          favorited: res.data.favorited,
        },
      }));
    } catch { /* ignore */ }
  };

  const handleAddComment = async (e, articleId) => {
    e.preventDefault();
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

  const toggleComments = (articleId) => {
    setOpenComments(openComments === articleId ? null : articleId);
    setNewComment("");
    if (openComments !== articleId) {
      setTimeout(() => commentInputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="articles-page">
      <h1>My Articles</h1>
      {message && <div className="art-message">{message}</div>}

      <div className="art-top-actions">
        <button className="bm-btn bm-btn-create" onClick={() => { resetForm(); setShowForm(true); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Add Article
        </button>
        <button className="bm-btn bm-btn-back" onClick={() => navigate("/books")}>
          Back to Books
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="art-form">
          <h2>{editingId ? "Edit Article" : "Create Article"}</h2>
          <div className="art-field">
            <label>Headline *</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Enter article headline..."
              className="bm-input"
              maxLength={200}
            />
          </div>
          <div className="art-field">
            <label>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article content..."
              className="bm-input bm-textarea"
              rows={8}
            />
          </div>
          <div className="art-field">
            <label>Image</label>
            {imageUrl ? (
              <div className="art-image-preview">
                <img src={resolveImageUrl(imageUrl)} alt="Article" className="art-preview-img" />
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
            <button className="bm-btn bm-btn-create" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Article" : "Save Article"}
            </button>
            <button className="bm-btn bm-btn-back" onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      {/* Articles List */}
      {loading ? (
        <p>Loading articles...</p>
      ) : articles.length === 0 && !showForm ? (
        <p className="art-empty">No articles yet. Click "Add Article" to create your first one!</p>
      ) : (
        <div className="art-list">
          {articles.map((article) => {
            const social = socialData[article.id] || {};
            const commentsArr = social.comments || [];
            const isCommentsOpen = openComments === article.id;

            return (
              <div key={article.id} className="art-card">
                <div className="art-card-header">
                  <h3 className="art-headline">{article.headline}</h3>
                  <div className="art-card-actions">
                    <button className="bm-btn bm-btn-edit bm-btn-sm" onClick={() => startEdit(article)}>Edit</button>
                    <button className="bm-btn bm-btn-delete bm-btn-sm" onClick={() => handleDelete(article.id)}>Delete</button>
                  </div>
                </div>

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
                </div>

                {/* Comments Section */}
                {isCommentsOpen && (
                  <div className="art-comments">
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
          })}
        </div>
      )}
    </div>
  );
}

export default Articles;
