import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { profileUrl } from "../utils/api";
import { useAuth } from "../AuthContext";
import useProfile from "../hooks/useProfile";
import "./Recipes.css";

const API = process.env.REACT_APP_API_URL;

export default function Recipes() {
  const { user } = useAuth();
  const { hasProfile } = useProfile();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Author-grouped browse: which authors are expanded.
  // Default closed — click reveals that cook's recipes.
  const [expandedAuthors, setExpandedAuthors] = useState({});

  useEffect(() => {
    window.scrollTo(0, 0);
    api
      .get(`${API}/api/recipes`)
      .then((res) => setRecipes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load recipes. Please try again later."))
      .finally(() => setLoading(false));
  }, []);

  // Group recipes by author so the entry point is a directory of cooks.
  const groups = recipes.reduce((acc, r) => {
    const key = (r.authorName || "Unknown cook").trim();
    (acc[key] ||= []).push(r);
    return acc;
  }, {});
  const authors = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  const renderRecipeCard = (r) => {
    const cover = r.images && r.images.length > 0 ? r.images[0].imageUrl : null;
    const hasImage = !!cover;
    return (
      <Link
        key={r.id}
        to={`/recipes/${r.id}`}
        className={`recipe-card ${hasImage ? "" : "recipe-card-compact"}`}
        aria-label={`Open recipe: ${r.recipeName || "Untitled"}`}
      >
        {hasImage && (
          <div className="recipe-cover">
            <img src={cover} alt="" loading="lazy" />
          </div>
        )}
        <div className="recipe-meta">
          <div className="recipe-title">{r.recipeName || "Untitled"}</div>
          {r.cuisine && <div className="recipe-cuisine">{r.cuisine}</div>}
          {r.authorName && (
            <div className="recipe-author">
              by{" "}
              <Link to={profileUrl(r.userId, r.authorName)} onClick={(e) => e.stopPropagation()}>
                {r.authorName}
              </Link>
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="recipes-page">
      <div className="recipes-hero">
        <h1>Recipes / व्यंजन</h1>
        <hr className="recipes-divider" />
        <p className="recipes-intro">
          Discover and share favorite recipes from our community.
        </p>
        {user && hasProfile && (
          <Link to="/recipes/create" className="ss-btn ss-btn-primary">
            + Create a Recipe
          </Link>
        )}
      </div>

      {loading && <p className="recipes-status">Loading recipes…</p>}
      {error && <p className="recipes-status recipes-error">{error}</p>}
      {!loading && !error && recipes.length === 0 && (
        <p className="recipes-status">No recipes yet. Be the first to share!</p>
      )}

      {!loading && !error && recipes.length > 0 && (
        <ul className="recipes-author-list">
          {authors.map((author) => {
            const isOpen = !!expandedAuthors[author];
            const works = groups[author].slice().sort(
              (a, b) => (a.recipeName || "").localeCompare(b.recipeName || "")
            );
            return (
              <li key={author} className="recipes-author-row">
                <button
                  type="button"
                  className={`recipes-author-btn ${isOpen ? "recipes-author-btn-open" : ""}`}
                  onClick={() => setExpandedAuthors((s) => ({ ...s, [author]: !s[author] }))}
                  aria-expanded={isOpen}
                >
                  <span className="recipes-author-dot" />
                  <span className="recipes-author-name">By {author}</span>
                  <span className="recipes-author-count">{works.length}</span>
                  <svg className="recipes-author-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {isOpen && (
                  <div className="recipes-author-works">
                    {works.map(renderRecipeCard)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
