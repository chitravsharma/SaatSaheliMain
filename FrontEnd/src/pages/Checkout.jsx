import React from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { plans } from "./Pricing";
import "./Checkout.css";

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planKey = params.get("plan");
  const plan = plans.find((p) => p.key === planKey);

  if (!plan || plan.key === "Free") {
    return (
      <div className="checkout-page">
        <div className="checkout-card">
          <h2>Invalid Plan</h2>
          <p>Please select a valid plan from the <Link to="/pricing">Pricing page</Link>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <button className="checkout-back" onClick={() => navigate("/pricing")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Plans
        </button>
        <h1>Upgrade to {plan.name}</h1>
      </div>

      <div className="checkout-card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>&#9993;</div>
          <h2 style={{ marginBottom: 12 }}>Contact Us to Upgrade</h2>
          <p style={{ color: 'var(--text-muted, #9ca3af)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 24 }}>
            We're currently setting up online payments. To upgrade to the{" "}
            <strong>{plan.name} ({plan.price}{plan.priceNote || ""})</strong> plan,
            please reach out to us and our team will activate your plan.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <a
              href="mailto:avikaventures.info@gmail.com?subject=Plan%20Upgrade%20Request%20-%20{planKey}&body=Hi%2C%0A%0AI%20would%20like%20to%20upgrade%20to%20the%20{planKey}%20plan.%0A%0AMy%20account%20email%3A%20{userEmail}%0A%0AThank%20you!"
              className="checkout-btn checkout-btn-primary"
              style={{ textDecoration: 'none', display: 'inline-block' }}
              onClick={(e) => {
                // Build the mailto properly with actual values
                e.preventDefault();
                const subject = encodeURIComponent(`Plan Upgrade Request - ${plan.name}`);
                const body = encodeURIComponent(`Hi,\n\nI would like to upgrade to the ${plan.name} plan (${plan.price}${plan.priceNote || ""}).\n\nMy account email: ${user?.email || ""}\n\nThank you!`);
                window.location.href = `mailto:avikaventures.info@gmail.com?subject=${subject}&body=${body}`;
              }}
            >
              Email Us to Upgrade
            </a>
            <Link to="/contacts" className="checkout-btn checkout-btn-outline" style={{ textDecoration: 'none' }}>
              Go to Contact Page
            </Link>
          </div>

          <p style={{ marginTop: 24, fontSize: '0.9rem', color: 'var(--text-muted, #9ca3af)' }}>
            We typically respond within 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
