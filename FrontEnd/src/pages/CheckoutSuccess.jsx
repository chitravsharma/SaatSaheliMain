import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../AuthContext";
import "./CheckoutSuccess.css";

/**
 * Landing page Stripe redirects to after a completed subscription checkout
 * (setSuccessUrl in PaymentController → /checkout-success?session_id=...&plan=...).
 *
 * The plan is actually granted server-side by the Stripe webhook
 * (checkout.session.completed → user.setPlan). This page just confirms the
 * session with the backend and mirrors the new plan into the client's cached
 * user so the UI updates without a re-login. Never trust the `plan` query param
 * on its own — we verify the session with Stripe before reflecting anything.
 */
export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const { applyPlan } = useAuth();
  const [status, setStatus] = useState("verifying"); // verifying | success | pending | error
  const [plan, setPlan] = useState(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) {
      setStatus("error");
      return;
    }

    api
      .get(`/api/payments/verify-session`, { params: { sessionId } })
      .then((res) => {
        if (cancelled) return;
        if (res.data?.status === "complete") {
          const planKey = res.data.planKey;
          setPlan(planKey);
          applyPlan(planKey);
          setStatus("success");
        } else {
          // Session exists but not settled yet — the webhook may lag a moment.
          setStatus("pending");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, applyPlan]);

  return (
    <div className="checkout-success-page">
      <div className="checkout-success-card">
        {status === "verifying" && (
          <>
            <div className="checkout-success-icon checkout-success-spin">⏳</div>
            <h1>Confirming your payment…</h1>
            <p>Just a moment while we activate your plan.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="checkout-success-icon">🎉</div>
            <h1>You're on {plan ? `the ${plan} plan` : "your new plan"}!</h1>
            <p>
              Thank you for upgrading. Your new limits and features are active
              right away — start creating.
            </p>
            <div className="checkout-success-actions">
              <Link to="/books" className="checkout-success-btn checkout-success-btn-primary">
                Go to my books
              </Link>
              <Link to="/pricing" className="checkout-success-btn checkout-success-btn-secondary">
                View plans
              </Link>
            </div>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="checkout-success-icon">⏳</div>
            <h1>Payment received</h1>
            <p>
              Your payment went through and your plan is being activated. This can
              take a minute — refresh this page shortly, or check{" "}
              <Link to="/pricing">your plan</Link>.
            </p>
            <div className="checkout-success-actions">
              <Link to="/" className="checkout-success-btn checkout-success-btn-secondary">
                Back to home
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="checkout-success-icon">⚠️</div>
            <h1>We couldn't confirm this checkout</h1>
            <p>
              If you were charged, your plan will still activate automatically
              once the payment settles. If anything looks wrong, contact us at{" "}
              <a href="mailto:avikaventures.info@gmail.com">avikaventures.info@gmail.com</a>.
            </p>
            <div className="checkout-success-actions">
              <Link to="/pricing" className="checkout-success-btn checkout-success-btn-primary">
                Back to plans
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
