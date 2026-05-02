import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { profileUrl } from "../utils/api";
import { optimizeCloudinary } from "../utils/imageUrl";
import "./Writers.css";

const API = process.env.REACT_APP_API_URL;

// Filter tabs — each matches a set of content types on the backend.
const FILTERS = [
  { key: "all",    label: "All",           heading: "All Creators",     intro: "Meet the creators behind all kind of content on Saat Saheli.",                   contentTypes: null },
  { key: "writer", label: "Writers",       heading: "Our Writers",      intro: "Meet the creators behind the books, articles, and blogs on Saat Saheli.",        contentTypes: ["book", "article", "blog"] },
  { key: "poet",   label: "Poets",         heading: "Our Poets",        intro: "Meet the poets behind the verses on Saat Saheli.",                                contentTypes: ["poem"] },
  { key: "cook",   label: "Cooks",         heading: "Our Cooks",        intro: "Meet the cooks sharing their recipes on Saat Saheli.",                            contentTypes: ["recipe"] },
  { key: "artist", label: "Artists",       heading: "Our Artists",      intro: "Meet the artists behind the photo galleries on Saat Saheli.",                     contentTypes: ["gallery"] },
];

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
  return optimizeCloudinary(url);
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
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter comes from ?type= query param. Fallback to "all".
  const activeKey = (() => {
    const raw = (searchParams.get("type") || "all").toLowerCase();
    return FILTERS.some(f => f.key === raw) ? raw : "all";
  })();
  const activeFilter = FILTERS.find(f => f.key === activeKey);

  useEffect(() => {
    window.scrollTo(0, 0);
    api
      .get(`${API}/api/auth/writers`)
      .then((res) => setWriters(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Failed to load creators. Please try again later."))
      .finally(() => setLoading(false));
  }, []);

  const filteredWriters = useMemo(() => {
    if (!activeFilter.contentTypes) return writers;
    return writers.filter(w => {
      const types = w.contentTypes || [];
      return activeFilter.contentTypes.some(t => types.includes(t));
    });
  }, [writers, activeFilter]);

  const switchFilter = (key) => {
    if (key === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ type: key });
    }
  };

  return (
    <div className="writers-page">
      <div className="writers-hero">
        <h1>{activeFilter.heading}</h1>
        <hr className="writers-divider" />
        <p className="writers-intro">{activeFilter.intro}</p>
        <div className="writers-filter-tabs" role="tablist" aria-label="Filter creators">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={activeKey === f.key}
              className={`writers-filter-tab ${activeKey === f.key ? "active" : ""}`}
              onClick={() => switchFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="writers-status">Loading…</p>}
      {error && <p className="writers-status writers-error">{error}</p>}
      {!loading && !error && filteredWriters.length === 0 && (
        <p className="writers-status">
          {activeKey === "all"
            ? "No creators have published yet — be the first!"
            : `No ${activeFilter.label.toLowerCase()} yet.`}
        </p>
      )}

      <div className="writers-grid">
        {filteredWriters.map((w) => {
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
