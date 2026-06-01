import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../AuthContext";
import "./Advertise.css";
import "./SupportUs.css";

const CURRENCIES = {
  inr: { code: "inr", symbol: "₹", label: "INR", presets: [100, 250, 500, 1000, 2500] },
  usd: { code: "usd", symbol: "$", label: "USD", presets: [5, 10, 25, 50, 100] },
};

// Optional "cover the processing fee" amounts. USD = Stripe's 2.9% + $0.30.
// INR fixed approximated (~₹25); account settles in USD so intl/conversion may vary slightly.
const FEES = {
  usd: { pct: 0.029, fixed: 0.30 },
  inr: { pct: 0.029, fixed: 25 },
};
const feeFor = (amount, code) => {
  const f = FEES[code];
  if (!f || !amount || amount <= 0) return 0;
  return Math.round((amount * f.pct + f.fixed) * 100) / 100;
};

const SupportUs = () => {
  const { user } = useAuth();
  const [currency, setCurrency] = useState("usd");
  const [frequency, setFrequency] = useState("one_time");
  const [amount, setAmount] = useState(CURRENCIES.usd.presets[2]);
  const [customAmount, setCustomAmount] = useState("");
  const [coverFee, setCoverFee] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cur = CURRENCIES[currency];
  const effectiveAmount = customAmount.trim() !== "" ? Number(customAmount) : amount;
  const fee = coverFee ? feeFor(effectiveAmount, currency) : 0;
  const totalAmount = Math.round((effectiveAmount + fee) * 100) / 100;

  const switchCurrency = (code) => {
    setCurrency(code);
    setAmount(CURRENCIES[code].presets[2]);
    setCustomAmount("");
    setError("");
  };

  const handleSupport = async (e) => {
    e.preventDefault();
    setError("");

    if (!effectiveAmount || isNaN(effectiveAmount) || effectiveAmount <= 0) {
      setError("Please choose or enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/api/support/create-checkout-session`, {
        purpose: "donation",
        amount: totalAmount,
        currency: cur.code,
        frequency,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        cancelPath: "/support",
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError("Could not start checkout. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Could not start checkout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="advertise-page support-page">
      <header className="advertise-hero">
        <p className="advertise-eyebrow">Support SaatSaheli</p>
        <h1 className="advertise-h1">Help keep our community thriving</h1>
        <p className="advertise-lede">
          SaatSaheli is a creative home for writers, artists, homemakers, and everyday
          creators. Your contribution helps us cover hosting, tools, and the work that
          keeps the magazine, portal, and community going.
        </p>
      </header>

      <section className="support-widget" aria-label="Make a contribution">
        <form className="support-card" onSubmit={handleSupport}>
          {error && <div className="advertise-error" role="alert">{error}</div>}

          <div className="support-toggle-row">
            <div className="support-toggle" role="group" aria-label="Contribution frequency">
              <button
                type="button"
                className={`support-toggle-btn${frequency === "one_time" ? " is-active" : ""}`}
                onClick={() => setFrequency("one_time")}
              >
                One-time
              </button>
              <button
                type="button"
                className={`support-toggle-btn${frequency === "monthly" ? " is-active" : ""}`}
                onClick={() => setFrequency("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`support-toggle-btn${frequency === "annual" ? " is-active" : ""}`}
                onClick={() => setFrequency("annual")}
              >
                Yearly
              </button>
            </div>

            <div className="support-toggle" role="group" aria-label="Currency">
              <button
                type="button"
                className={`support-toggle-btn${currency === "inr" ? " is-active" : ""}`}
                onClick={() => switchCurrency("inr")}
              >
                ₹ INR
              </button>
              <button
                type="button"
                className={`support-toggle-btn${currency === "usd" ? " is-active" : ""}`}
                onClick={() => switchCurrency("usd")}
              >
                $ USD
              </button>
            </div>
          </div>

          <fieldset className="support-amounts">
            <legend>Choose an amount</legend>
            <div className="support-amount-grid">
              {cur.presets.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  className={`support-amount-btn${customAmount.trim() === "" && amount === preset ? " is-active" : ""}`}
                  onClick={() => { setAmount(preset); setCustomAmount(""); }}
                >
                  {cur.symbol}{preset.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="support-custom">
              <span className="support-custom-symbol">{cur.symbol}</span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="Other amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                aria-label="Custom amount"
              />
            </div>
          </fieldset>

          <div className="support-fields">
            <div className="support-field">
              <label htmlFor="sup-name">Name (optional)</label>
              <input id="sup-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="support-field">
              <label htmlFor="sup-email">Email (optional)</label>
              <input id="sup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
          </div>

          <div className="support-field">
            <label htmlFor="sup-message">Leave a note (optional)</label>
            <textarea id="sup-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="A word of encouragement, or why you support us" />
          </div>

          {effectiveAmount > 0 && (
            <label className="support-coverfee" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", margin: "0.25rem 0 0.85rem", fontSize: "0.9rem", color: "#4b5563", cursor: "pointer" }}>
              <input type="checkbox" checked={coverFee} onChange={(e) => setCoverFee(e.target.checked)} style={{ marginTop: "0.2rem" }} />
              <span>
                Add <strong>{cur.symbol}{feeFor(effectiveAmount, currency).toFixed(2)}</strong> to cover processing fees so 100% of your {cur.symbol}{effectiveAmount.toLocaleString()} reaches SaatSaheli.
              </span>
            </label>
          )}

          <button type="submit" className="advertise-submit support-submit" disabled={loading}>
            {loading
              ? "Redirecting to secure checkout…"
              : `Support with ${cur.symbol}${(totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: coverFee ? 2 : 0, maximumFractionDigits: 2 })}${coverFee ? " (incl. fees)" : ""}${frequency === "monthly" ? " / month" : frequency === "annual" ? " / year" : ""}`}
          </button>
          <p className="support-secure-note">
            Secure payment via Stripe. You'll be redirected to complete your contribution.
          </p>
          <p className="support-secure-note">
            Contributions are non-refundable except for charges made in error. See our{" "}
            <Link to="/refund-policy" style={{ color: "#f59e0b", fontWeight: 600 }}>
              Refund Policy
            </Link>.
          </p>
        </form>
      </section>
    </div>
  );
};

export default SupportUs;
