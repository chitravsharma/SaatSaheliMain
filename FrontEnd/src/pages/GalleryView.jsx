import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import api, { profileUrl } from "../utils/api";
import { optimizeCloudinary } from "../utils/imageUrl";
import { useAuth } from "../AuthContext";
import ReCAPTCHA from "react-google-recaptcha";
import { useStrings } from "../LanguageContext";
import "./GalleryView.css";

const API = process.env.REACT_APP_API_URL;
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

function GalleryView() {
  const { galleryId } = useParams();
  const { user } = useAuth();
  const [contacting, setContacting] = useState(false);
  // Guest enquiry (visitor without an account): name + email + phone + message.
  const [guestForm, setGuestForm] = useState(null); // null | { imageId }
  const [guest, setGuest] = useState({ name: "", email: "", phone: "", message: "", website: "" });
  const [guestToken, setGuestToken] = useState("");
  const [guestError, setGuestError] = useState("");
  const [guestSent, setGuestSent] = useState(false);
  const guestCaptchaRef = useRef(null);

  // "Contact seller" on an item For Sale. Logged in → private thread; not logged
  // in → a short form (name, email, phone, message) the seller replies to directly.
  const contactCreator = async (imageId) => {
    if (!user) {
      setGuestError(""); setGuestSent(false); setGuestForm({ imageId });
      return;
    }
    setContacting(true);
    try {
      const r = await api.post(`${API}/api/messages/conversations`, { targetType: "GALLERY_IMAGE", targetId: imageId });
      navigate(`/messages/${r.data.id}`);
    } catch (err) {
      if (!err?.response?.data?.upgradeRequired) {
        window.alert(err?.response?.data?.error || "Could not start a conversation.");
      }
    } finally {
      setContacting(false);
    }
  };

  const submitGuestEnquiry = async (e) => {
    e.preventDefault();
    const g = strings.gallery;
    if (guest.name.trim().length < 2) { setGuestError(g.guestNeedName); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email.trim())) { setGuestError(g.guestNeedEmail); return; }
    if (!/^[+\d][\d\s().-]{6,19}$/.test(guest.phone.trim())) { setGuestError(g.guestNeedPhone); return; }
    if (!guest.message.trim()) { setGuestError(g.guestNeedMessage); return; }
    if (RECAPTCHA_SITE_KEY && !guestToken) { setGuestError(g.guestNeedCaptcha); return; }
    setContacting(true); setGuestError("");
    try {
      await api.post(`${API}/api/messages/guest-enquiry`, {
        targetType: "GALLERY_IMAGE", targetId: guestForm.imageId,
        name: guest.name.trim(), email: guest.email.trim(), phone: guest.phone.trim(),
        message: guest.message.trim(), website: guest.website, recaptchaToken: guestToken,
      });
      setGuestSent(true);
      setGuest({ name: "", email: "", phone: "", message: "", website: "" });
    } catch (err) {
      setGuestError(err?.response?.data?.error || g.guestFailed);
      guestCaptchaRef.current?.reset(); setGuestToken("");
    } finally {
      setContacting(false);
    }
  };
  const strings = useStrings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [gallery, setGallery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [error, setError] = useState("");
  const [imageStates, setImageStates] = useState({}); // {imageId: {liked, likeCount, favorited}}
  const [imageShareCopied, setImageShareCopied] = useState(null); // imageId briefly
  const [brokenImageIds, setBrokenImageIds] = useState(new Set());
  const commentInputRef = useRef(null);
  const loginPromptRef = useRef(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await api.get(`${API}/api/galleries/${galleryId}`);
        setGallery(res.data);
        setLikeCount(res.data.likeCount || 0);
      } catch (err) {
        console.error("Failed to fetch gallery:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGallery();
  }, [galleryId]);

  // If URL has ?img=<imageId>, open the lightbox on that image after gallery loads.
  // This supports deep-linked shares from the per-image Share button.
  useEffect(() => {
    if (!gallery || !gallery.images || gallery.images.length === 0) return;
    const imgParam = searchParams.get("img");
    if (!imgParam) return;
    const idx = gallery.images.findIndex((img) => String(img.id) === String(imgParam));
    if (idx >= 0) {
      setLightboxIndex(idx);
    } else {
      // Image id unknown (deleted/reordered) — fall back to scrolling near the top of the grid
      const grid = document.querySelector(".gv-grid");
      if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [gallery, searchParams]);

  // Arrived from a notification / "Comments" link (?focus=comments): open the
  // gallery comment section and scroll it into view.
  useEffect(() => {
    if (searchParams.get("focus") !== "comments") return;
    setShowComments(true);
    const t = setTimeout(() => {
      const target = commentInputRef.current || loginPromptRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus?.();
    }, 600);
    return () => clearTimeout(t);
  }, [galleryId, searchParams]);

  // Fetch per-image social state when gallery images load
  useEffect(() => {
    if (!gallery || !gallery.images || gallery.images.length === 0) return;
    (async () => {
      const states = {};
      await Promise.all(
        gallery.images.map(async (img) => {
          try {
            const [likeRes, favRes] = await Promise.all([
              api.get(`${API}/api/social/like?targetType=GALLERY_IMAGE&targetId=${img.id}${user ? `&userId=${user.userId}` : ""}`),
              user ? api.get(`${API}/api/social/favorite?targetType=GALLERY_IMAGE&targetId=${img.id}&userId=${user.userId}`) : Promise.resolve({ data: { favorited: false } }),
            ]);
            states[img.id] = {
              liked: user ? (likeRes.data.liked || false) : (localStorage.getItem(`anon_like_GALLERY_IMAGE_${img.id}`) === "true"),
              likeCount: likeRes.data.count || 0,
              favorited: user ? (favRes.data.favorited || false) : (localStorage.getItem(`anon_fav_GALLERY_IMAGE_${img.id}`) === "true"),
            };
          } catch (err) {
            states[img.id] = { liked: false, likeCount: 0, favorited: false };
          }
        })
      );
      setImageStates(states);
    })();
  }, [gallery, user]);

  useEffect(() => {
    if (!galleryId) return;
    const fetchSocial = async () => {
      try {
        const [likeRes, favRes, commentsRes] = await Promise.all([
          api.get(`${API}/api/social/like?targetType=GALLERY&targetId=${galleryId}${user ? `&userId=${user.userId}` : ""}`),
          user ? api.get(`${API}/api/social/favorite?targetType=GALLERY&targetId=${galleryId}&userId=${user.userId}`) : Promise.resolve({ data: { favorited: false } }),
          api.get(`${API}/api/social/comments?targetType=GALLERY&targetId=${galleryId}`),
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
      } catch (err) {
        console.error("Failed to fetch social data:", err);
      }
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
      const res = await api.post(`${API}/api/social/like`, { userId: user.userId, targetType: "GALLERY", targetId: Number(galleryId) });
      setLiked(res.data.liked);
      setLikeCount(res.data.count);
    } catch (err) {
      setError("Failed to update like. Please try again.");
    }
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
      const res = await api.post(`${API}/api/social/favorite`, { userId: user.userId, targetType: "GALLERY", targetId: Number(galleryId) });
      setFavorited(res.data.favorited);
    } catch (err) {
      setError("Failed to update favorite. Please try again.");
    }
  };

  const [galleryShareCopied, setGalleryShareCopied] = useState(false);

  const handleGalleryShare = async () => {
    const url = `${window.location.origin}/gallery/${galleryId}`;
    const shareData = {
      title: gallery?.title || "Gallery",
      text: `Check out "${gallery?.title || 'this gallery'}" on Saat Saheli!`,
      url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setGalleryShareCopied(true);
      setTimeout(() => setGalleryShareCopied(false), 1500);
    } catch (err) {
      setError("Failed to copy link.");
    }
  };

  // Per-image actions
  const handleImageLike = async (imageId) => {
    if (!user) {
      const key = `anon_like_GALLERY_IMAGE_${imageId}`;
      const wasLiked = localStorage.getItem(key) === "true";
      localStorage.setItem(key, wasLiked ? "false" : "true");
      setImageStates((s) => ({
        ...s,
        [imageId]: {
          ...(s[imageId] || { likeCount: 0, favorited: false }),
          liked: !wasLiked,
          likeCount: (s[imageId]?.likeCount || 0) + (wasLiked ? -1 : 1),
        },
      }));
      return;
    }
    try {
      const res = await api.post(`${API}/api/social/like`, {
        userId: user.userId, targetType: "GALLERY_IMAGE", targetId: Number(imageId),
      });
      setImageStates((s) => ({
        ...s,
        [imageId]: { ...(s[imageId] || {}), liked: res.data.liked, likeCount: res.data.count },
      }));
    } catch (err) {
      setError("Failed to like image.");
    }
  };

  const handleImageFavorite = async (imageId) => {
    if (!user) {
      const key = `anon_fav_GALLERY_IMAGE_${imageId}`;
      const wasFav = localStorage.getItem(key) === "true";
      localStorage.setItem(key, wasFav ? "false" : "true");
      setImageStates((s) => ({
        ...s,
        [imageId]: { ...(s[imageId] || { liked: false, likeCount: 0 }), favorited: !wasFav },
      }));
      return;
    }
    try {
      const res = await api.post(`${API}/api/social/favorite`, {
        userId: user.userId, targetType: "GALLERY_IMAGE", targetId: Number(imageId),
      });
      setImageStates((s) => ({
        ...s,
        [imageId]: { ...(s[imageId] || {}), favorited: res.data.favorited },
      }));
    } catch (err) {
      setError("Failed to favorite image.");
    }
  };

  const handleImageShare = async (imageId) => {
    const url = `${window.location.origin}/gallery/${galleryId}?img=${imageId}`;
    const shareData = { title: gallery?.title || "Gallery", url };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setImageShareCopied(imageId);
      setTimeout(() => setImageShareCopied(null), 1500);
    } catch (err) {
      setError("Failed to copy link.");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/Login");
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`${API}/api/social/comment`, {
        userId: user.userId, targetType: "GALLERY", targetId: Number(galleryId), content: newComment.trim(),
      });
      setComments([res.data, ...comments]);
      setNewComment("");
    } catch (err) {
      setError("Failed to post comment. Please try again.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`${API}/api/social/comment/${commentId}?userId=${user.userId}`);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      setError("Failed to delete comment. Please try again.");
    }
  };

  // Lightbox zoom: 1 = fit to screen; >1 enlarges the picture and the image box pans/scrolls.
  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom(z => Math.min(4, +(z + 0.5).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(1, +(z - 0.5).toFixed(2)));
  const openLightbox = (index) => { setZoom(1); setGuestForm(null); setLightboxIndex(index); };
  const closeLightbox = () => { setZoom(1); setGuestForm(null); setLightboxIndex(-1); };
  const prevImage = () => { setZoom(1); setLightboxIndex(i => (i > 0 ? i - 1 : gallery.images.length - 1)); };
  const nextImage = () => { setZoom(1); setLightboxIndex(i => (i < gallery.images.length - 1 ? i + 1 : 0)); };

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
          <Link to={profileUrl(gallery.userId, gallery.authorName, gallery.authorHandle)} className="gv-author">by {gallery.authorName}</Link>
        )}
        {gallery.description && <p className="gv-description">{gallery.description}</p>}
      </div>

      {/* Social actions */}
      <div className="gv-social-bar">
        <button className={`ss-btn-icon ${liked ? "active" : ""}`} onClick={handleLike} title="Like">
          <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "#e74c3c" : "none"} stroke={liked ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          <span>{likeCount}</span>
        </button>
        <button className={`ss-btn-icon ${showComments ? "active" : ""}`} onClick={() => { setShowComments(!showComments); if (!showComments) setTimeout(() => { const target = commentInputRef.current || loginPromptRef.current; target?.focus(); target?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100); }} title="Comments">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <span>{comments.length}</span>
        </button>
        <button className={`ss-btn-icon ${favorited ? "active" : ""}`} onClick={handleFavorite} title="Favorite">
          <svg width="20" height="20" viewBox="0 0 24 24" fill={favorited ? "#d4a017" : "none"} stroke={favorited ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button className="ss-btn-icon" onClick={handleGalleryShare} title="Share gallery" style={{ position: "relative" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          {galleryShareCopied && <span className="gv-share-copied">Copied</span>}
        </button>
      </div>

      {error && (
        <div className="gv-error" role="alert">
          {error}
          <button className="gv-error-dismiss" onClick={() => setError("")}>&times;</button>
        </div>
      )}

      {/* Photo grid */}
      <div className="gv-grid">
        {images.map((img, i) => {
          const st = imageStates[img.id] || { liked: false, likeCount: 0, favorited: false };
          return (
            <div key={img.id || i} className="gv-grid-item">
              <div
                className="gv-grid-thumb"
                onClick={() => openLightbox(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openLightbox(i); }}
              >
                {brokenImageIds.has(img.id) ? (
                  <div className="gv-grid-img gv-grid-img-broken" aria-label="Image unavailable">
                    <span>Image unavailable</span>
                  </div>
                ) : (
                  <img
                    src={optimizeCloudinary(img.imageUrl)}
                    alt={img.caption || `Photo ${i + 1}`}
                    className="gv-grid-img"
                    loading="lazy"
                    decoding="async"
                    onError={() => setBrokenImageIds(prev => new Set(prev).add(img.id))}
                  />
                )}
                {img.forSale && (
                  <span className={`gv-sale-ribbon ${img.saleStatus === "SOLD" ? "gv-sale-ribbon-sold" : ""}`}>
                    {img.saleStatus === "SOLD" ? strings.gallery.sold : strings.gallery.forSale}
                    {img.saleStatus !== "SOLD" && img.salePrice ? ` · ${img.salePrice}` : ""}
                  </span>
                )}
                {img.caption && <div className="gv-grid-caption">{img.caption}</div>}
              </div>
              <div className="gv-image-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`gv-image-action ${st.liked ? "active-like" : ""}`}
                  onClick={() => handleImageLike(img.id)}
                  title="Like"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={st.liked ? "#e74c3c" : "none"} stroke={st.liked ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  <span>{st.likeCount}</span>
                </button>
                <button
                  className={`gv-image-action ${st.favorited ? "active-star" : ""}`}
                  onClick={() => handleImageFavorite(img.id)}
                  title="Favorite"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={st.favorited ? "#d4a017" : "none"} stroke={st.favorited ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
                <button
                  className="gv-image-action"
                  onClick={() => handleImageShare(img.id)}
                  title="Share"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  {imageShareCopied === img.id && <span className="gv-share-copied">Copied</span>}
                </button>
              </div>
            </div>
          );
        })}
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
              <Link to={`/Login?redirect=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`} ref={loginPromptRef}>Login with Google or create an account</Link> to comment on this item.
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
          <div className={`gv-lightbox-content ${images[lightboxIndex].forSale ? "gv-lightbox-content-sale" : ""}`} onClick={(e) => e.stopPropagation()}>
            <div className="gv-lightbox-bar">
              <button type="button" onClick={zoomOut} aria-label="Zoom out" disabled={zoom <= 1}>&minus;</button>
              <span className="gv-lightbox-zoom">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={zoomIn} aria-label="Zoom in" disabled={zoom >= 4}>+</button>
              {zoom > 1 && <button type="button" onClick={() => setZoom(1)} aria-label="Reset zoom">Reset</button>}
              <button type="button" className="gv-lightbox-close" onClick={closeLightbox} aria-label="Close">&times;</button>
            </div>
            <div className={`gv-lightbox-imgwrap ${zoom > 1 ? "gv-lightbox-imgwrap-zoomed" : ""}`}>
              <button className="gv-lightbox-prev" onClick={prevImage} aria-label="Previous image">&lsaquo;</button>
              {brokenImageIds.has(images[lightboxIndex].id) ? (
                <div className="gv-lightbox-img gv-lightbox-img-broken">
                  Image unavailable
                </div>
              ) : (
                <img
                  src={optimizeCloudinary(images[lightboxIndex].imageUrl)}
                  alt={images[lightboxIndex].caption || ""}
                  className="gv-lightbox-img"
                  style={zoom > 1 ? { width: `${zoom * 100}%`, maxWidth: "none", maxHeight: "none" } : undefined}
                  onClick={() => (zoom > 1 ? setZoom(1) : zoomIn())}
                  decoding="async"
                  loading="eager"
                  onError={() => setBrokenImageIds(prev => new Set(prev).add(images[lightboxIndex].id))}
                />
              )}
              <button className="gv-lightbox-next" onClick={nextImage} aria-label="Next image">&rsaquo;</button>
            </div>
            {images[lightboxIndex].caption && (
              <div className="gv-lightbox-caption">{images[lightboxIndex].caption}</div>
            )}
            {images[lightboxIndex].forSale && (
              <div className={`gv-lightbox-sale ${images[lightboxIndex].saleStatus === "SOLD" ? "gv-lightbox-sale-sold" : ""}`}>
                <div className="gv-lightbox-sale-row">
                  <span className="gv-lightbox-sale-badge">
                    {images[lightboxIndex].saleStatus === "SOLD" ? strings.gallery.sold : strings.gallery.forSale}
                  </span>
                  {images[lightboxIndex].saleStatus !== "SOLD" && (
                    <span className="gv-lightbox-sale-price">{images[lightboxIndex].salePrice || strings.gallery.askPrice}</span>
                  )}
                  {gallery.authorName && (
                    <Link to={profileUrl(gallery.userId, gallery.authorName, gallery.authorHandle)} className="gv-lightbox-sale-seller">
                      {strings.gallery.bySeller} {gallery.authorName}
                    </Link>
                  )}
                  {images[lightboxIndex].saleStatus !== "SOLD" && !(user && gallery && String(gallery.userId) === String(user.userId)) && !(guestForm && guestForm.imageId === images[lightboxIndex].id) && (
                    <button
                      type="button"
                      className="gv-contact-btn"
                      disabled={contacting}
                      onClick={() => contactCreator(images[lightboxIndex].id)}
                    >
                      {contacting ? "…" : strings.gallery.contactCreator}
                    </button>
                  )}
                </div>
                {images[lightboxIndex].saleNote && (
                  <p className="gv-lightbox-sale-note">{images[lightboxIndex].saleNote}</p>
                )}
                {guestForm && guestForm.imageId === images[lightboxIndex].id && (
                  guestSent ? (
                    <div className="gv-guest-sent">
                      <strong>{strings.gallery.guestSentTitle}</strong>
                      <p>{strings.gallery.guestSentText}</p>
                      <button type="button" className="ss-btn ss-btn-outline ss-btn-sm" onClick={() => setGuestForm(null)}>{strings.common.close || "Close"}</button>
                    </div>
                  ) : (
                    <form className="gv-guest-form" onSubmit={submitGuestEnquiry}>
                      <div className="gv-guest-head">
                        <strong>{strings.gallery.guestTitle}</strong>
                        <Link to={`/Login?redirect=${encodeURIComponent(`${window.location.pathname}?img=${images[lightboxIndex].id}`)}`} className="gv-guest-login">{strings.gallery.guestLoginInstead}</Link>
                      </div>
                      <input type="text" placeholder={strings.gallery.guestName} value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} maxLength={80} autoComplete="name" required />
                      <input type="email" placeholder={strings.gallery.guestEmail} value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} maxLength={200} autoComplete="email" inputMode="email" required />
                      <input type="tel" placeholder={strings.gallery.guestPhone} value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} maxLength={20} autoComplete="tel" inputMode="tel" required />
                      <textarea placeholder={strings.gallery.guestMessage} value={guest.message} onChange={(e) => setGuest({ ...guest, message: e.target.value })} maxLength={2000} rows={3} required />
                      {/* Honeypot — hidden from people, filled by bots. */}
                      <input type="text" name="website" value={guest.website} onChange={(e) => setGuest({ ...guest, website: e.target.value })} tabIndex={-1} autoComplete="off" className="gv-guest-hp" aria-hidden="true" />
                      {RECAPTCHA_SITE_KEY && (
                        <div className="gv-guest-captcha">
                          <ReCAPTCHA ref={guestCaptchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={(t) => setGuestToken(t || "")} onExpired={() => setGuestToken("")} size="compact" />
                        </div>
                      )}
                      {guestError && <p className="gv-guest-error">{guestError}</p>}
                      <div className="gv-guest-actions">
                        <button type="submit" className="gv-contact-btn" disabled={contacting}>{contacting ? "…" : strings.gallery.guestSend}</button>
                        <button type="button" className="ss-btn ss-btn-outline ss-btn-sm" onClick={() => setGuestForm(null)}>{strings.common.cancel}</button>
                      </div>
                      <p className="gv-guest-privacy">{strings.gallery.guestPrivacy}</p>
                    </form>
                  )
                )}
              </div>
            )}
            <div className="gv-lightbox-counter">{lightboxIndex + 1} / {images.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GalleryView;
