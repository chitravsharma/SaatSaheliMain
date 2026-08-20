import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { profileUrl } from "../utils/api";
import { useGatedClick } from "../contexts/LoginGateContext";
import { useStrings } from "../LanguageContext";
import { optimizeCloudinary } from "../utils/imageUrl";
import "../PublicProfile.css";
import "./Home.css";

const API = process.env.REACT_APP_API_URL;

// TODO: replace with profile.linkedinUrl when the field lands on the user model.
const FOUNDER_LINKEDIN_URL = "https://www.linkedin.com/in/chitra-vsharma/";

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
  return optimizeCloudinary(url);
}

function PublicProfile() {
  const { userId } = useParams();
  const gateClick = useGatedClick();
  const strings = useStrings();
  const navigate = useNavigate();
  const s = strings.publicProfile;

  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        const [profileRes, booksRes, articlesRes, galleriesRes, recipesRes] = await Promise.all([
          api.get(`${API}/api/auth/public-profile/${userId}`),
          api.get(`${API}/api/books/user/${userId}`).catch(() => ({ data: [] })),
          api.get(`${API}/api/articles`).catch(() => ({ data: [] })),
          api.get(`${API}/api/galleries/user/${userId}`).catch(() => ({ data: [] })),
          api.get(`${API}/api/recipes/user/${userId}`).catch(() => ({ data: [] })),
        ]);
        setProfile(profileRes.data);
        const published = (Array.isArray(booksRes.data) ? booksRes.data : [])
          .filter((b) => b.status === "PUBLISHED");
        setBooks(published);
        const allArticles = Array.isArray(articlesRes.data) ? articlesRes.data : [];
        setArticles(allArticles.filter(a => String(a.userId) === String(userId) && a.status === "PUBLISHED"));
        // Match the other content types: show published work only. This used to
        // exclude just DELETED, which let a creator's DRAFT galleries show on their
        // public profile while staying hidden everywhere else.
        const gals = (Array.isArray(galleriesRes.data) ? galleriesRes.data : [])
          .filter(g => g.status === "PUBLISHED");
        setGalleries(gals);
        const recs = (Array.isArray(recipesRes.data) ? recipesRes.data : [])
          .filter(r => r.status === "PUBLISHED");
        setRecipes(recs);
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

  const poems = articles.filter(a => a.contentType === "Poetry");
  const blogs = articles.filter(a => a.contentType === "Blog");
  const arts  = articles.filter(a => !a.contentType || (a.contentType !== "Poetry" && a.contentType !== "Blog"));

  const renderArticleCard = (article) => {
    const typePath = article.contentType === "Poetry" ? "poems"
      : article.contentType === "Blog" ? "blogs" : "articles";
    const hasImage = !!article.imageUrl;
    return (
      <div key={`a-${article.id}`} className={`home-article-card ${hasImage ? "" : "home-article-card-compact"}`}>
        <Link to={`/${typePath}/${article.id}`} className="home-article-link">
          {hasImage && (
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
  };

  const renderRecipeCard = (recipe) => {
    const cover = recipe.images && recipe.images[0]?.imageUrl;
    const hasImage = !!cover;
    return (
      <div key={`r-${recipe.id}`} className={`home-article-card ${hasImage ? "" : "home-article-card-compact"}`}>
        <Link to={`/recipes/${recipe.id}`} className="home-article-link">
          {hasImage && <img src={cover} alt={recipe.recipeName} className="home-article-img" />}
          <div className="home-article-info">
            <span className="home-article-type home-article-type-recipe">Recipe</span>
            <span className="home-article-title">{recipe.recipeName}</span>
            {recipe.cuisine && <span className="home-article-author">{recipe.cuisine}</span>}
            <span className="home-article-date">{new Date(recipe.createdDate).toLocaleDateString()}</span>
          </div>
        </Link>
      </div>
    );
  };

  const renderGalleryCard = (gallery) => {
    const cover = resolveImageUrl(gallery.coverImageUrl);
    const hasImage = !!cover;
    return (
      <div key={`g-${gallery.id}`} className={`home-article-card ${hasImage ? "" : "home-article-card-compact"}`}>
        <Link to={`/gallery/${gallery.id}`} className="home-article-link">
          {hasImage && <img src={cover} alt={gallery.title} className="home-article-img" />}
          <div className="home-article-info">
            <span className="home-article-type home-article-type-poetry">Gallery</span>
            <span className="home-article-title">{gallery.title || "Untitled"}</span>
            {gallery.description && <span className="home-article-author">{gallery.description}</span>}
            <span className="home-article-date">{new Date(gallery.createdDate).toLocaleDateString()}</span>
          </div>
        </Link>
      </div>
    );
  };

  const hasNothing = books.length === 0 && articles.length === 0 && galleries.length === 0 && recipes.length === 0;

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
          {profile.occupation && <p className="pub-profile-occupation">{profile.occupation}</p>}
          {profile.location && <p className="pub-profile-location">{profile.location}</p>}
          {profile.createdDate && !profile.teamRole && (
            <p className="pub-profile-member">{s.memberSince} {new Date(profile.createdDate).toLocaleDateString()}</p>
          )}
          {profile.teamRole && profile.teamRole.toLowerCase().includes('founder') && (
            <a
              href={FOUNDER_LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer me"
              className="pub-profile-linkedin"
              aria-label="Connect on LinkedIn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a66c2" aria-hidden="true">
                <path d="M19 0h-14C2.24 0 0 2.24 0 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5V5c0-2.76-2.24-5-5-5zM8 19H5V8h3v11zM6.5 6.73c-.97 0-1.75-.79-1.75-1.75S5.53 3.23 6.5 3.23s1.75.79 1.75 1.75S7.47 6.73 6.5 6.73zM20 19h-3v-5.6c0-3.37-4-3.11-4 0V19h-3V8h3v1.76c1.4-2.58 7-2.78 7 2.46V19z"/>
              </svg>
              Connect on LinkedIn
            </a>
          )}
        </div>
      </div>

      {profile.bio && (
        <div className="pub-profile-bio">
          <p>{profile.bio}</p>
        </div>
      )}

      {/* Books */}
      {books.length > 0 && (
        <div className="home-section home-section-books" style={{ marginBottom: 24 }}>
          <h2 className="home-section-heading">{s.booksHeading}</h2>
          <div className="home-books-row">
            {books.map((book) => (
              <div key={book.id} className="home-book-card">
                <Link to={`/read/${book.id}`} className="home-book-link" onClick={gateClick(`/read/${book.id}`)}>
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

      {/* Poems */}
      {poems.length > 0 && (
        <div className="home-section home-section-articles" style={{ marginBottom: 24 }}>
          <h2 className="home-section-heading">Poems / कविताएँ</h2>
          <div className="home-articles-row">{poems.map(renderArticleCard)}</div>
        </div>
      )}

      {/* Blogs */}
      {blogs.length > 0 && (
        <div className="home-section home-section-articles" style={{ marginBottom: 24 }}>
          <h2 className="home-section-heading">Blogs</h2>
          <div className="home-articles-row">{blogs.map(renderArticleCard)}</div>
        </div>
      )}

      {/* Articles */}
      {arts.length > 0 && (
        <div className="home-section home-section-articles" style={{ marginBottom: 24 }}>
          <h2 className="home-section-heading">Articles</h2>
          <div className="home-articles-row">{arts.map(renderArticleCard)}</div>
        </div>
      )}

      {/* Recipes */}
      {recipes.length > 0 && (
        <div className="home-section home-section-articles" style={{ marginBottom: 24 }}>
          <h2 className="home-section-heading">Recipes / व्यंजन</h2>
          <div className="home-articles-row">{recipes.map(renderRecipeCard)}</div>
        </div>
      )}

      {/* Galleries */}
      {galleries.length > 0 && (
        <div className="home-section home-section-articles" style={{ marginBottom: 24 }}>
          <h2 className="home-section-heading">Galleries</h2>
          <div className="home-articles-row">{galleries.map(renderGalleryCard)}</div>
        </div>
      )}

      {hasNothing && (
        <p className="pub-profile-no-books">{s.noBooks}</p>
      )}
    </div>
  );
}

export default PublicProfile;
