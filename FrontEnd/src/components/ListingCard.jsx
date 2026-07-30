import React, { useState } from "react";
import { Link } from "react-router-dom";
import { optimizeCloudinary } from "../utils/imageUrl";
import { useAuth } from "../AuthContext";
import { useCart } from "../contexts/CartContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { useRegion } from "../contexts/RegionContext";
import ContactToBuy from "./ContactToBuy";

/**
 * Canonical storefront listing card: image, title, price, badges, favorite heart,
 * Add to Cart, and Share. `ownerActions` (optional) renders admin Edit/Remove.
 * `onMessage` surfaces a short status string to the parent page.
 */
export default function ListingCard({ item, ownerActions = null, onMessage }) {
  const { user } = useAuth();
  const userId = user?.userId;
  const { isInCart, addToCart, removeFromCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isIndia } = useRegion();
  const [shareCopied, setShareCopied] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

  const detailUrl = `/marketplace/item/${item.id}`;
  const isOwner = !!userId && item.userId === userId;
  const qty = item.quantity == null ? 0 : item.quantity;
  const contactToBuy = isIndia || item.priceAmount == null;
  const soldOut = !contactToBuy && item.status === "ACTIVE" && item.priceAmount != null && qty <= 0;
  const purchasable = !contactToBuy && !!userId && item.status === "ACTIVE" && item.priceAmount != null && qty > 0;
  const faved = isFavorite(item.id);

  const say = (m) => onMessage && m && onMessage(m);

  const handleCart = async () => {
    if (!userId) return say("Please log in to add items to your cart");
    const res = isInCart(item.id) ? await removeFromCart(item.id) : await addToCart(item.id);
    if (!res.ok && res.error) say(res.error);
  };

  const handleFav = async () => {
    const res = await toggleFavorite(item.id);
    if (!res.ok && res.error) say(res.error);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/marketplace/browse`;
    const text = `Check out "${item.title}" for ${item.price} on Sarayu Shop!`;
    if (navigator.share) {
      try { await navigator.share({ title: item.title, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <div className="mp-card">
      <div className="mp-card-images">
        <Link to={detailUrl} className="mp-card-img-link" aria-label={`View ${item.title}`}>
          {item.image1Url && !imgBroken ? (
            <img
              src={optimizeCloudinary(item.image1Url)}
              alt={item.title}
              className="mp-card-img"
              loading="lazy"
              onError={() => setImgBroken(true)}
            />
          ) : (
            <div className="mp-card-img-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
          )}
        </Link>
        {user && (
          <button
            className={"mp-fav-btn" + (faved ? " active" : "")}
            onClick={handleFav}
            aria-label={faved ? "Remove from favorites" : "Add to favorites"}
            title={faved ? "Remove from favorites" : "Add to favorites"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={faved ? "#c04d6e" : "none"} stroke="#c04d6e" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 10-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/></svg>
          </button>
        )}
      </div>
      <div className="mp-card-info">
        <div className="mp-card-header">
          <h3 className="mp-card-title"><Link to={detailUrl} className="mp-card-title-link">{item.title}</Link></h3>
          {!contactToBuy && <span className="mp-card-price">{item.price}</span>}
        </div>
        {item.description && <p className="mp-card-desc">{item.description}</p>}
        <div className="mp-card-meta">
          <span className="mp-card-badge mp-badge-category">{item.category}</span>
          <span className="mp-card-badge mp-badge-condition">{item.condition}</span>
          {soldOut && <span className="mp-card-badge mp-badge-sold">Sold out</span>}
          {purchasable && qty <= 5 && <span className="mp-card-badge mp-badge-stock">Only {qty} left</span>}
        </div>
        {item.sellerName && <span className="mp-card-seller">by {item.sellerName}</span>}
        <div className="mp-card-actions">
          {contactToBuy && !isOwner && <ContactToBuy compact />}
          {purchasable && !isOwner && (
            <button
              className={isInCart(item.id) ? "bm-btn bm-btn-back bm-btn-sm" : "bm-btn bm-btn-create bm-btn-sm"}
              onClick={handleCart}
            >
              {isInCart(item.id) ? "In Cart — Remove" : "Add to Cart"}
            </button>
          )}
          {soldOut && !isOwner && (
            <button className="bm-btn bm-btn-back bm-btn-sm" disabled>Sold out</button>
          )}
          <button className="mp-share-btn" onClick={handleShare}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {shareCopied ? "Copied!" : "Share"}
          </button>
          {ownerActions}
        </div>
      </div>
    </div>
  );
}
