import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useStrings } from "../LanguageContext";
import { optimizeCloudinary } from "../utils/imageUrl";
import "../BookManager.css";

const API_BASE = process.env.REACT_APP_API_URL;
const API = `${API_BASE}/api/books`;

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
  return optimizeCloudinary(url);
}

const CONTENT_TYPE_MAP = {
  poem: "Poetry",
  article: "Article",
  blog: "Blog",
};

function SearchBooks() {
  const strings = useStrings();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("");
  const [bookResults, setBookResults] = useState([]);
  const [articleResults, setArticleResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q, type) => {
    if (!q && !type) return;
    setLoading(true);
    setSearched(true);
    try {
      const contentTypes = ["poem", "article", "blog"];
      const categoryTypes = ["Art", "Music", "Tech", "Creativity", "Community"];
      const isContentType = type && contentTypes.includes(type);
      const isAuthor = type === "author";
      const isCategory = type && categoryTypes.includes(type);
      const isBookType = type === "book";

      // Search books (for all types except content-type-only searches)
      let booksPromise = Promise.resolve([]);
      if (!isContentType) {
        const params = new URLSearchParams();
        if (isAuthor) {
          if (q) params.append("author", q);
        } else if (isCategory) {
          if (q) params.append("title", q);
          params.append("category", type);
        } else {
          if (q) params.append("title", q);
        }
        booksPromise = axios.get(`${API}/search?${params.toString()}`)
          .then(res => Array.isArray(res.data) ? res.data : [])
          .catch(() => []);
      }

      // Search articles (for content types, author, and "All")
      let articlesPromise = Promise.resolve([]);
      if (!isBookType && !isCategory) {
        articlesPromise = axios.get(`${API_BASE}/api/articles`)
          .then(res => {
            let arts = Array.isArray(res.data) ? res.data : [];
            // Filter by content type if searching specific type
            if (isContentType) {
              const mapped = CONTENT_TYPE_MAP[type];
              arts = arts.filter(a => a.contentType === mapped);
            }
            // Filter by query text (title/headline match)
            if (q) {
              const qLower = q.toLowerCase();
              arts = arts.filter(a => {
                const headline = (a.headline || "").toLowerCase();
                const authorName = (a.authorName || "").toLowerCase();
                const content = (a.content || "").toLowerCase();
                if (isAuthor) return authorName.includes(qLower);
                return headline.includes(qLower) || authorName.includes(qLower) || content.includes(qLower);
              });
            }
            return arts;
          })
          .catch(() => []);
      }

      const [books, articles] = await Promise.all([booksPromise, articlesPromise]);
      setBookResults(books);
      setArticleResults(articles);
    } catch (err) {
      setBookResults([]);
      setArticleResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Read URL query params from header search and auto-search
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const q = urlParams.get("q") || "";
    const type = urlParams.get("type") || "";
    setQuery(q);
    setSearchType(type);
    if (q || type) {
      doSearch(q, type);
    }
  }, [location.search, doSearch]);

  const handleSelectBook = (book) => {
    navigate(`/read/${book.id}`);
  };

  const handleSelectArticle = (article) => {
    const typePath = article.contentType === "Poetry" ? "poems"
      : article.contentType === "Blog" ? "blogs" : "articles";
    navigate(`/${typePath}/${article.id}`);
  };

  const totalResults = bookResults.length + articleResults.length;

  const searchSuggestions = [
    { label: "Browse all Books", to: "/books" },
    { label: "Read the Magazine", to: "/magazine" },
    { label: "Explore Poems", to: "/poems" },
    { label: "Read Articles", to: "/articles" },
    { label: "Discover Blogs", to: "/blogs" },
    { label: "Listen to Podcasts", to: "/podcasts" },
    { label: "Photo Galleries", to: "/category/Art" },
    { label: "Visit Marketplace", to: "/marketplace" },
  ];

  return (
    <div className="book-manager search-page">
      <h1>{strings.searchBooks.heading}</h1>

      {(query || searchType) && (
        <p style={{ color: "var(--text-secondary, #6b7280)", fontSize: "1rem", margin: "0 0 20px" }}>
          {query && <>Showing results for: <strong style={{ color: "var(--text-primary, #e2e8f0)" }}>{query}</strong></>}
          {searchType && <>{query ? " " : "Showing results "}in <strong style={{ color: "var(--text-primary, #e2e8f0)" }}>{searchType}</strong></>}
        </p>
      )}

      {loading && <div className="loading-spinner" />}

      {searched && !loading && totalResults > 0 && (
        <div className="bm-search-results-table">
          <h3>{strings.searchBooks.resultsHeading(totalResults)}</h3>

          {/* Book results */}
          {bookResults.length > 0 && (
            <>
              {articleResults.length > 0 && <h4 style={{ color: "var(--accent-gold, #c9a84c)", margin: "16px 0 12px" }}>Books</h4>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {bookResults.map((book) => (
                  <div key={book.id} className="home-book-card" style={{
                    background: "var(--bg-card, #1e293b)", border: "1px solid var(--border-default, #334155)",
                    borderRadius: 12, padding: 0, minWidth: 150, maxWidth: 180, cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                    onClick={() => handleSelectBook(book)}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <div style={{
                      width: "100%", height: 200, borderRadius: "12px 12px 0 0", overflow: "hidden",
                      background: "linear-gradient(135deg, #1e3a5f, #2d1b4e)", display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {book.coverImageUrl ? (
                        <img src={resolveImageUrl(book.coverImageUrl)} alt={book.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ color: "#c9a84c", fontSize: "0.9rem", fontWeight: 600, textAlign: "center", padding: 12 }}>
                          {book.title}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary, #e2e8f0)", marginBottom: 4,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {book.title}
                      </div>
                      {book.authorName && (
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary, #9ca3af)" }}>
                          by {book.authorName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Article/Blog/Poem results */}
          {articleResults.length > 0 && (
            <>
              {bookResults.length > 0 && <h4 style={{ color: "var(--accent-gold, #c9a84c)", margin: "24px 0 12px" }}>Articles, Blogs & Poems</h4>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {articleResults.map((article) => (
                  <div key={`art-${article.id}`} style={{
                    background: "var(--bg-card, #1e293b)", border: "1px solid var(--border-default, #334155)",
                    borderRadius: 12, padding: 0, minWidth: 150, maxWidth: 220, cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s", overflow: "hidden",
                  }}
                    onClick={() => handleSelectArticle(article)}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    {article.imageUrl && (
                      <div style={{ width: "100%", height: 140, overflow: "hidden" }}>
                        <img src={resolveImageUrl(article.imageUrl)} alt={article.headline}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <div style={{ padding: "10px 12px" }}>
                      <span style={{
                        display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem",
                        fontWeight: 700, textTransform: "uppercase", marginBottom: 6,
                        background: article.contentType === "Poetry" ? "rgba(168,85,247,0.15)" : article.contentType === "Blog" ? "rgba(59,130,246,0.15)" : "rgba(239,68,68,0.15)",
                        color: article.contentType === "Poetry" ? "#a855f7" : article.contentType === "Blog" ? "#3b82f6" : "#ef4444",
                      }}>
                        {article.contentType || "Article"}
                      </span>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary, #e2e8f0)", marginBottom: 4 }}>
                        {article.headline}
                      </div>
                      {article.authorName && (
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary, #9ca3af)" }}>
                          by {article.authorName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {searched && !loading && totalResults === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>&#128269;</div>
          <h3 style={{ color: "var(--text-primary, #e2e8f0)", marginBottom: 8 }}>
            No results found{query ? ` for "${query}"` : ""}
          </h3>
          <p style={{ color: "var(--text-secondary, #9ca3af)", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
            Try searching with different keywords, check spelling, or use the header search bar to search by title, author, or category.
          </p>
          <h4 style={{ color: "var(--text-primary, #e2e8f0)", marginBottom: 16 }}>You might like to explore:</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {searchSuggestions.map((s) => (
              <Link key={s.to} to={s.to} style={{
                padding: "8px 18px", borderRadius: 8, fontSize: "0.88rem", fontWeight: 600,
                background: "var(--bg-card-alt, #1e293b)", color: "var(--accent-gold, #c9a84c)",
                border: "1px solid var(--border-default, #334155)", textDecoration: "none",
                transition: "background 0.2s, border-color 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-gold, #c9a84c)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default, #334155)"; }}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!searched && !loading && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary, #9ca3af)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>&#128270;</div>
          <p style={{ fontSize: "1.05rem" }}>Use the search bar in the header to find books, authors, and more.</p>
          <h4 style={{ color: "var(--text-primary, #e2e8f0)", marginTop: 24, marginBottom: 16 }}>Or explore:</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {searchSuggestions.map((s) => (
              <Link key={s.to} to={s.to} style={{
                padding: "8px 18px", borderRadius: 8, fontSize: "0.88rem", fontWeight: 600,
                background: "var(--bg-card-alt, #1e293b)", color: "var(--accent-gold, #c9a84c)",
                border: "1px solid var(--border-default, #334155)", textDecoration: "none",
                transition: "background 0.2s, border-color 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-gold, #c9a84c)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default, #334155)"; }}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchBooks;
