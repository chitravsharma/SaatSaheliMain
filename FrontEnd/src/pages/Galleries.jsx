import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import "./Writers.css";
import "./Galleries.css";

const API = process.env.REACT_APP_API_URL;

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  return url;
}

export default function Galleries() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    api
      .get(`${API}/api/galleries`)
      .then((res) => setGalleries(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load galleries. Please try again later."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="writers-page">
      <div className="writers-hero">
        <h1>Galleries</h1>
        <hr className="writers-divider" />
        <p className="writers-intro">
          Browse photo galleries shared by our community.
        </p>
      </div>

      {loading && <p className="writers-status">Loading galleries…</p>}
      {error && <p className="writers-status writers-error">{error}</p>}
      {!loading && !error && galleries.length === 0 && (
        <p className="writers-status">No public galleries yet.</p>
      )}

      <div className="galleries-grid">
        {galleries.map((g) => {
          const cover = resolveImageUrl(g.coverImageUrl);
          return (
            <Link
              key={g.id}
              to={`/gallery/${g.id}`}
              className="gallery-card"
              aria-label={`Open gallery: ${g.title || "Untitled"}`}
            >
              <div className="gallery-cover">
                {cover ? (
                  <img src={cover} alt="" loading="lazy" />
                ) : (
                  <span className="gallery-cover-empty" aria-hidden="true">🖼️</span>
                )}
              </div>
              <div className="gallery-meta">
                <div className="gallery-title">{g.title || "Untitled"}</div>
                {g.authorName && <div className="gallery-author">by {g.authorName}</div>}
                {g.description && <div className="gallery-desc">{g.description}</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
