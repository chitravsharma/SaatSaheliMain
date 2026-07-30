import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { optimizeCloudinary } from "../utils/imageUrl";
import "./Marketplace.css";
import "./MarketplaceOrders.css";

const API = process.env.REACT_APP_API_URL || "";
const CURRENCY_SYMBOL = { inr: "₹", usd: "$" };

function money(amount, currency) {
  const sym = CURRENCY_SYMBOL[(currency || "").toLowerCase()] || "";
  const n = Number(amount || 0);
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_CLASS = {
  PENDING: "ord-badge-pending",
  PAID: "ord-badge-paid",
  SHIPPED: "ord-badge-shipped",
  CANCELLED: "ord-badge-cancelled",
  EXPIRED: "ord-badge-expired",
};

export default function MarketplaceOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const copyId = async (e, o) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(o.orderNumber);
      setCopiedId(o.id);
      setTimeout(() => setCopiedId((c) => (c === o.id ? null : c)), 1500);
    } catch { /* clipboard unavailable */ }
  };

  useEffect(() => {
    let cancelled = false;
    api.get(`${API}/api/marketplace/orders`)
      .then((res) => { if (!cancelled) setOrders(Array.isArray(res.data) ? res.data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mp-page">
      <h1>My Orders</h1>
      <div className="mp-section-card">
        {loading ? (
          <p>Loading your orders…</p>
        ) : orders.length === 0 ? (
          <div className="ord-empty">
            <p>You haven't placed any orders yet.</p>
            <Link to="/marketplace/browse" className="bm-btn bm-btn-create">Start shopping</Link>
          </div>
        ) : (
          <div className="ord-list">
            {orders.map((o) => (
              <Link key={o.id} to={`/marketplace/orders/${o.id}`} className="ord-row">
                <div className="ord-row-thumb">
                  {o.items?.[0]?.imageUrl ? (
                    <img src={optimizeCloudinary(o.items[0].imageUrl)} alt="" />
                  ) : (
                    <div className="ord-row-thumb-ph" />
                  )}
                </div>
                <div className="ord-row-main">
                  <div className="ord-row-number">
                    {o.orderNumber}
                    <button type="button" className="ord-copy-btn" onClick={(e) => copyId(e, o)} title="Copy order ID" aria-label="Copy order ID">
                      {copiedId === o.id ? "✓" : "⧉"}
                    </button>
                  </div>
                  <div className="ord-row-items">
                    {(o.items || []).map((it) => it.title).filter(Boolean).join(", ") || "Order"}
                  </div>
                  <div className="ord-row-meta">
                    {o.createdDate?.slice(0, 10)} · {o.items?.length || 0} item{(o.items?.length || 0) === 1 ? "" : "s"}
                  </div>
                </div>
                <span className={`ord-badge ${STATUS_CLASS[o.status] || ""}`}>{o.status}</span>
                <div className="ord-row-total">{money(o.total != null ? o.total : o.subtotal, o.currency)}</div>
                <span className="ord-row-arrow">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
