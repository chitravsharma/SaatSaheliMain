import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "./GalleryView.css";

const API = process.env.REACT_APP_API_URL;

function GalleryView() {
  const { galleryId } = useParams();
  const { user } = useAuth();
  const strings = useStrings();
  const navigate = useNavigate();

  const [gallery, setGallery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const commentInputRef = useRef(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await axios.get(`${API}/api/galleries/${galleryId}`);
        setGallery(res.data);
        setLikeCount(res.data.likeCount || 0);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, [galleryId]);

  useEffect(() => {
    if (!galleryId) return;
    const fetchSocial = async () => {
      try {
        const [likeRes, favRes, commentsRes] = await Promise.all([
          axios.get(`${API}/api/social/like?targetType=GALLERY&targetId=${galleryId}${user ? `&userId=${user.userId}` : ""}`),
          user ? axios.get(`${API}/api/social/favorite?targetType=GALLERY&targetId=${galleryId}&userId=${user.userId}`) : Promise.resolve({ data: { favorited: false } }),
          axios.get(`${API}/api/social/comments?targetType=GALLERY&targetId=${galleryId}`),
        ]);
        if (!user) {
          setLiked(localStorage.getItem(`anon_like_GALLERY_${galleryId}`) === "true");
          setFavorited(localStorage.getItem(`anon_fav_GALLERY_${galleryId}`) === "true");
        } else {
          setLiked(likeRes.data.liked);
          setFavorited(favRes.data.favorited);
        }
        setLikeCount(likeRes.data.count);
        setComments(commentsRes.data || []);
      } catch { /* ignore */ }
    };
    fetchSocial();
  }, [galleryId, user]);

  const handleLike = async () => {
    if (!user) {
      const key = `anon_like_GALLERY_${galleryId}`;
      const wasLiked = localStorage.getItem(key) === "true";
      localStorage.setItem(key, wasLiked ? "false" : "true");
      setLiked(!wasLiked);
      return;
    }
    try {
      const res = await axios.post(`${API}/api/social/like`, { userId: user.userId, targetType: "GALLERY", targetId: Number(galleryId) });
      setLiked(res.data.liked);
      setLikeCount(res.data.count);
    } catch { /* ignore */ }
  };

  const handleFavorite = async () => {
    if (!user) {
      const key = `anon_fav_GALLERY_${galleryId}`;
      const wasFav = localStorage.getItem(key) === "true";
      localStorage.setItem(key, wasFav ? "false" : "true");
      setFavorited(!wasFav);
      return;
    }
    try {
      const res = await axios.post(`${API}/api/social/favorite`, { userId: user.userId, targetType: "GALLERY", targetId: Number(galleryId) });
      setFavorited(res.data.favorited);
    } catch { /* ignore */ }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/Login");
    if (!newComment.trim()) return;
    try {
      const res = await axios.post(`${API}/api/social/comment`, {
        userId: user.userId, targetType: "GALLERY", targetId: Number(galleryId), content: newComment.trim(),
      });
      setComments([res.data, ...comments]);
      setNewComment("");
    } catch { /* ignore */ }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API}/api/social/comment/${commentId}?userId=${user.userId}`);
      setComments(comments.filter(c => c.id !== commentId));
    } catch { /* ignore */ }
  };

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(-1);
  const prevImage = () => setLightboxIndex(i => (i > 0 ? i - 1 : gallery.images.length - 1));
  const nextImage = () => setLightboxIndex(i => (i < gallery.images.length - 1 ? i + 1 : 0));

  useEffect(() => {
    const handleKey = (e) => {
      if (lightboxIndex < 0) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (loading) return <div className="loading-spinner" />;
  if (!gallery) return <div className="gv-container"><p>Gallery not found.</p></div>;

  const images = gallery.images || [];

  return (
    <div className="gv-container">
      <div className="gv-nav-bar">
        <button className="ss-btn ss-btn-outline" onClick={() => navigate(-1)}>{strings.common.back}</button>
      </div>

      <div className="gv-header">
        <h1 className="gv-title">{gallery.title}</h1>
        {gallery.authorName && (
          <Link to={`/profile/${gallery.userId}`} className="gv-author">by {gallery.authorName}</Link>
        )}
        {gallery.description && <p className="gv-description">{gallery.description}</p>}
      </div>

      {/* Social actions */}
      <div className="gv-social-bar">
        <button className={`ss-btn-icon ${liked ? "active" : ""}`} onClick={handleLike} title="Like">
          <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "#e74c3c" : "none"} stroke={liked ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <span>{likeCount}</span>
        </button>
        <button className={`ss-btn-icon ${showComments ? "active" : ""}`} onClick={() => { setShowComments(!showComments); if (!showComments) setTimeout(() => commentInputRef.current?.focus(), 100); }} title="Comments">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span>{comments.length}</span>
        </button>
        <button className={`ss-btn-icon ${favorited ? "active" : ""}`} onClick={handleFavorite} title="Favorite">
          <svg width="20" height="20" viewBox="0 0 24 24" fill={favorited ? "#d4a017" : "none"} stroke={favorited ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
      </div>

      {/* Photo grid */}
      <div className="gv-grid">
        {images.map((img, i) => (
          <div key={img.id || i} className="gv-grid-item" onClick={() => openLightbox(i)}>
            <img src={img.imageUrl} alt={img.caption || `Photo ${i + 1}`} className="gv-grid-img" />
            {img.caption && <div className="gv-grid-caption">{img.caption}</div>}
          </div>
        ))}
      </div>

      {images.length === 0 && <p className="gv-empty">No photos in this gallery yet.</p>}

      {/* Comments section */}
      {showComments && (
        <div className="gv-comments">
          <h3 className="gv-comments-heading">Comments ({comments.length})</h3>
          {user ? (
            <form onSubmit={handleAddComment} className="gv-comment-form">
              <input
                ref={commentInputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="gv-comment-input"
              />
              <button type="submit" className="ss-btn ss-btn-primary" disabled={!newComment.trim()}>Post</button>
            </form>
          ) : (
            <p className="gv-login-prompt">
              <Link to="/Login">Log in</Link> to post a comment.
            </p>
          )}
          <div className="gv-comment-list">
            {comments.map((c) => (
              <div key={c.id} className="gv-comment-item">
                <div className="gv-comment-header">
                  <span className="gv-comment-author">{c.userName}</span>
                  <span className="gv-comment-date">{new Date(c.createdDate).toLocaleDateString()}</span>
                  {user && user.userId === c.userId && (
                    <button className="gv-comment-delete" onClick={() => handleDeleteComment(c.id)}>Delete</button>
                  )}
                </div>
                <p className="gv-comment-text">{c.content}</p>
              </div>
            ))}
            {comments.length === 0 && <p className="gv-no-comments">No comments yet. Be the first!</p>}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex >= 0 && images[lightboxIndex] && (
        <div className="gv-lightbox" onClick={closeLightbox}>
          <div className="gv-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="gv-lightbox-close" onClick={closeLightbox}>&times;</button>
            <button className="gv-lightbox-prev" onClick={prevImage}>&lsaquo;</button>
            <img src={images[lightboxIndex].imageUrl} alt={images[lightboxIndex].caption || ""} className="gv-lightbox-img" />
            <button className="gv-lightbox-next" onClick={nextImage}>&rsaquo;</button>
            {images[lightboxIndex].caption && (
              <div className="gv-lightbox-caption">{images[lightboxIndex].caption}</div>
            )}
            <div className="gv-lightbox-counter">{lightboxIndex + 1} / {images.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GalleryView;
