import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { plans } from "./Pricing";
import axios from "axios";
import "./Checkout.css";

const API = process.env.REACT_APP_API_URL;

function formatCard(v) {
  return v.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
}
function formatExpiry(v) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length >= 3) return d.slice(0, 2) + " / " + d.slice(2);
  return d;
}

export default function Checkout() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planKey = params.get("plan");

  const plan = useMemo(() => plans.find((p) => p.key === planKey), [planKey]);

  const [paymentMethod, setPaymentMethod] = useState("card"); // "card" | "paypal"
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Card fields
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  // PayPal fields
  const [paypalEmail, setPaypalEmail] = useState("");

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

  const cardValid = cardName.trim() && cardNumber.replace(/\s/g, "").length === 16 && expiry.replace(/\D/g, "").length === 4 && cvc.length >= 3;
  const paypalValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail);
  const canSubmit = paymentMethod === "card" ? cardValid : paypalValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setProcessing(true);
    setError("");

    try {
      // Update user plan on the backend
      await axios.put(`${API}/api/auth/user/${user.userId}`, { plan: plan.key });

      // Update local session
      const updated = { ...user, plan: plan.key };
      login(updated);

      setSuccess(true);
    } catch (err) {
      setError("Payment processing failed. Please try again.");
    } finally {
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
            A confirmation has been sent to <strong>{user.email}</strong>.
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

        {/* Payment form */}
        <div className="checkout-card">
          <h3>Payment Method</h3>

          <div className="checkout-method-tabs">
            <button
              className={`checkout-method-tab ${paymentMethod === "card" ? "active" : ""}`}
              onClick={() => setPaymentMethod("card")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Credit Card
            </button>
            <button
              className={`checkout-method-tab ${paymentMethod === "paypal" ? "active" : ""}`}
              onClick={() => setPaymentMethod("paypal")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 11l5-9"/><path d="M12 2c4 0 7 2 7 6s-2 6-6 6H9l-1 5H4l3-15h5z"/></svg>
              PayPal
            </button>
          </div>

          <form onSubmit={handleSubmit} className="checkout-form">
            {paymentMethod === "card" && (
              <>
                <div className="checkout-field">
                  <label htmlFor="cardName">Name on Card</label>
                  <input
                    id="cardName"
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    autoComplete="cc-name"
                  />
                </div>
                <div className="checkout-field">
                  <label htmlFor="cardNumber">Card Number</label>
                  <input
                    id="cardNumber"
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCard(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    autoComplete="cc-number"
                  />
                </div>
                <div className="checkout-row">
                  <div className="checkout-field">
                    <label htmlFor="expiry">Expiry</label>
                    <input
                      id="expiry"
                      type="text"
                      inputMode="numeric"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM / YY"
                      maxLength={7}
                      autoComplete="cc-exp"
                    />
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="cvc">CVC</label>
                    <input
                      id="cvc"
                      type="text"
                      inputMode="numeric"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                      maxLength={4}
                      autoComplete="cc-csc"
                    />
                  </div>
                </div>
              </>
            )}

            {paymentMethod === "paypal" && (
              <div className="checkout-paypal-section">
                <div className="checkout-field">
                  <label htmlFor="paypalEmail">PayPal Email</label>
                  <input
                    id="paypalEmail"
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <p className="checkout-paypal-note">
                  You will be redirected to PayPal to complete payment.
                </p>
              </div>
            )}

            {error && <div className="checkout-error">{error}</div>}

            <button
              type="submit"
              className="checkout-btn checkout-btn-primary checkout-btn-full"
              disabled={!canSubmit || processing}
            >
              {processing ? "Processing..." : `Pay ${plan.price}${plan.priceNote || ""}`}
            </button>

            <p className="checkout-secure-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Your payment information is encrypted and secure.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
