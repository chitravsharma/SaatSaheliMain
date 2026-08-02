import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import ListingCard from "../components/ListingCard";
import "./Marketplace.css";
import "./MarketplaceHome.css";

const API = process.env.REACT_APP_API_URL || "";

const CATEGORIES = [
  { name: "Books", emoji: "📚", color: "books" },
  { name: "Art", emoji: "🎨", color: "art" },
  { name: "Crafts", emoji: "🧶", color: "crafts" },
  { name: "Electronics", emoji: "🔌", color: "electronics" },
  { name: "Clothing", emoji: "👗", color: "clothing" },
  { name: "Services", emoji: "🛠️", color: "services" },
  { name: "Other", emoji: "✨", color: "other" },
];

export default function MarketplaceHome() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    api.get(`${API}/api/marketplace/active`)
      .then((res) => { if (!cancelled) setListings(Array.isArray(res.data) ? res.data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // `active` is returned newest-first (createdDate desc), so the first slice is
  // literally the most-recently-added items.
  const recentlyAdded = listings.slice(0, 8);
  const recentIds = new Set(recentlyAdded.map((i) => i.id));

  // Top picks: no "featured" flag exists yet, so we surface the items most
  // likely to convert — in stock and with a photo. Prefer ones not already in
  // "Recently added" so the two bands differ when the catalog is large enough;
  // fall back to overlap on a small catalog rather than showing an empty band.
  const inStock = (i) => i.quantity == null || Number(i.quantity) > 0;
  const picksPool = listings.filter((i) => i.image1Url && inStock(i));
  const topPicks = [
    ...picksPool.filter((i) => !recentIds.has(i.id)),
    ...picksPool.filter((i) => recentIds.has(i.id)),
  ].slice(0, 8);

  // Anything not already surfaced above rounds out a "Fresh finds" band below.
  const shownIds = new Set([...recentIds, ...topPicks.map((i) => i.id)]);
  const freshFinds = listings.filter((i) => !shownIds.has(i.id)).slice(0, 8);

  const renderGrid = (items) => (
    <div className="mp-grid">
      {items.map((item) => (
        <ListingCard key={item.id} item={item} onMessage={setMessage} />
      ))}
    </div>
  );

  return (
    <div className="shop-home">
      {/* Hero */}
      <section className="shop-hero">
        <div className="shop-hero-text">
          <h1>Sarayu <em>Shop</em></h1>
          <p className="shop-hero-tagline">Little finds, big joy.</p>
          <p>Handpicked books, art, crafts and more — thoughtfully curated, sold and shipped by Avika Ventures.</p>
          <div className="shop-hero-cta">
            <Link to="/marketplace/browse" className="bm-btn bm-btn-create">Shop all items</Link>
            <Link to="/marketplace/orders" className="bm-btn bm-btn-back">Track my orders</Link>
          </div>
          <div className="shop-hero-badges">
            <span className="shop-hero-badge">🚚 Secure checkout</span>
            <span className="shop-hero-badge">↩️ Easy 24-hr cancellations</span>
            <span className="shop-hero-badge">💛 Curated with care</span>
          </div>
        </div>
      </section>

      {message && <div className="mp-message" onClick={() => setMessage("")} role="status">{message}</div>}

      {/* Recently added — right after the hero */}
      <section className="shop-section">
        <div className="shop-section-head">
          <h2>Recently added</h2>
          <Link to="/marketplace/browse" className="shop-see-all">See all →</Link>
        </div>
        {loading ? (
          <p>Loading…</p>
        ) : recentlyAdded.length === 0 ? (
          <p className="mp-empty">No items yet. Check back soon!</p>
        ) : (
          renderGrid(recentlyAdded)
        )}
      </section>

      {/* Top picks */}
      {!loading && topPicks.length > 0 && (
        <section className="shop-section">
          <div className="shop-section-head">
            <h2>Top picks</h2>
            <Link to="/marketplace/browse" className="shop-see-all">See all →</Link>
          </div>
          {renderGrid(topPicks)}
        </section>
      )}

      {/* Categories */}
      <section className="shop-section">
        <h2>Shop by category</h2>
        <div className="shop-cat-grid">
          {CATEGORIES.map((c) => (
            <button
              key={c.name}
              className={`shop-cat-tile cat-${c.color}`}
              onClick={() => navigate(`/marketplace/browse?category=${encodeURIComponent(c.name)}`)}
            >
              <span className="shop-cat-emoji">{c.emoji}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Fresh finds — the remainder */}
      {!loading && freshFinds.length > 0 && (
        <section className="shop-section">
          <div className="shop-section-head">
            <h2>Fresh finds</h2>
            <Link to="/marketplace/browse" className="shop-see-all">See all →</Link>
          </div>
          {renderGrid(freshFinds)}
        </section>
      )}
    </div>
  );
}
