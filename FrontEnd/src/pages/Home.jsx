import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "./Home.css";

const API = process.env.REACT_APP_API_URL;

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
  return url;
}

function Home() {
  const strings = useStrings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentBooks, setRecentBooks] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [recentArticles, setRecentArticles] = useState([]);
  const [bookCounts, setBookCounts] = useState({ likes: {}, comments: {} });
  const [galleryCounts, setGalleryCounts] = useState({ likes: {}, comments: {} });
  const [userLikes, setUserLikes] = useState({});
  const [userFavorites, setUserFavorites] = useState({});
  const [loading, setLoading] = useState(true);
  const [shareCopiedId, setShareCopiedId] = useState(null);
  const [adShareCopiedId, setAdShareCopiedId] = useState(null);
  const [advertisements, setAdvertisements] = useState([]);

  // Fetch active advertisements from API
  useEffect(() => {
    axios.get(`${API}/api/advertisements/active`)
      .then(res => setAdvertisements(Array.isArray(res.data) ? res.data : []))
      .catch(() => { /* ignore */ });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksRes, galleriesRes, articlesRes, bookCountsRes, galleryCountsRes] = await Promise.all([
          axios.get(`${API}/api/books/search?status=PUBLISHED`),
          axios.get(`${API}/api/galleries`),
          axios.get(`${API}/api/articles`).catch(() => ({ data: [] })),
          axios.get(`${API}/api/social/counts?targetType=BOOK`).catch(() => ({ data: { likes: {}, comments: {} } })),
          axios.get(`${API}/api/social/counts?targetType=GALLERY`).catch(() => ({ data: { likes: {}, comments: {} } })),
        ]);

        const books = Array.isArray(booksRes.data) ? booksRes.data : [];
        books.sort((a, b) => new Date(b.modifiedDate) - new Date(a.modifiedDate));
        setRecentBooks(books.slice(0, 12));

        const gals = Array.isArray(galleriesRes.data) ? galleriesRes.data : [];
        gals.sort((a, b) => new Date(b.modifiedDate) - new Date(a.modifiedDate));
        setGalleries(gals.slice(0, 8));

        const arts = Array.isArray(articlesRes.data) ? articlesRes.data : [];
        arts.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        setRecentArticles(arts.slice(0, 6));

        setBookCounts(bookCountsRes.data || { likes: {}, comments: {} });
        setGalleryCounts(galleryCountsRes.data || { likes: {}, comments: {} });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch user's likes and favorites
  useEffect(() => {
    if (!user) {
      // Load anonymous likes/favorites from localStorage
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
        const [bookFavs, galleryFavs] = await Promise.all([
          axios.get(`${API}/api/social/favorites?userId=${user.userId}&targetType=BOOK`),
          axios.get(`${API}/api/social/favorites?userId=${user.userId}&targetType=GALLERY`),
        ]);
        const favMap = {};
        (bookFavs.data || []).forEach(f => { favMap[`BOOK_${f.targetId}`] = true; });
        (galleryFavs.data || []).forEach(f => { favMap[`GALLERY_${f.targetId}`] = true; });
        setUserFavorites(favMap);
      } catch { /* ignore */ }
    };
    fetchUserSocial();
  }, [user]);

  const handleLike = async (targetType, targetId) => {
    if (!user) {
      const anonKey = `anon_like_${targetType}_${targetId}`;
      const wasLiked = localStorage.getItem(anonKey) === "true";
      localStorage.setItem(anonKey, wasLiked ? "false" : "true");
      const key = `${targetType}_${targetId}`;
      setUserLikes(prev => ({ ...prev, [key]: !wasLiked }));
      return;
    }
    try {
      const res = await axios.post(`${API}/api/social/like`, { userId: user.userId, targetType, targetId });
      const key = `${targetType}_${targetId}`;
      setUserLikes(prev => ({ ...prev, [key]: res.data.liked }));
      if (targetType === "BOOK") {
        setBookCounts(prev => ({ ...prev, likes: { ...prev.likes, [targetId]: res.data.count } }));
      } else {
        setGalleryCounts(prev => ({ ...prev, likes: { ...prev.likes, [targetId]: res.data.count } }));
      }
    } catch { /* ignore */ }
  };

  const handleFavorite = async (targetType, targetId) => {
    if (!user) {
      const anonKey = `anon_fav_${targetType}_${targetId}`;
      const wasFav = localStorage.getItem(anonKey) === "true";
      localStorage.setItem(anonKey, wasFav ? "false" : "true");
      const key = `${targetType}_${targetId}`;
      setUserFavorites(prev => ({ ...prev, [key]: !wasFav }));
      return;
    }
    try {
      const res = await axios.post(`${API}/api/social/favorite`, { userId: user.userId, targetType, targetId });
      const key = `${targetType}_${targetId}`;
      setUserFavorites(prev => ({ ...prev, [key]: res.data.favorited }));
    } catch { /* ignore */ }
  };

  const handleAdShare = async (ad) => {
    const url = ad.linkUrl || window.location.origin;
    const text = `Check out this on Saat Saheli: ${ad.title}`;
    if (navigator.share) {
      try { await navigator.share({ title: ad.title, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setAdShareCopiedId(ad.id);
      setTimeout(() => setAdShareCopiedId(null), 2000);
    }
  };

  const handleShare = async (article) => {
    const typePath = article.contentType === "Poetry" ? "poems"
      : article.contentType === "Blog" ? "blogs" : "articles";
    const url = `${window.location.origin}/#/articles/${typePath}`;
    const text = `Check out "${article.headline}" on Saat Saheli!`;
    if (navigator.share) {
      try { await navigator.share({ title: article.headline, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareCopiedId(article.id);
      setTimeout(() => setShareCopiedId(null), 2000);
    }
  };

  const categoryIcons = {
    Magazine: "\uD83D\uDCD6",
    Books: "\uD83D\uDCDA",
  };

  // Group books into only two categories: Magazine and Books
  const grouped = {};
  recentBooks.forEach((book) => {
    const cat = (book.category || "").toUpperCase() === "MAGAZINE" ? "Magazine" : "Books";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(book);
  });

  return (
    <div className="home-container">
      {/* Quick nav links */}
      <div className="home-tags">
        <Link to="/magazine" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          </span>
          {strings.header.navMagazine}
        </Link>
        <Link to="/about" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </span>
          {strings.header.navAbout}
        </Link>
        <Link to="/books" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          </span>
          Books
        </Link>
        <Link to="/articles/poems" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </span>
          Poems
        </Link>
        <Link to="/articles/articles" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </span>
          Articles
        </Link>
        <Link to="/articles/blogs" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          </span>
          Blogs
        </Link>
        <Link to="/podcasts" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </span>
          Podcasts
        </Link>
        <Link to="/marketplace" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          </span>
          Buy/Sell
        </Link>
        <Link to="/manual" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </span>
          Help
        </Link>
      </div>

      {loading && <div className="loading-spinner" />}

      {/* 1. Recently Added Books (top) */}
      {!loading && (
        <div className="home-section">
          <h2 className="home-section-heading">Recently Added Books</h2>

          {recentBooks.length === 0 && (
            <p className="home-empty">No published content yet. Be the first to create!</p>
          )}

          {Object.keys(grouped).length > 0 && (
            <div className="home-categories">
              {Object.entries(grouped).map(([category, books]) => (
                <div key={category} className="home-category-group">
                  <h3 className="home-category-title">
                    <span className="home-category-icon">{categoryIcons[category] || "\uD83D\uDCDA"}</span>
                    {category}
                  </h3>
                  <div className="home-books-row">
                    {books.map((book) => {
                      const likeC = bookCounts.likes[book.id] || 0;
                      const commentC = bookCounts.comments[book.id] || 0;
                      const isLiked = userLikes[`BOOK_${book.id}`];
                      const isFav = userFavorites[`BOOK_${book.id}`];

                      return (
                        <div key={book.id} className="home-book-card">
                          <Link to={`/read/${book.id}`} className="home-book-link">
                            <div className="home-book-cover">
                              {book.coverImageUrl ? (
                                <img
                                  src={resolveImageUrl(book.coverImageUrl)}
                                  alt={book.title}
                                  className="home-book-cover-img"
                                />
                              ) : (
                                <span className="home-book-cover-title">{book.title}</span>
                              )}
                            </div>
                            <div className="home-book-info">
                              <span className="home-book-title">{book.title}</span>
                              {book.authorName && (
                                <span className="home-book-author">by {book.authorName}</span>
                              )}
                            </div>
                          </Link>
                          <div className="home-card-social">
                            <button className={`ss-btn-icon-sm ${isLiked ? "active" : ""}`} onClick={() => handleLike("BOOK", book.id)} title="Like">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? "#e74c3c" : "none"} stroke={isLiked ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                              <span>{likeC}</span>
                            </button>
                            <Link to={`/read/${book.id}`} className="ss-btn-icon-sm" title="Comments">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                              <span>{commentC}</span>
                            </Link>
                            <button className={`ss-btn-icon-sm ${isFav ? "active" : ""}`} onClick={() => handleFavorite("BOOK", book.id)} title="Favorite">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? "#d4a017" : "none"} stroke={isFav ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dynamic Ad Banners */}
      {!loading && advertisements.length > 0 && advertisements.map((ad) => (
        <div key={ad.id} className="home-ad-section">
          <div className={`home-ad-banner home-ad-anim-${ad.animation}`}>
            <span className="home-ad-label">Advertisement</span>
            <div className={`home-ad-content ${ad.animation === "scroll" ? "home-ad-scroll" : ""} ${ad.animation === "blink" ? "home-ad-blink" : ""}`}>
              {ad.contentType === "image" && ad.imageUrl && (
                ad.linkUrl ? (
                  <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer">
                    <img src={ad.imageUrl} alt={ad.title} className="home-ad-image" />
                  </a>
                ) : (
                  <img src={ad.imageUrl} alt={ad.title} className="home-ad-image" />
                )
              )}
              {ad.contentType === "html" && (
                <div dangerouslySetInnerHTML={{ __html: ad.htmlContent }} />
              )}
              {ad.contentType === "text" && <h3>{ad.title}</h3>}
              <div className="home-ad-actions">
                {ad.linkUrl && ad.contentType !== "image" && (
                  <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="home-ad-cta">Learn More</a>
                )}
                <button className="home-ad-share-btn" onClick={() => handleAdShare(ad)} title="Share this ad">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  {adShareCopiedId === ad.id ? "Copied!" : "Share"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* 2. Photo Galleries */}
      {!loading && galleries.length > 0 && (
        <div className="home-section">
          <h2 className="home-section-heading">Photo Galleries</h2>
          <div className="home-gallery-row">
            {galleries.map((gallery) => {
              const coverImg = gallery.coverImageUrl || (gallery.images && gallery.images[0]?.imageUrl);
              const imgCount = gallery.images ? gallery.images.length : 0;
              const likeC = galleryCounts.likes[gallery.id] || gallery.likeCount || 0;
              const commentC = galleryCounts.comments[gallery.id] || gallery.commentCount || 0;
              const isLiked = userLikes[`GALLERY_${gallery.id}`];
              const isFav = userFavorites[`GALLERY_${gallery.id}`];

              return (
                <div key={gallery.id} className="home-gallery-card">
                  <Link to={`/gallery/${gallery.id}`} className="home-gallery-link">
                    <div className="home-gallery-cover">
                      {coverImg ? (
                        <img src={coverImg} alt={gallery.title} className="home-gallery-cover-img" />
                      ) : (
                        <div className="home-gallery-cover-placeholder">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                      )}
                      <span className="home-gallery-count">{imgCount} photos</span>
                    </div>
                    <div className="home-gallery-info">
                      <span className="home-gallery-title">{gallery.title}</span>
                      {gallery.authorName && <span className="home-gallery-author">by {gallery.authorName}</span>}
                    </div>
                  </Link>
                  <div className="home-card-social">
                    <button className={`ss-btn-icon-sm ${isLiked ? "active" : ""}`} onClick={() => handleLike("GALLERY", gallery.id)} title="Like">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? "#e74c3c" : "none"} stroke={isLiked ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                      <span>{likeC}</span>
                    </button>
                    <Link to={`/gallery/${gallery.id}`} className="ss-btn-icon-sm" title="Comments">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      <span>{commentC}</span>
                    </Link>
                    <button className={`ss-btn-icon-sm ${isFav ? "active" : ""}`} onClick={() => handleFavorite("GALLERY", gallery.id)} title="Favorite">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? "#d4a017" : "none"} stroke={isFav ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Blogs & Articles */}
      {!loading && recentArticles.length > 0 && (
        <div className="home-section">
          <h2 className="home-section-heading">Blogs & Articles</h2>
          <div className="home-articles-row">
            {recentArticles.map((article) => {
              const typePath = article.contentType === "Poetry" ? "poems"
                : article.contentType === "Blog" ? "blogs"
                : "articles";
              return (
                <div key={article.id} className="home-article-card">
                  <Link to={`/articles/${typePath}`} className="home-article-link">
                    {article.imageUrl && (
                      <img src={resolveImageUrl(article.imageUrl)} alt={article.headline} className="home-article-img" />
                    )}
                    <div className="home-article-info">
                      <span className={`home-article-type home-article-type-${(article.contentType || "article").toLowerCase()}`}>
                        {article.contentType || "Article"}
                      </span>
                      <span className="home-article-title">{article.headline}</span>
                      {article.authorName && <span className="home-article-author">by {article.authorName}</span>}
                      <span className="home-article-date">{new Date(article.createdDate).toLocaleDateString()}</span>
                    </div>
                  </Link>
                  <div className="home-card-social">
                    <button className="ss-btn-icon-sm" onClick={() => handleShare(article)} title="Share">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      {shareCopiedId === article.id ? <span>Copied!</span> : <span>Share</span>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="home-section-more">
            <Link to="/articles/poems" className="ss-btn ss-btn-outline" style={{ marginRight: 8 }}>Poems</Link>
            <Link to="/articles/blogs" className="ss-btn ss-btn-outline" style={{ marginRight: 8 }}>Blogs</Link>
            <Link to="/articles/articles" className="ss-btn ss-btn-outline">Articles</Link>
          </div>
        </div>
      )}

      {/* Fallback ad if no dynamic ads exist */}
      {!loading && advertisements.length === 0 && (
        <div className="home-ad-section">
          <div className="home-ad-banner home-ad-banner-alt">
            <span className="home-ad-label">Sponsored</span>
            <div className="home-ad-content">
              <h3>Join Saat Saheli Creator Program</h3>
              <p>Publish your books, podcasts, and artwork. Upgrade to Creator plan for premium publishing tools and monetization.</p>
              <Link to="/pricing" className="home-ad-cta">Explore Plans</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
