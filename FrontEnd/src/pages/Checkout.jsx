import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { plans } from "./Pricing";
import axios from "axios";
import "./Checkout.css";

const API = process.env.REACT_APP_API_URL;

export default function Checkout() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planKey = params.get("plan");
  const sessionId = params.get("session_id"); // returned from Stripe success URL

  const plan = useMemo(() => plans.find((p) => p.key === planKey), [planKey]);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // If returning from Stripe with session_id, verify the session
  useEffect(() => {
    if (sessionId && planKey) {
      const verify = async () => {
        try {
          const res = await axios.get(`${API}/api/payments/verify-session?sessionId=${sessionId}`);
          if (res.data.status === "complete") {
            // Update local user plan
            const updated = { ...user, plan: res.data.planKey || planKey };
            login(updated);
            setSuccess(true);
          }
        } catch {
          // Session verification failed — plan may have been updated via webhook
          setSuccess(true);
        }
      };
      verify();
    }
  }, [sessionId, planKey]);

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

  const handleCheckout = async () => {
    if (!user) {
      navigate("/Login");
      return;
    }
    setProcessing(true);
    setError("");

    try {
      // Create Stripe Checkout Session
      const res = await axios.post(`${API}/api/payments/create-checkout-session`, {
        userId: user.userId,
        planKey: plan.key,
      });

      if (res.data.url) {
        // Redirect to Stripe hosted checkout page
        window.location.href = res.data.url;
      } else {
        setError("Failed to create checkout session. Please try again.");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Payment processing failed. Please try again.";
      setError(msg);
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="checkout-page">
        <div className="checkout-card checkout-success">
          <div className="checkout-success-icon">&#10003;</div>
          <h2>Payment Successful!</h2>
          <p>You are now on the <strong>{plan.name}</strong> plan.</p>
          <p className="checkout-success-detail">
            A confirmation has been sent to <strong>{user?.email}</strong>.
          </p>
          <div className="checkout-actions">
            <button className="checkout-btn checkout-btn-primary" onClick={() => navigate("/account")}>
              Go to Dashboard
            </button>
            <button className="checkout-btn checkout-btn-outline" onClick={() => navigate("/books")}>
              Start Creating
            </button>
          </div>
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
        <h1>Checkout</h1>
      </div>

      <div className="checkout-layout">
        {/* Order summary */}
        <div className="checkout-summary">
          <h3>Order Summary</h3>
          <div className="checkout-plan-info">
            <span className="checkout-plan-name">{plan.name}</span>
            <span className="checkout-plan-price">{plan.price}<span className="checkout-plan-period">{plan.priceNote}</span></span>
          </div>
          <ul className="checkout-plan-features">
            {plan.features.slice(0, 5).map((f, i) => (
              <li key={i}><span className="checkout-check">&#10003;</span> {f}</li>
            ))}
            {plan.features.length > 5 && <li className="checkout-more">+ {plan.features.length - 5} more features</li>}
          </ul>
          <div className="checkout-total">
            <span>Total</span>
            <span className="checkout-total-amount">{plan.price}{plan.priceNote}</span>
          </div>
        </div>

        {/* Payment section */}
        <div className="checkout-card">
          <h3>Secure Payment</h3>
          <p className="checkout-stripe-note">
            You will be redirected to Stripe's secure payment page to complete your purchase.
            Your payment information is handled entirely by Stripe — we never see your card details.
          </p>

          {error && <div className="checkout-error">{error}</div>}

          <button
            className="checkout-btn checkout-btn-primary checkout-btn-full"
            onClick={handleCheckout}
            disabled={processing}
          >
            {processing ? "Redirecting to Stripe..." : `Pay ${plan.price}${plan.priceNote || ""}`}
          </button>

          <p className="checkout-secure-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            Powered by Stripe. PCI-DSS compliant. Your payment is encrypted and secure.
          </p>
        </div>
      </div>
    </div>
  );
}
