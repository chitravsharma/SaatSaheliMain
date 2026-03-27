import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "./Pricing.css";

const plans = [
  {
    key: "Free",
    name: "Free (Starter)",
    tagline: "Best for beginners trying the platform",
    price: "Free",
    priceNote: null,
    monthlyPrice: 0,
    features: [
      "Create up to 10 books",
      "Maximum 50 pages per book",
      "Basic book templates",
      "Upload text and images",
      "Download book as PDF (low resolution)",
      "Basic editing tools",
      "Community support",
      "100 MB cloud storage",
    ],
    limitations: [
      "Sarayu watermark on exported books",
      "No collaboration features",
      "Limited templates",
    ],
    bonus: null,
    highlight: false,
    cta: "Current Plan",
  },
  {
    key: "Premium",
    name: "Premium",
    tagline: "Best for writers and regular creators",
    price: "$9",
    priceNote: "/ month",
    monthlyPrice: 9,
    features: [
      "Create up to 25 books",
      "Maximum 250 pages per book",
      "Access to premium templates",
      "High-resolution PDF download",
      "Add custom cover designs",
      "Image and media uploads",
      "Basic analytics (views/downloads)",
      "2 GB cloud storage",
      "Remove watermark",
      "Priority email support",
    ],
    limitations: null,
    bonus: ["Share books via link"],
    highlight: false,
    cta: "Upgrade to Premium",
  },
  {
    key: "Gold",
    name: "Gold Member",
    tagline: "Best for professional authors & educators",
    price: "$19",
    priceNote: "/ month",
    monthlyPrice: 19,
    features: [
      "Unlimited books",
      "Unlimited pages",
      "All premium templates",
      "Custom branding for books",
      "Export: PDF, EPUB, Print-ready format",
      "Advanced editor tools",
      "Collaborative writing (team editing)",
      "Book analytics dashboard",
      "10 GB cloud storage",
      "Priority support",
      "Early access to new features",
    ],
    limitations: null,
    bonus: null,
    highlight: true,
    cta: "Go Gold",
  },
  {
    key: "Creator",
    name: "Creator / Pro",
    tagline: "Best for businesses, schools, or publishers",
    price: "$39",
    priceNote: "/ month",
    monthlyPrice: 39,
    features: [
      "Everything in Gold",
      "Unlimited collaborators",
      "API access",
      "White-label books",
      "Custom domain publishing",
      "Sell books online",
      "Advanced analytics",
      "50 GB cloud storage",
      "Dedicated support",
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

  const handleSelect = (plan) => {
    if (plan.key === "Free") return;
    if (!user) {
      navigate("/Login");
      return;
    }
    if (plan.key === userPlan) return; // already on this plan
    setSelectedPlan(plan.key);
    navigate(`/checkout?plan=${plan.key}`);
  };

  const getCtaLabel = (plan) => {
    if (!user) return plan.cta;
    if (plan.key === userPlan) return "Current Plan";
    const planOrder = ["Free", "Premium", "Gold", "Creator"];
    const currentIdx = planOrder.indexOf(userPlan);
    const targetIdx = planOrder.indexOf(plan.key);
    if (targetIdx < currentIdx) return "Downgrade";
    return plan.cta;
  };

  return (
    <div className="pricing-page">
      <div className="pricing-hero">
        <h1>Choose Your Plan</h1>
        <p>Start free and upgrade as you grow. Every plan includes access to our book creation tools.</p>
      </div>

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
                  disabled={isCurrent}
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
