import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import "./Advertise.css";
import "./SupportUs.css";

const API_BASE = process.env.REACT_APP_API_URL;

const CURRENCY_SYMBOL = { inr: "₹", usd: "$" };

const SupportThankYou = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState("loading"); // loading | success | pending | error
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (!sessionId || !API_BASE) {
      setState("error");
      return;
    }
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/support/verify-session`, { params: { sessionId } })
      .then((res) => {
        if (cancelled) return;
        const d = res.data || {};
        setDetails(d);
        // payment mode: paymentStatus "paid"; subscription: status "complete"
        if (d.paymentStatus === "paid" || d.status === "complete") {
          setState("success");
        } else {
          setState("pending");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => { cancelled = true; };
  }, [sessionId]);

  const amountLabel = () => {
    if (!details || details.amount == null) return null;
    const sym = CURRENCY_SYMBOL[details.currency] || "";
    const per = details.frequency === "monthly" ? " / month" : details.frequency === "annual" ? " / year" : "";
    return `${sym}${Number(details.amount).toLocaleString()}${per}`;
  };

  return (
    <div className="advertise-page support-page">
      <section className="support-widget" aria-live="polite">
        <div className="support-card" style={{ textAlign: "center", alignItems: "center" }}>
          {state === "loading" && <p>Confirming your contribution…</p>}

          {state === "success" && (
            <>
              <div style={{ fontSize: "3rem" }} aria-hidden="true">🌸</div>
              <h1 className="advertise-h1" style={{ margin: "8px 0" }}>Thank you for your support!</h1>
              {amountLabel() && (
                <p style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                  Your contribution of {amountLabel()} means a lot to us.
                </p>
              )}
              <p style={{ color: "var(--text-muted, #8a8175)" }}>
                A receipt has been sent to your email by Stripe. You're helping keep
                SaatSaheli's community alive.
              </p>
              <Link to="/" className="advertise-submit support-submit" style={{ textDecoration: "none", maxWidth: 280 }}>
                Back to home
              </Link>
            </>
          )}

          {state === "pending" && (
            <>
              <div style={{ fontSize: "3rem" }} aria-hidden="true">⏳</div>
              <h1 className="advertise-h1" style={{ margin: "8px 0" }}>Almost there…</h1>
              <p style={{ color: "var(--text-muted, #8a8175)" }}>
                Your payment is still processing. If it doesn't confirm shortly, please
                check your email or contact us.
              </p>
              <Link to="/support" className="advertise-submit support-submit" style={{ textDecoration: "none", maxWidth: 280 }}>
                Back to support
              </Link>
            </>
          )}

          {state === "error" && (
            <>
              <div style={{ fontSize: "3rem" }} aria-hidden="true">⚠️</div>
              <h1 className="advertise-h1" style={{ margin: "8px 0" }}>We couldn't confirm this</h1>
              <p style={{ color: "var(--text-muted, #8a8175)" }}>
                We weren't able to verify your contribution. If you were charged, don't
                worry — email us and we'll sort it out.
              </p>
              <Link to="/support" className="advertise-submit support-submit" style={{ textDecoration: "none", maxWidth: 280 }}>
                Back to support
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default SupportThankYou;
