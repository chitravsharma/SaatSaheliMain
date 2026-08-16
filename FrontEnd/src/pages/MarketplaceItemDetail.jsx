import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { optimizeCloudinary } from "../utils/imageUrl";
import { useAuth } from "../AuthContext";
import { useCart } from "../contexts/CartContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { useRegion } from "../contexts/RegionContext";
import ContactToBuy from "../components/ContactToBuy";
import SellerLink from "../components/SellerLink";
import "./Marketplace.css";
import "./MarketplaceItemDetail.css";

const API = process.env.REACT_APP_API_URL || "";

export default function MarketplaceItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.userId;
  const { isInCart, addToCart, removeFromCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isIndia } = useRegion();

  const [item, setItem] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [message, setMessage] = useState("");
  const [activeImg, setActiveImg] = useState(0);
  const [brokenImgs, setBrokenImgs] = useState({});
  const [shareCopied, setShareCopied] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const load = useCallback(() => {
    setState("loading");
    api.get(`${API}/api/marketplace/${id}`)
      .then((res) => { setItem(res.data); setState("ready"); })
      .catch(() => setState("error"));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <div className="mp-page"><p>Loading…</p></div>;
  if (state === "error" || !item) {
    return (
      <div className="mp-page">
        <p className="mp-empty">Sorry, we couldn't find this item. It may have been removed.</p>
        <Link to="/marketplace/browse" className="bm-btn bm-btn-back">← Back to Shop</Link>
      </div>
    );
  }

  const images = [item.image1Url, item.image2Url, item.image3Url, item.image4Url].filter(Boolean);
  const isOwner = !!userId && item.userId === userId;
  const qty = item.quantity == null ? 0 : item.quantity;
  // India can't check out online yet → show "Contact us to buy" instead of
  // price/cart (also covers any deliberately price-less "contact-only" listing).
  const contactToBuy = isIndia || item.priceAmount == null;
  const soldOut = !contactToBuy && item.status === "ACTIVE" && item.priceAmount != null && qty <= 0;
  const purchasable = !contactToBuy && !!userId && item.status === "ACTIVE" && item.priceAmount != null && qty > 0;
  const faved = isFavorite(item.id);
  const say = (m) => m && setMessage(m);

  const handleCart = async () => {
    if (!userId) return say("Please log in to add items to your cart");
    const res = isInCart(item.id) ? await removeFromCart(item.id) : await addToCart(item.id);
    if (!res.ok && res.error) say(res.error);
  };

  const handleFav = async () => {
    if (!userId) return say("Please log in to save favorites");
    const res = await toggleFavorite(item.id);
    if (!res.ok && res.error) say(res.error);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Check out "${item.title}" for ${item.price} on Sarayu Shop!`;
    if (navigator.share) {
      try { await navigator.share({ title: item.title, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const showImg = images.length > 0 && !brokenImgs[activeImg];

  return (
    <div className="mp-page mp-detail">
      <Link to="/marketplace/browse" className="mp-detail-back">← Back to Shop</Link>

      {message && <div className="mp-message" onClick={() => setMessage("")} role="status">{message}</div>}

      <div className="mp-detail-grid">
        {/* Gallery */}
        <div className="mp-detail-gallery">
          <div className="mp-detail-main-img">
            {showImg ? (
              <img
                src={optimizeCloudinary(images[activeImg])}
                alt={item.title}
                onClick={() => { setZoom(1); setZoomOpen(true); }}
                onError={() => setBrokenImgs((b) => ({ ...b, [activeImg]: true }))}
              />
            ) : (
              <div className="mp-detail-img-placeholder">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#c98a6a" strokeWidth="1.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
            )}
            {item.status === "SOLD" && <span className="mp-detail-sold">Sold</span>}
          </div>
          {images.length > 1 && (
            <div className="mp-detail-thumbs">
              {images.map((img, i) => (
                <button
                  key={i}
                  className={"mp-detail-thumb" + (i === activeImg ? " active" : "")}
                  onClick={() => setActiveImg(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  <img src={optimizeCloudinary(img)} alt={`${item.title} ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mp-detail-info">
          <h1 className="mp-detail-title">{item.title}</h1>
          {!contactToBuy && <div className="mp-detail-price">{item.price}</div>}
          {!contactToBuy && (() => {
            const isMag = (item.category || "").toLowerCase() === "magazine";
            const fee = isMag ? 0 : Number(item.deliveryFee || 0);
            const sym = (item.currency || "").toLowerCase() === "usd" ? "$" : "₹";
            return (
              <div className="mp-detail-delivery" style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: 4 }}>
                {fee > 0 ? `+ ${sym}${fee.toFixed(2)} delivery` : "Free delivery"}
              </div>
            );
          })()}

          <div className="mp-card-meta">
            {item.category && <span className="mp-card-badge mp-badge-category">{item.category}</span>}
            {item.condition && <span className="mp-card-badge mp-badge-condition">{item.condition}</span>}
            {soldOut && <span className="mp-card-badge mp-badge-sold">Sold out</span>}
            {purchasable && qty <= 5 && <span className="mp-card-badge mp-badge-stock">Only {qty} left</span>}
          </div>

          <p className="mp-detail-seller">Sold by <SellerLink /></p>

          {item.description && (
            <div className="mp-detail-desc">
              <h2>Description</h2>
              <p>{item.description}</p>
            </div>
          )}

          <div className="mp-detail-actions">
            {contactToBuy && <ContactToBuy />}
            {purchasable && !isOwner && (
              <button
                className={isInCart(item.id) ? "bm-btn bm-btn-back" : "bm-btn bm-btn-create"}
                onClick={handleCart}
              >
                {isInCart(item.id) ? "In Cart — Remove" : "Add to Cart"}
              </button>
            )}
            {soldOut && !isOwner && (
              <button className="bm-btn bm-btn-back" disabled>Sold out</button>
            )}
            {purchasable && !isOwner && isInCart(item.id) && (
              <button className="bm-btn bm-btn-create" onClick={() => navigate("/marketplace/cart")}>
                Go to Cart →
              </button>
            )}
            <button className="mp-share-btn" onClick={handleFav}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill={faved ? "#c04d6e" : "none"} stroke="#c04d6e" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/></svg>
              {faved ? "Saved" : "Save"}
            </button>
            <button className="mp-share-btn" onClick={handleShare}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              {shareCopied ? "Copied!" : "Share"}
            </button>
          </div>

          {!contactToBuy && !userId && (
            <p className="mp-detail-login-hint">
              <Link to={`/Login?redirect=/marketplace/item/${item.id}`}>Log in</Link> to buy or save this item.
            </p>
          )}

          <div className="mp-disclaimer mp-detail-disclaimer">
            Sold and shipped by Avika Ventures. Secure Stripe checkout with free cancellation within 24 hours (before shipping).
            <Link to="/marketplace/terms" className="mp-policy-link"> Terms</Link>
            <Link to="/marketplace/shipping" className="mp-policy-link"> Shipping &amp; Returns</Link>
          </div>
        </div>
      </div>

      {zoomOpen && showImg && (
        <div className="mp-lightbox" onClick={() => setZoomOpen(false)} role="dialog" aria-modal="true" aria-label="Image zoom">
          <div className="mp-lightbox-controls" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(2)))} aria-label="Zoom out">−</button>
            <span className="mp-lightbox-level">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(5, +(z + 0.5).toFixed(2)))} aria-label="Zoom in">+</button>
            <button onClick={() => setZoom(1)} aria-label="Reset zoom">Reset</button>
            <button className="mp-lightbox-close" onClick={() => setZoomOpen(false)} aria-label="Close">✕</button>
          </div>
          <div className="mp-lightbox-imgwrap" onClick={(e) => e.stopPropagation()}>
            <img
              src={optimizeCloudinary(images[activeImg])}
              alt={item.title}
              className="mp-lightbox-img"
              style={zoom > 1 ? { width: `${zoom * 100}%`, maxWidth: "none", maxHeight: "none" } : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}
