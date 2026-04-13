import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { profileUrl } from "../utils/api";
import "./Writers.css";

const API = process.env.REACT_APP_API_URL;

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
  return url;
}

function displayNameFor(w) {
  if (w.displayName && w.displayName.trim()) return w.displayName;
  const full = `${w.firstName || ""} ${w.lastName || ""}`.trim();
  return full || "Anonymous Writer";
}

function initialsFor(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";
}

export default function Writers() {
  const [writers, setWriters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    api
      .get(`${API}/api/auth/writers`)
      .then((res) => setWriters(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load writers. Please try again later."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="writers-page">
      <div className="writers-hero">
        <h1>Our Writers</h1>
        <hr className="writers-divider" />
        <p className="writers-intro">
          Meet the creators behind the books, articles, poems, and podcasts on Saat Saheli.
        </p>
      </div>

      {loading && <p className="writers-status">Loading writers…</p>}
      {error && <p className="writers-status writers-error">{error}</p>}
      {!loading && !error && writers.length === 0 && (
        <p className="writers-status">No writers have published yet — be the first!</p>
      )}

      <div className="writers-grid">
        {writers.map((w) => {
          const name = displayNameFor(w);
          const img = resolveImageUrl(w.profileImageUrl);
          return (
            <Link
              key={w.id}
              to={profileUrl(w.id, name)}
              className="writer-card"
              aria-label={`View profile for ${name}`}
            >
              <div className="writer-avatar">
                {img ? (
                  <img src={img} alt="" loading="lazy" />
                ) : (
                  <span className="writer-avatar-initials" aria-hidden="true">
                    {initialsFor(name)}
                  </span>
                )}
              </div>
              <div className="writer-meta">
                <div className="writer-name">{name}</div>
                {w.headline && <div className="writer-headline">{w.headline}</div>}
                {w.location && <div className="writer-location">{w.location}</div>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
