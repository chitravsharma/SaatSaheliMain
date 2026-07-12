import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { optimizeCloudinary } from "../utils/imageUrl";
import "./Marketplace.css";
import "./Cart.css";

const CURRENCY_SYMBOL = { inr: "₹", usd: "$" };

function money(amount, currency) {
  const sym = CURRENCY_SYMBOL[(currency || "").toLowerCase()] || "";
  const n = Number(amount || 0);
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Cart() {
  const { items, loading, removeFromCart, refresh } = useCart();
  const navigate = useNavigate();

  useEffect(() => { refresh(); }, [refresh]);

  // Only ACTIVE, priced listings count toward the order.
  const buyable = items.filter(
    (it) => it.listing && it.listing.status === "ACTIVE" && it.listing.priceAmount != null
      && (it.listing.quantity == null || it.listing.quantity > 0)
  );
  const unavailable = items.filter((it) => !buyable.includes(it));
  const currency = buyable[0]?.listing?.currency || "inr";
  const subtotal = buyable.reduce((sum, it) => sum + Number(it.listing.priceAmount || 0), 0);

  return (
    <div className="mp-page">
      <h1>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 8 }}>
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
        </svg>
        Your Cart
      </h1>

      <div className="mp-section-card">
        {loading && items.length === 0 ? (
          <p>Loading your cart…</p>
        ) : items.length === 0 ? (
          <div className="cart-empty">
            <p>Your cart is empty.</p>
            <Link to="/marketplace" className="bm-btn bm-btn-create">Browse the Marketplace</Link>
          </div>
        ) : (
          <>
            <div className="cart-list">
              {items.map((it) => {
                const l = it.listing || {};
                const avail = l.status === "ACTIVE" && l.priceAmount != null;
                return (
                  <div key={it.listingId} className={`cart-row${avail ? "" : " cart-row-unavailable"}`}>
                    <div className="cart-row-img">
                      {l.image1Url ? (
                        <img src={optimizeCloudinary(l.image1Url)} alt={l.title} />
                      ) : (
                        <div className="cart-row-img-ph" />
                      )}
                    </div>
                    <div className="cart-row-main">
                      <div className="cart-row-title">{l.title || "Listing"}</div>
                      <div className="cart-row-meta">
                        {l.category} · {l.condition}
                        {l.sellerName ? ` · by ${l.sellerName}` : ""}
                      </div>
                      {!avail && (
                        <div className="cart-row-warn">No longer available — will be removed at checkout.</div>
                      )}
                    </div>
                    <div className="cart-row-price">
                      {l.priceAmount != null ? money(l.priceAmount, l.currency) : "—"}
                    </div>
                    <button
                      className="bm-btn bm-btn-delete bm-btn-sm"
                      onClick={() => removeFromCart(it.listingId)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>

            {unavailable.length > 0 && (
              <p className="cart-note">
                {unavailable.length} item{unavailable.length > 1 ? "s are" : " is"} no longer available and
                won't be charged.
              </p>
            )}

            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal ({buyable.length} item{buyable.length === 1 ? "" : "s"})</span>
                <strong>{money(subtotal, currency)}</strong>
              </div>
              <button
                className="bm-btn bm-btn-create cart-checkout-btn"
                disabled={buyable.length === 0}
                onClick={() => navigate("/marketplace/checkout")}
              >
                Proceed to Checkout
              </button>
              <Link to="/marketplace" className="cart-continue">← Continue shopping</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
