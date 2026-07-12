import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import axios from "axios";
import { useAuth } from "../AuthContext";
import "./LoginGate.css";

const API_BASE = `${process.env.REACT_APP_API_URL}/api/auth`;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

/**
 * Modal shown when an anonymous user tries to open a reader (book/magazine).
 * Offers inline Google sign-in or links to the full Login page for email/password.
 */
function LoginGate({ returnTo, reason, onClose }) {
  const title = reason?.title || "Login to Read";
  const subtitle = reason?.subtitle || "Sign in with Google or create a free account to continue reading.";
  const navigate = useNavigate();
  const { login: authLogin, triggerAccountFlash } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const safeReturn = (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) ? returnTo : "/";

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const base64Url = credentialResponse.credential.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
      );
      const googleUser = JSON.parse(jsonPayload);

      let res;
      try {
        res = await axios.post(`${API_BASE}/login`, {
          email: googleUser.email,
          provider: "google",
        });
        triggerAccountFlash?.();
      } catch (loginErr) {
        if (loginErr.response?.status === 401) {
          res = await axios.post(`${API_BASE}/signup`, {
            firstName: googleUser.given_name || googleUser.name || "",
            lastName: googleUser.family_name || "",
            email: googleUser.email,
            password: "",
            provider: "google",
          });
          sessionStorage.setItem("ss_flash_account", "1");
        } else {
          throw loginErr;
        }
      }

      authLogin({
        userId: res.data.userId,
        loginId: res.data.loginId,
        name: res.data.name,
        email: res.data.email,
        role: res.data.role,
        provider: res.data.provider,
        plan: res.data.plan || "Free",
        token: res.data.token,
      });
      onClose();
      navigate(safeReturn);
    } catch (err) {
      console.error("Google sign-in failed:", err?.response?.status, err?.response?.data || err?.message, err);
      const msg = err.response?.data?.error
        || (err.request && !err.response ? "Couldn't reach the server. Is the backend running?" : "Sign-in failed. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = (mode) => {
    onClose();
    const params = new URLSearchParams();
    if (mode === "signup") params.set("mode", "signup");
    params.set("redirect", safeReturn);
    navigate(`/Login?${params.toString()}`);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="login-gate-overlay" onClick={handleBackdropClick}>
        <div
          className="login-gate-modal"
          role="dialog"
          aria-labelledby="login-gate-title"
          aria-modal="true"
        >
          <button
            type="button"
            className="login-gate-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>

          <h2 id="login-gate-title">{title}</h2>
          <p className="login-gate-subtitle">{subtitle}</p>

          {error && <div className="login-gate-error" role="alert">{error}</div>}

          <div className="login-gate-google">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => { console.error("Google GSI error — origin not authorized for this client ID, FedCM/third-party cookies blocked, or popup blocked"); setError("Google sign-in failed. Please try again."); }}
              text="signin_with"
              shape="rectangular"
              size="large"
              width="340"
            />
          </div>

          <div className="login-gate-divider"><span>or</span></div>

          <div className="login-gate-actions">
            <button
              type="button"
              className="login-gate-btn login-gate-btn-secondary"
              onClick={() => goToLogin("login")}
              disabled={loading}
            >
              Sign In
            </button>
            <button
              type="button"
              className="login-gate-btn login-gate-btn-primary"
              onClick={() => goToLogin("signup")}
              disabled={loading}
            >
              Create Account
            </button>
          </div>

          <button
            type="button"
            className="login-gate-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Not now
          </button>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}

export default LoginGate;
