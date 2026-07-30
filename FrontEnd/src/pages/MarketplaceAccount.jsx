import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../AuthContext";
import { optimizeCloudinary } from "../utils/imageUrl";
import "./Marketplace.css";
import "./MarketplaceOrders.css";

const API = process.env.REACT_APP_API_URL || "";

/**
 * Shop-portal account view. Clicking "Account" in the shop header stays inside
 * the storefront (shop chrome) and shows the buyer's details + shop shortcuts,
 * instead of jumping to the full SaatSaheli creator account page.
 */
export default function MarketplaceAccount() {
  const { user, userPlan } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.userId) { setLoading(false); return; }
    let cancelled = false;
    api.get(`${API}/api/auth/user/${user.userId}`)
      .then((res) => { if (!cancelled) setProfile(res.data); })
      .catch(() => { /* fall back to the auth user object */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const fullName = (profile
    ? [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ")
    : "") || profile?.displayName || user?.name;
  const email = profile?.email || user?.email;
  const phone = profile?.phoneNumber;
  const location = profile?.location;
  const plan = profile?.plan || userPlan;
  const avatar = profile?.profileImageUrl;

  return (
    <div className="mp-page">
      <h1>My Account</h1>
      <div className="mp-section-card">
        {loading ? (
          <p>Loading your details…</p>
        ) : !user ? (
          <p>Please <Link to="/Login">log in</Link> to view your account.</p>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {avatar ? (
                <img src={optimizeCloudinary(avatar)} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fde9d2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#b45309" }}>
                  {(fullName || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{fullName || "Your account"}</div>
                {plan && (
                  <span style={{ display: "inline-block", marginTop: 4, fontSize: "0.75rem", fontWeight: 600, background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa", borderRadius: 999, padding: "2px 10px" }}>
                    {plan} plan
                  </span>
                )}
              </div>
            </div>

            <dl style={{ marginTop: 20, display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", maxWidth: 480 }}>
              <dt style={{ fontWeight: 600, color: "#6b7280" }}>Email</dt><dd style={{ margin: 0 }}>{email || "—"}</dd>
              <dt style={{ fontWeight: 600, color: "#6b7280" }}>Phone</dt><dd style={{ margin: 0 }}>{phone || "—"}</dd>
              <dt style={{ fontWeight: 600, color: "#6b7280" }}>Location</dt><dd style={{ margin: 0 }}>{location || "—"}</dd>
            </dl>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
              <Link to="/marketplace/orders" className="bm-btn bm-btn-create">My Orders</Link>
              <Link to="/marketplace/favorites" className="bm-btn bm-btn-create">Favorites</Link>
              <Link to="/marketplace/cart" className="bm-btn bm-btn-create">Cart</Link>
            </div>

            <p style={{ marginTop: 20, fontSize: "0.9rem" }}>
              <Link to="/account" className="ord-tracking-link">Manage your full profile on SaatSaheli →</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
