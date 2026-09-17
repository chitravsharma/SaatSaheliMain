import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import api from "../utils/api";
import "./Pricing.css";

const plans = [
  {
    key: "Free",
    name: "Free",
    tagline: "Best for reading, writing & sharing",
    price: "Free",
    priceNote: null,
    monthlyPrice: 0,
    features: [
      "Read all books, articles, recipes & galleries — free forever",
      "Magazine preview — first 10 pages of every issue",
      "Write & publish articles, blogs and poems",
      "Post recipes with photos",
      "Gallery: 2 galleries · 20 pictures · 100 MB",
      "Create your profile & share it via link",
      "Like, favourite, comment & join the chat rooms",
      "Community support",
    ],
    limitations: [
      "Cannot create or upload books",
      "Cannot mark items For Sale",
    ],
    bonus: null,
    highlight: false,
    cta: "Current Plan",
  },
  {
    key: "Premium",
    name: "Premium",
    tagline: "Best for regular creators",
    price: "$3",
    priceNote: "/ month",
    monthlyPrice: 3,
    features: [
      "Mark any gallery item For Sale",
      "Private chat inbox with buyers of your items",
      "Gallery: 15 galleries · 300 pictures · 2 GB",
      "Create up to 10 books · 50 pages each",
      "Export your own books to PDF & DOCX",
      "Read every magazine issue in full",
      "Priority email support",
    ],
    limitations: null,
    bonus: ["Share books & your profile via link"],
    highlight: true,
    cta: "Upgrade to Premium",
  },
  {
    key: "Creator",
    name: "Creator / Pro",
    tagline: "Best for prolific creators",
    price: "$7",
    priceNote: "/ month",
    monthlyPrice: 7,
    features: [
      "Everything in Premium",
      "Sold archive & enquiry stats on your profile",
      "Custom \u201chow to buy\u201d note on every item",
      "Featured Creator badge · first in Home \u201cFresh\u201d",
      "One artwork a month showcased in Sarayu Shop",
      "Priority review for the printed magazine",
      "Gallery: 50 galleries · 1,500 pictures · 10 GB",
      "Create up to 25 books · 100 pages each",
      "Free content-creation help — book setup, image design & more",
    ],
    limitations: null,
    bonus: null,
    highlight: false,
    cta: "Go Pro",
  },
];

export { plans };

export default function Pricing() {
  const { user, userPlan } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    if (showContact && bannerRef.current) {
      bannerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showContact, selectedPlan]);

  const handleSelect = async (plan) => {
    if (plan.key === "Free") return;
    if (!user) {
      navigate("/Login");
      return;
    }
    if (plan.key === userPlan) return;

    setShowContact(false);
    setLoadingPlan(plan.key);
    try {
      const res = await api.post("/api/payments/create-checkout-session", {
        planKey: plan.key,
        userId: user.userId,
      });
      if (res.data?.url) {
        // Hand off to Stripe's hosted Checkout.
        window.location.href = res.data.url;
        return;
      }
      // No URL came back — fall through to the manual contact path.
      setSelectedPlan(plan.key);
      setShowContact(true);
    } catch (err) {
      // Stripe not configured yet (503) or any transient failure: fall back to
      // the "contact us to upgrade" flow so the user is never left stuck.
      setSelectedPlan(plan.key);
      setShowContact(true);
    } finally {
      setLoadingPlan(null);
    }
  };

  const getCtaLabel = (plan) => {
    if (loadingPlan === plan.key) return "Redirecting…";
    if (user && plan.key === userPlan) return "Current Plan";
    if (plan.key === "Free") return plan.cta;
    return plan.cta;
  };

  return (
    <div className="pricing-page">
      <div className="pricing-hero">
        <h1>Choose Your Plan</h1>
        <p>Start free and upgrade as you grow. Every plan includes access to our book creation tools.</p>
      </div>

      {showContact && (
        <div className="pricing-contact-banner" ref={bannerRef}>
          <p>
            To upgrade to the <strong>{selectedPlan}</strong> plan, please contact us at{" "}
            <a href="mailto:avikaventures.info@gmail.com">avikaventures.info@gmail.com</a>{" "}
            or visit our <Link to="/contacts">Contact page</Link>. Our team will set up your plan.
          </p>
          <button className="pricing-contact-close" onClick={() => setShowContact(false)} aria-label="Close">&times;</button>
        </div>
      )}

      <div className="pricing-grid">
        {plans.map((plan) => {
          const isCurrent = user && plan.key === userPlan;
          return (
            <div key={plan.name} className={`pricing-card ${plan.highlight ? "pricing-card-highlight" : ""} ${isCurrent ? "pricing-card-current" : ""} ${selectedPlan === plan.key ? "pricing-card-selected" : ""}`}>
              {plan.highlight && <div className="pricing-badge">Most Popular</div>}
              {isCurrent && <div className="pricing-badge pricing-badge-current">Your Plan</div>}
              <h2 className="pricing-plan-name">{plan.name}</h2>
              <p className="pricing-tagline">{plan.tagline}</p>
              <div className="pricing-price">
                <span className="pricing-amount">{plan.price}</span>
                {plan.priceNote && <span className="pricing-period">{plan.priceNote}</span>}
              </div>

              <div className="pricing-features">
                <h3>Features</h3>
                <ul>
                  {plan.features.map((f, i) => (
                    <li key={i}><span className="pricing-check">&#10003;</span> {f}</li>
                  ))}
                </ul>
              </div>

              {plan.bonus && (
                <div className="pricing-bonus">
                  <h3>Bonus</h3>
                  <ul>
                    {plan.bonus.map((b, i) => (
                      <li key={i}><span className="pricing-star">&#9733;</span> {b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.limitations && (
                <div className="pricing-limitations">
                  <h3>Limitations</h3>
                  <ul>
                    {plan.limitations.map((l, i) => (
                      <li key={i}><span className="pricing-x">&#10007;</span> {l}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pricing-cta">
                <button
                  className={`pricing-btn ${plan.highlight ? "pricing-btn-highlight" : ""} ${isCurrent ? "pricing-btn-current" : ""}`}
                  onClick={() => handleSelect(plan)}
                  disabled={isCurrent || loadingPlan === plan.key}
                >
                  {getCtaLabel(plan)}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
