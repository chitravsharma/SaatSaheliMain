import React, { useRef, useState } from "react";
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ReCAPTCHA from "react-google-recaptcha";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import './Login.css';

const API_BASE = `${process.env.REACT_APP_API_URL}/api/auth`;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login: authLogin, triggerAccountFlash } = useAuth();
  const strings = useStrings();
  const isRegisterPath = location.pathname.toLowerCase() === "/register";
  const initialMode = (isRegisterPath || searchParams.get("mode") === "signup") ? "signup" : "login";
  const [mode, setMode] = useState(initialMode); // "login" | "signup" | "forgot" | "changePassword"
  const [error, setError] = useState("");
  const idleMessage = searchParams.get("reason") === "idle"
    ? "You were signed out after 15 minutes of inactivity. Please log in again."
    : "";
  const [success, setSuccess] = useState(idleMessage);
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Change password fields (after temp password login)
  const [changeNewPassword, setChangeNewPassword] = useState("");
  const [changeConfirmPassword, setChangeConfirmPassword] = useState("");
  const [pendingUserData, setPendingUserData] = useState(null);

  // Signup fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Free");
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const recaptchaRef = useRef(null);

  // Same-origin path only (starts with "/", not "//"), to avoid open-redirect.
  const postLoginPath = (() => {
    const r = searchParams.get("redirect");
    return r && r.startsWith("/") && !r.startsWith("//") ? r : "/";
  })();

  const saveUserAndRedirect = (data) => {
    const userData = {
      userId: data.userId,
      loginId: data.loginId,
      name: data.name,
      email: data.email,
      role: data.role,
      provider: data.provider,
      plan: data.plan || "Free",
      token: data.token,
    };

    if (data.mustChangePassword) {
      setPendingUserData(userData);
      setMode("changePassword");
      setError("");
      setSuccess("");
      return;
    }

    authLogin(userData);
    navigate(postLoginPath);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError(strings.login.errorEmailPasswordRequired);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/login`, {
        email: loginEmail.trim(),
        password: loginPassword,
        provider: "email",
      });
      saveUserAndRedirect(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || strings.login.errorLoginFailed;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!firstName.trim() || !email.trim() || !password.trim()) {
      setError(strings.login.errorSignupRequired);
      return;
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(strings.login.errorInvalidEmail || "Please enter a valid email address.");
      return;
    }
    // Phone validation (if provided, must be 10+ digits)
    if (phoneNumber.trim()) {
      const digits = phoneNumber.replace(/\D/g, "");
      if (digits.length < 10) {
        setError(strings.login.errorInvalidPhone || "Please enter a valid phone number (at least 10 digits).");
        return;
      }
    }
    if (!acceptedTerms) {
      setError(strings.login.errorTermsRequired || "You must accept the Terms and Conditions to create an account.");
      return;
    }
    if (password !== confirmPassword) {
      setError(strings.login.errorPasswordMismatch);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (!/[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/.test(password)) {
      setError("Password must contain at least one special character.");
      return;
    }
    if (RECAPTCHA_SITE_KEY && !recaptchaToken) {
      setError("Please complete the reCAPTCHA.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/signup`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password: password,
        phoneNumber: phoneNumber.trim(),
        provider: "email",
        plan: selectedPlan,
        recaptchaToken,
      });
      saveUserAndRedirect(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || strings.login.errorSignupFailed;
      setError(msg);
      setRecaptchaToken("");
      recaptchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!forgotEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/forgot-password`, { email: forgotEmail.trim() });
      setForgotSent(true);
      setSuccess("If an account with that email exists, you will receive password reset instructions via email.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to process request.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (changeNewPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(changeNewPassword)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(changeNewPassword)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (!/[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/.test(changeNewPassword)) {
      setError("Password must contain at least one special character.");
      return;
    }
    if (changeNewPassword !== changeConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/reset-password`, {
        email: pendingUserData.email,
        newPassword: changeNewPassword,
      }, {
        headers: { Authorization: `Bearer ${pendingUserData.token}` },
      });
      authLogin(pendingUserData);
      navigate(postLoginPath);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      // Decode user info from Google JWT
      const base64Url = credentialResponse.credential.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const googleUser = JSON.parse(jsonPayload);

      // Try login first; if account doesn't exist, auto-signup
      try {
        const res = await axios.post(`${API_BASE}/login`, {
          email: googleUser.email,
          provider: "google",
        });
        triggerAccountFlash();
        saveUserAndRedirect(res.data);
      } catch (loginErr) {
        if (loginErr.response?.status === 401) {
          // Account not found — auto-create via signup
          const res = await axios.post(`${API_BASE}/signup`, {
            firstName: googleUser.given_name || googleUser.name || "",
            lastName: googleUser.family_name || "",
            email: googleUser.email,
            password: "",
            provider: "google",
          });
          sessionStorage.setItem("ss_flash_account", "1");
          saveUserAndRedirect(res.data);
        } else {
          throw loginErr;
        }
      }
    } catch (err) {
      // Surface the real reason: a backend error carries response.data.error;
      // a network/CORS/decoding failure has no response. Logging both makes a
      // "Google sign-in failed" regression diagnosable instead of a black box.
      console.error("Google sign-in failed:", err?.response?.status, err?.response?.data || err?.message, err);
      const msg = err.response?.data?.error
        || (err.request && !err.response ? "Couldn't reach the server. Is the backend running?" : strings.login.errorGoogleFailed);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-welcome">
            <h1>{strings.login.brand}</h1>
            <p>{strings.login.tagline}</p>
          </div>

          {mode === "login" && (
            <>
              {error && <div className="auth-error" role="alert">{error}</div>}
              {success && <div className="auth-success" role="status">{success}</div>}

              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={() => { console.error("Google GSI error — origin not authorized for this client ID, FedCM/third-party cookies blocked, or popup blocked"); setError(strings.login.errorGoogleFailed); }}
                text="signin_with"
                shape="rectangular"
                size="large"
                width="340"
                divider={<div className="auth-divider"><span>{strings.common.or}</span></div>}
              />

              <form className="auth-form" onSubmit={handleLogin}>
                <div className="auth-field">
                  <label htmlFor="login-email">{strings.login.labelEmail}</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder={strings.login.placeholderEmail}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="login-password">{strings.login.labelPassword}</label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder={strings.login.placeholderPassword}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div className="auth-login-row">
                  <button
                    type="submit"
                    className="auth-btn auth-btn-primary auth-btn-compact"
                    disabled={loading}
                  >
                    {loading ? strings.login.loggingIn : strings.login.logInButton}
                  </button>
                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => switchMode("forgot")}
                  >
                    Forgot password?
                  </button>
                </div>
              </form>

              <div className="auth-switch">
                {strings.login.noAccount}{" "}
                <button onClick={() => switchMode("signup")}>
                  {strings.login.switchToSignup}
                </button>
              </div>
            </>
          )}

          {mode === "forgot" && (
            <>
              <h2>Reset Password</h2>
              {forgotSent ? (
                <div className="auth-form">
                  {success && <div className="auth-success" role="status">{success}</div>}
                  <p className="auth-forgot-info">
                    Check your email for password reset instructions. If you don't see it, check your spam folder.
                  </p>
                  <div className="auth-switch">
                    <button onClick={() => { switchMode("login"); setForgotSent(false); }}>
                      Back to Login
                    </button>
                  </div>
                </div>
              ) : (
                <form className="auth-form" onSubmit={handleForgotPassword}>
                  {error && <div className="auth-error" role="alert">{error}</div>}
                  <p className="auth-forgot-info">Enter your email address and we'll send you password reset instructions.</p>
                  <div className="auth-field">
                    <label htmlFor="forgot-email">Email</label>
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                  <p className="auth-forgot-help">
                    Can't remember the email you signed up with? Contact us at{" "}
                    <a href="mailto:avikaventures.info@gmail.com">avikaventures.info@gmail.com</a>{" "}
                    with your name and phone number, and we'll help recover your account.
                  </p>
                  <div className="auth-switch">
                    <button onClick={() => switchMode("login")}>
                      Back to Login
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {mode === "changePassword" && (
            <>
              <h2>Create Your New Password</h2>
              <form className="auth-form" onSubmit={handleChangePassword}>
                {error && <div className="auth-error" role="alert">{error}</div>}
                {success && <div className="auth-success" role="status">{success}</div>}
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={loginEmail}
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                />
                <p className="auth-forgot-info">
                  You logged in with a temporary password. Please create a new password to secure your account.
                </p>
                <div className="auth-field">
                  <label htmlFor="change-new-password">New Password</label>
                  <input
                    id="change-new-password"
                    type="password"
                    placeholder="Min 8 chars, uppercase, number, special char"
                    value={changeNewPassword}
                    onChange={(e) => setChangeNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="change-confirm-password">Confirm New Password</label>
                  <input
                    id="change-confirm-password"
                    type="password"
                    placeholder="Re-enter your new password"
                    value={changeConfirmPassword}
                    onChange={(e) => setChangeConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                  {loading ? "Updating..." : "Set New Password"}
                </button>
              </form>
            </>
          )}

          {mode === "signup" && (
            <>
              <h2>{strings.login.createAccountHeading}</h2>

              {error && <div className="auth-error" role="alert">{error}</div>}
              {success && <div className="auth-success" role="status">{success}</div>}

              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={() => { console.error("Google GSI error — origin not authorized for this client ID, FedCM/third-party cookies blocked, or popup blocked"); setError(strings.login.errorGoogleFailed); }}
                text="signup_with"
                shape="rectangular"
                size="large"
                width="340"
                divider={<div className="auth-divider"><span>{strings.common.or}</span></div>}
              />

              <form className="auth-form" onSubmit={handleSignup}>
                <div className="auth-field-row">
                  <div className="auth-field">
                    <label htmlFor="signup-first">{strings.login.labelFirstName}</label>
                    <input
                      id="signup-first"
                      type="text"
                      placeholder={strings.login.placeholderFirstName}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="signup-last">{strings.login.labelLastName}</label>
                    <input
                      id="signup-last"
                      type="text"
                      placeholder={strings.login.placeholderLastName}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-email">{strings.login.labelSignupEmail}</label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder={strings.login.placeholderEmail}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-phone">{strings.login.labelPhone}</label>
                  <input
                    id="signup-phone"
                    type="tel"
                    placeholder={strings.login.placeholderPhone}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    autoComplete="tel"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-plan">Registration Plan</label>
                  <select
                    id="signup-plan"
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="auth-plan-select"
                  >
                    <option value="Free">Free (Starter)</option>
                    <option value="Premium">Premium — $3/month</option>
                    <option value="Creator">Creator / Pro — $7/month</option>
                  </select>
                  {selectedPlan !== "Free" && (
                    <p className="auth-plan-note">Paid plans require manual activation. Contact us at <a href="mailto:avikaventures.info@gmail.com">avikaventures.info@gmail.com</a> after signup.</p>
                  )}
                  <Link to="/pricing" className="auth-plan-link">View plan details</Link>
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-password">{strings.login.labelSignupPassword}</label>
                  <input
                    id="signup-password"
                    type="password"
                    placeholder={strings.login.placeholderSignupPassword}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-confirm">{strings.login.labelConfirmPassword}</label>
                  <input
                    id="signup-confirm"
                    type="password"
                    placeholder={strings.login.placeholderConfirmPassword}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div className="auth-terms">
                  <label className="auth-terms-label">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="auth-terms-checkbox"
                    />
                    <span>I accept the <Link to="/policies">Terms and Conditions</Link> and <Link to="/policies">Content Creation Policy</Link></span>
                  </label>
                </div>

                {RECAPTCHA_SITE_KEY && (
                  <div className="auth-field" style={{ display: 'flex', justifyContent: 'center' }}>
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={RECAPTCHA_SITE_KEY}
                      onChange={(token) => setRecaptchaToken(token || "")}
                      onExpired={() => setRecaptchaToken("")}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-btn auth-btn-primary"
                  disabled={
                    loading ||
                    !firstName.trim() ||
                    !email.trim() ||
                    !password ||
                    !confirmPassword ||
                    !acceptedTerms ||
                    (!!RECAPTCHA_SITE_KEY && !recaptchaToken)
                  }
                >
                  {loading ? strings.login.creatingAccount : strings.login.createAccountButton}
                </button>
              </form>

              <div className="auth-switch">
                {strings.login.hasAccount}{" "}
                <button onClick={() => switchMode("login")}>
                  {strings.login.switchToLogin}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
