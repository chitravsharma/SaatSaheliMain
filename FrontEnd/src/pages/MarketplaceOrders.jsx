import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
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
};

export default function MarketplaceOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
                <div className="ord-row-main">
                  <div className="ord-row-number">{o.orderNumber}</div>
                  <div className="ord-row-meta">
                    {o.createdDate?.slice(0, 10)} · {o.items?.length || 0} item{(o.items?.length || 0) === 1 ? "" : "s"}
                  </div>
                </div>
                <span className={`ord-badge ${STATUS_CLASS[o.status] || ""}`}>{o.status}</span>
                <div className="ord-row-total">{money(o.subtotal, o.currency)}</div>
                <span className="ord-row-arrow">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
