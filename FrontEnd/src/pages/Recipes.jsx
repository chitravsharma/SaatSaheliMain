import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { profileUrl } from "../utils/api";
import { useAuth } from "../AuthContext";
import "./Recipes.css";

const API = process.env.REACT_APP_API_URL;

export default function Recipes() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    api
      .get(`${API}/api/recipes`)
      .then((res) => setRecipes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load recipes. Please try again later."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="recipes-page">
      <div className="recipes-hero">
        <h1>Recipes / व्यंजन</h1>
        <hr className="recipes-divider" />
        <p className="recipes-intro">
          Discover and share favorite recipes from our community.
        </p>
        {user && (
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

      <div className="recipes-grid">
        {recipes.map((r) => {
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
        })}
      </div>
    </div>
  );
}
