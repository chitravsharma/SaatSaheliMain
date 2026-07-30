import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../utils/api";
import { useCart } from "../contexts/CartContext";
import "./Marketplace.css";
import "./Cart.css";

const API = process.env.REACT_APP_API_URL || "";
const CURRENCY_SYMBOL = { inr: "₹", usd: "$" };

function money(amount, currency) {
  const sym = CURRENCY_SYMBOL[(currency || "").toLowerCase()] || "";
  const n = Number(amount || 0);
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrderConfirmation() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { refresh } = useCart();
  const [state, setState] = useState("loading"); // loading | success | pending | error
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!sessionId) { setState("error"); return; }
    let cancelled = false;
    api.get(`${API}/api/marketplace/checkout/verify-session`, { params: { sessionId } })
      .then((res) => {
        if (cancelled) return;
        const d = res.data || {};
        if (d.orderNumber && d.status === "PAID") {
          setOrder(d);
          setState("success");
          refresh(); // cart is now empty
        } else if (d.order) {
          setOrder(d.order);
          setState("pending");
        } else {
          setState("error");
        }
      })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [sessionId, refresh]);

  return (
    <div className="mp-page">
      <div className="mp-section-card" style={{ maxWidth: 620, margin: "0 auto" }}>
        {state === "loading" && <p>Confirming your order…</p>}

        {state === "error" && (
          <div className="cart-empty">
            <h2>We couldn't confirm this order</h2>
            <p>If you were charged, your confirmation email has the details. Otherwise please try again.</p>
            <Link to="/marketplace" className="bm-btn bm-btn-create">Back to Marketplace</Link>
          </div>
        )}

        {state === "pending" && (
          <div style={{ textAlign: "center" }}>
            <h2>Payment processing…</h2>
            <p>Your payment is being processed. You'll get a confirmation email once it completes
              {order?.orderNumber ? <> (order <strong>{order.orderNumber}</strong>)</> : null}.</p>
            <Link to="/marketplace" className="bm-btn bm-btn-create">Back to Marketplace</Link>
          </div>
        )}

        {state === "success" && order && (
          <>
            <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
              <div style={{ fontSize: "2.6rem" }}>✅</div>
              <h2 style={{ marginBottom: 4 }}>Thank you! Your order is confirmed.</h2>
            </div>

            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 16, textAlign: "center", margin: "16px 0" }}>
              <div style={{ color: "#92400e", fontSize: "0.8rem", letterSpacing: "0.05em" }}>CONFIRMATION NUMBER</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#78350f", letterSpacing: 1 }}>{order.orderNumber}</div>
            </div>

            <div className="cart-list">
              {(order.items || []).map((it) => (
                <div key={it.id || it.listingId} className="cart-row">
                  <div className="cart-row-main">
                    <div className="cart-row-title">{it.title}</div>
                  </div>
                  <div className="cart-row-price">{money(it.priceAmount, it.currency || order.currency)}</div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <strong>{money(order.subtotal, order.currency)}</strong>
              </div>
              {order.shipping != null && Number(order.shipping) > 0 && (
                <div className="cart-summary-row">
                  <span>Delivery</span>
                  <strong>{money(order.shipping, order.currency)}</strong>
                </div>
              )}
              <div className="cart-summary-row cart-summary-total">
                <span>Total paid</span>
                <strong>{money(order.total != null ? order.total : order.subtotal, order.currency)}</strong>
              </div>
              <p className="cart-tax-note">Prices include all applicable taxes.</p>
            </div>

            <div className="order-tracking">
              <strong>Tracking:</strong>{" "}
              {order.trackingNumber
                ? <>{order.trackingNumber}{order.trackingCarrier ? ` (${order.trackingCarrier})` : ""}</>
                : "Pending — you'll get an update when your order ships."}
            </div>

            <p style={{ color: "#6b7280", marginTop: 16 }}>
              A confirmation email has been sent to <strong>{order.buyerEmail}</strong>.
            </p>

            <div style={{ marginTop: 16 }}>
              <Link to="/marketplace" className="bm-btn bm-btn-create">Continue shopping</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
