import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import ListingCard from "../components/ListingCard";
import { useFavorites } from "../contexts/FavoritesContext";
import "./Marketplace.css";

const API = process.env.REACT_APP_API_URL || "";

export default function MarketplaceFavorites() {
  const { favoriteIds, refresh } = useFavorites();
  const [listingsById, setListingsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const fetchedRef = useRef(new Set());

  // Load the favorites list once on mount.
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Hydrate listing details for any favorited id we haven't fetched yet.
  useEffect(() => {
    const toFetch = [...favoriteIds].filter((id) => !fetchedRef.current.has(id));
    if (toFetch.length === 0) return;
    toFetch.forEach((id) => fetchedRef.current.add(id));
    Promise.all(
      toFetch.map((id) =>
        api.get(`${API}/api/marketplace/${id}`).then((r) => r.data).catch(() => null)
      )
    ).then((results) => {
      setListingsById((prev) => {
        const next = { ...prev };
        results.forEach((l) => { if (l && l.id) next[l.id] = l; });
        return next;
      });
    });
  }, [favoriteIds]);

  const items = [...favoriteIds].map((id) => listingsById[id]).filter(Boolean);

  return (
    <div className="mp-page">
      <h1>My Favorites</h1>
      {message && <div className="mp-message" onClick={() => setMessage("")} role="status">{message}</div>}
      <div className="mp-section-card">
        {loading ? (
          <p>Loading your favorites…</p>
        ) : favoriteIds.size === 0 ? (
          <div className="cart-empty" style={{ textAlign: "center", padding: "32px 16px" }}>
            <p>You haven't saved any favorites yet. Tap the ♥ on any item to save it here.</p>
            <Link to="/marketplace/browse" className="bm-btn bm-btn-create">Browse items</Link>
          </div>
        ) : items.length === 0 ? (
          <p>Loading item details…</p>
        ) : (
          <div className="mp-grid">
            {items.map((item) => (
              <ListingCard key={item.id} item={item} onMessage={setMessage} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
