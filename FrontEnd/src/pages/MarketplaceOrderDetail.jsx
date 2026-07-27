import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { optimizeCloudinary } from "../utils/imageUrl";
import { getTrackingUrl } from "../utils/trackingUrl";
import "./Marketplace.css";
import "./Cart.css";
import "./MarketplaceOrders.css";

const API = process.env.REACT_APP_API_URL || "";
const CURRENCY_SYMBOL = { inr: "₹", usd: "$" };

function money(amount, currency) {
  const sym = CURRENCY_SYMBOL[(currency || "").toLowerCase()] || "";
  const n = Number(amount || 0);
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MarketplaceOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    api.get(`${API}/api/marketplace/orders/${id}`)
      .then((res) => { setOrder(res.data); setState("ready"); })
      .catch(() => setState("error"));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!window.confirm("Cancel this order and get a refund? This can't be undone.")) return;
    setCancelling(true);
    setMessage("");
    try {
      const res = await api.post(`${API}/api/marketplace/orders/${id}/cancel`, {});
      setOrder(res.data);
      setMessage("Order cancelled — your refund has been issued to your original payment method.");
    } catch (err) {
      setMessage(err.response?.data?.error || "Could not cancel this order.");
    } finally {
      setCancelling(false);
    }
  };

  if (state === "loading") return <div className="mp-page"><p>Loading order…</p></div>;
  if (state === "error" || !order) {
    return (
      <div className="mp-page">
        <div className="mp-section-card ord-empty">
          <p>We couldn't load this order.</p>
          <Link to="/marketplace/orders" className="bm-btn bm-btn-create">Back to my orders</Link>
        </div>
      </div>
    );
  }

  const ship = order.shipName || order.shipLine1;

  return (
    <div className="mp-page">
      <button className="cart-continue" onClick={() => navigate("/marketplace/orders")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        ← All orders
      </button>
      <h1 style={{ marginTop: 8 }}>Order {order.orderNumber}</h1>

      <div className="mp-section-card">
        <div className="ord-detail-head">
          <span className={`ord-badge ord-badge-${(order.status || "").toLowerCase()}`}>{order.status}</span>
          <span className="ord-detail-date">Placed {order.createdDate?.slice(0, 16)}</span>
        </div>

        {message && <div className="mp-message" role="status">{message}</div>}

        <div className="cart-list" style={{ marginTop: 16 }}>
          {(order.items || []).map((it) => (
            <div key={it.id || it.listingId} className="cart-row">
              <div className="cart-row-img">
                {it.imageUrl ? (
                  <img src={optimizeCloudinary(it.imageUrl)} alt={it.title} />
                ) : (
                  <div className="cart-row-img-ph" />
                )}
              </div>
              <div className="cart-row-main">
                <div className="cart-row-title">
                  {it.listingId
                    ? <Link to={`/marketplace/item/${it.listingId}`} className="mp-card-title-link">{it.title}</Link>
                    : it.title}
                </div>
                {it.listingId && (
                  <Link to={`/marketplace/item/${it.listingId}`} className="ord-item-link">View listing →</Link>
                )}
              </div>
              <div className="cart-row-price">{money(it.priceAmount, it.currency || order.currency)}</div>
            </div>
          ))}
        </div>

        <div className="cart-summary" style={{ alignItems: "stretch" }}>
          <div className="cart-summary-row" style={{ maxWidth: "none" }}>
            <span>Total {order.status === "CANCELLED" ? "(refunded)" : "paid"}</span>
            <strong>{money(order.subtotal, order.currency)}</strong>
          </div>
        </div>

        {/* Shipping */}
        {ship && (
          <div className="ord-block">
            <h3>Shipping to</h3>
            <p>
              {order.shipName}<br />
              {order.shipLine1}{order.shipLine2 ? `, ${order.shipLine2}` : ""}<br />
              {[order.shipCity, order.shipState, order.shipPostalCode].filter(Boolean).join(", ")}<br />
              {order.shipCountry}
            </p>
          </div>
        )}

        {/* Tracking */}
        <div className="ord-block">
          <h3>Tracking</h3>
          <p>
            {order.trackingNumber
              ? <>
                  <a
                    href={getTrackingUrl(order.trackingCarrier, order.trackingNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ord-tracking-link"
                  >
                    {order.trackingNumber}
                  </a>
                  {order.trackingCarrier ? ` (${order.trackingCarrier})` : ""}
                  {" — "}
                  <a
                    href={getTrackingUrl(order.trackingCarrier, order.trackingNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ord-tracking-link"
                  >
                    Track package →
                  </a>
                </>
              : order.status === "CANCELLED"
                ? "Not applicable — this order was cancelled."
                : "Pending — you'll get an update when your order ships."}
          </p>
        </div>

        {/* Refund note */}
        {order.status === "CANCELLED" && (
          <div className="ord-block ord-block-refund">
            <h3>Refund</h3>
            <p>This order was cancelled and refunded to your original payment method.</p>
          </div>
        )}

        {/* Cancel action */}
        {order.cancellable ? (
          <div className="ord-cancel-zone">
            <button className="bm-btn bm-btn-delete" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel order & refund"}
            </button>
            <span className="ord-cancel-hint">Free cancellation while your order hasn't shipped (within 24 hours).</span>
          </div>
        ) : order.status === "PAID" && order.cancelBlockedReason ? (
          <p className="ord-cancel-blocked">{order.cancelBlockedReason} — contact support for help.</p>
        ) : null}
      </div>
    </div>
  );
}
