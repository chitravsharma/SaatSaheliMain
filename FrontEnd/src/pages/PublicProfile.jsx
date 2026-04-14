import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { profileUrl } from "../utils/api";
import { useStrings } from "../LanguageContext";
import "../PublicProfile.css";
import "./Home.css";

const API = process.env.REACT_APP_API_URL;

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
  return url;
}

function PublicProfile() {
  const { userId } = useParams();
  const strings = useStrings();
  const navigate = useNavigate();
  const s = strings.publicProfile;

  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        const [profileRes, booksRes, articlesRes] = await Promise.all([
          api.get(`${API}/api/auth/public-profile/${userId}`),
          api.get(`${API}/api/books/user/${userId}`),
          api.get(`${API}/api/articles`).catch(() => ({ data: [] })),
        ]);
        setProfile(profileRes.data);
        const published = (Array.isArray(booksRes.data) ? booksRes.data : [])
          .filter((b) => b.status === "PUBLISHED");
        setBooks(published);
        // Filter published articles by this user
        const allArticles = Array.isArray(articlesRes.data) ? articlesRes.data : [];
        setArticles(allArticles.filter(a => String(a.userId) === String(userId) && a.status === "PUBLISHED"));
        // Load gallery from localStorage
        const savedGallery = localStorage.getItem(`gallery_${userId}`);
        if (savedGallery) {
          setGalleryImages(JSON.parse(savedGallery));
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleShareProfile = async () => {
    const url = `${window.location.origin}${profileUrl(userId, displayName)}`;
    const text = `Check out ${displayName}'s profile on Saat Saheli!`;
    if (navigator.share) {
      try { await navigator.share({ title: displayName, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const handleShareArticle = async (article) => {
    const typePath = article.contentType === "Poetry" ? "poems"
      : article.contentType === "Blog" ? "blogs" : "articles";
    const url = `${window.location.origin}/${typePath}/${article.id}`;
    const text = `Check out "${article.headline}" on Saat Saheli!`;
    if (navigator.share) {
      try { await navigator.share({ title: article.headline, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    }
  };

  if (loading) {
    return <div className="pub-profile-page"><div className="loading-spinner" /></div>;
  }

  if (error || !profile) {
    return <div className="pub-profile-page"><p className="pub-profile-not-found">{s.notFound}</p></div>;
  }

  const displayName = profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email;

  return (
    <div className="pub-profile-page">
      <div className="pub-profile-nav">
        <button className="chat-back-arrow" onClick={() => navigate(-1)} aria-label={strings.common.back} title={strings.common.back}>
          &#8592;
        </button>
        <button className="pub-profile-share-btn" onClick={handleShareProfile} title="Share profile">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          {shareCopied ? "Copied!" : "Share"}
        </button>
      </div>
      <div className="pub-profile-header">
        {profile.profileImageUrl && (
          <img
            src={profile.profileImageUrl.startsWith("http") ? profile.profileImageUrl : `${API}${profile.profileImageUrl}`}
            alt={displayName}
            className="pub-profile-avatar"
          />
        )}
        <div className="pub-profile-info">
          <h1>{displayName}</h1>
          {profile.headline && <p className="pub-profile-headline">{profile.headline}</p>}
          {profile.location && <p className="pub-profile-location">{profile.location}</p>}
          {profile.createdDate && (
            <p className="pub-profile-member">{s.memberSince} {new Date(profile.createdDate).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {profile.bio && (
        <div className="pub-profile-bio">
          <p>{profile.bio}</p>
        </div>
      )}

      {/* Published Books - Home page card format */}
      {books.length > 0 && (
        <div className="home-section home-section-books" style={{ marginBottom: 24 }}>
          <h2 className="home-section-heading">{s.booksHeading}</h2>
          <div className="home-books-row">
            {books.map((book) => (
              <div key={book.id} className="home-book-card">
                <Link to={`/read/${book.id}`} className="home-book-link">
                  <div className="home-book-cover">
                    {book.coverImageUrl ? (
                      <img src={resolveImageUrl(book.coverImageUrl)} alt={book.title} className="home-book-cover-img" />
                    ) : (
                      <span className="home-book-cover-title">{book.title}</span>
                    )}
                  </div>
                  <div className="home-book-info">
                    <span className="home-book-title">{book.title}</span>
                    {book.category && <span className="home-book-author">{book.category}</span>}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Published Articles, Blogs, Poems - Home page card format */}
      {articles.length > 0 && (
        <div className="home-section home-section-articles" style={{ marginBottom: 24 }}>
          <h2 className="home-section-heading">Blogs & Articles</h2>
          <div className="home-articles-row">
            {articles.map((article) => {
              const typePath = article.contentType === "Poetry" ? "poems"
                : article.contentType === "Blog" ? "blogs" : "articles";
              return (
                <div key={article.id} className="home-article-card">
                  <Link to={`/${typePath}/${article.id}`} className="home-article-link">
                    {article.imageUrl && (
                      <img src={resolveImageUrl(article.imageUrl)} alt={article.headline} className="home-article-img" />
                    )}
                    <div className="home-article-info">
                      <span className={`home-article-type home-article-type-${(article.contentType || "article").toLowerCase()}`}>
                        {article.contentType || "Article"}
                      </span>
                      <span className="home-article-title">{article.headline}</span>
                      <span className="home-article-date">{new Date(article.createdDate).toLocaleDateString()}</span>
                    </div>
                  </Link>
                  <div className="home-card-social">
                    <button className="ss-btn-icon-sm" onClick={() => handleShareArticle(article)} title="Share">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <>
          <h2>Gallery</h2>
          <div className="pub-profile-gallery">
            {galleryImages.map((img, i) => (
              <div key={i} className="pub-gallery-item">
                <img src={img.url} alt={img.name || "Gallery"} className="pub-gallery-img" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Show empty state only if no content at all */}
      {books.length === 0 && articles.length === 0 && galleryImages.length === 0 && (
        <p className="pub-profile-no-books">{s.noBooks}</p>
      )}
    </div>
  );
}

export default PublicProfile;
