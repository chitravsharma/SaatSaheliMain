import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../AuthContext";
import { useRegion } from "../contexts/RegionContext";
import ContactToBuy from "../components/ContactToBuy";
import "./Marketplace.css";
import "./Cart.css";

const API = process.env.REACT_APP_API_URL || "";
const CURRENCY_SYMBOL = { inr: "₹", usd: "$" };

function money(amount, currency) {
  const sym = CURRENCY_SYMBOL[(currency || "").toLowerCase()] || "";
  const n = Number(amount || 0);
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MarketplaceCheckout() {
  const { items, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { refresh(); }, [refresh]);

  const buyable = items.filter(
    (it) => it.listing && it.listing.status === "ACTIVE" && it.listing.priceAmount != null
      && (it.listing.quantity == null || it.listing.quantity > 0)
  );
  const currency = buyable[0]?.listing?.currency || "inr";
  const subtotal = buyable.reduce((sum, it) => sum + Number(it.listing.priceAmount || 0), 0);
  const { isIndia } = useRegion();
  // Delivery = sum of each item's per-listing fee; magazines ship free. Mirrors
  // the server calc in MarketplaceCheckoutController.perItemDelivery.
  const delivery = buyable.reduce(
    (sum, it) => sum + ((it.listing.category || "").toLowerCase() === "magazine" ? 0 : Number(it.listing.deliveryFee || 0)),
    0
  );
  const total = subtotal + delivery;

  const handlePay = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post(`${API}/api/marketplace/checkout/create-session`, {});
      if (res.data?.url) {
        window.location.href = res.data.url; // redirect to Stripe hosted checkout
      } else {
        setError("Could not start payment. Please try again.");
        setSubmitting(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Could not start payment. Please try again.");
      setSubmitting(false);
    }
  };

  if (isIndia) {
    return (
      <div className="mp-page">
        <h1>Checkout</h1>
        <div className="mp-section-card ord-empty">
          <p>Online checkout isn’t available in your region yet.</p>
          <ContactToBuy />
        </div>
      </div>
    );
  }

  return (
    <div className="mp-page">
      <h1>Checkout</h1>

      <div className="mp-section-card">
        {buyable.length === 0 ? (
          <div className="cart-empty">
            <p>You have no items to check out.</p>
            <Link to="/marketplace" className="bm-btn bm-btn-create">Browse the Marketplace</Link>
          </div>
        ) : (
          <>
            <h2 style={{ marginTop: 0 }}>Order Summary</h2>
            <div className="cart-list">
              {buyable.map((it) => (
                <div key={it.listingId} className="cart-row">
                  <div className="cart-row-main">
                    <div className="cart-row-title">{it.listing.title}</div>
                    <div className="cart-row-meta">{it.listing.category} · {it.listing.condition}</div>
                  </div>
                  <div className="cart-row-price">{money(it.listing.priceAmount, it.listing.currency)}</div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal ({buyable.length} item{buyable.length === 1 ? "" : "s"})</span>
                <strong>{money(subtotal, currency)}</strong>
              </div>
              <div className="cart-summary-row">
                <span>Delivery</span>
                <strong>{delivery > 0 ? money(delivery, currency) : "Free"}</strong>
              </div>
              <div className="cart-summary-row cart-summary-total">
                <span>Total</span>
                <strong>{money(total, currency)}</strong>
              </div>
              <p className="cart-tax-note">Prices include all applicable taxes.</p>
              <p className="checkout-buyer-note">
                Receipt & confirmation will be sent to <strong>{user?.email}</strong>.
              </p>
              {error && <div className="mp-message" role="alert">{error}</div>}
              <button className="bm-btn bm-btn-create cart-checkout-btn" onClick={handlePay} disabled={submitting}>
                {submitting ? "Redirecting to secure payment…" : "Proceed to Payment"}
              </button>
              <button className="cart-continue" onClick={() => navigate("/marketplace/cart")} style={{ background: "none", border: "none", cursor: "pointer" }}>
                ← Back to cart
              </button>
              <p className="checkout-secure-note">🔒 Secure payment via Stripe. You'll be redirected to complete your purchase.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
