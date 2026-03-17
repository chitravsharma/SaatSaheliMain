import React, { useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import './Login.css';

const API_BASE = `${process.env.REACT_APP_API_URL}/api/auth`;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login: authLogin } = useAuth();
  const strings = useStrings();
  const isRegisterPath = location.pathname.toLowerCase() === "/register";
  const initialMode = (isRegisterPath || searchParams.get("mode") === "signup") ? "signup" : "login";
  const [mode, setMode] = useState(initialMode); // "login" | "signup" | "forgot"
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Signup fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Free");

  const saveUserAndRedirect = (data) => {
    const userData = {
      userId: data.userId,
      loginId: data.loginId,
      name: data.name,
      email: data.email,
      role: data.role,
      provider: data.provider,
      plan: data.plan || "Free",
    };
    authLogin(userData);
    navigate("/");
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
    if (password.length < 6) {
      setError(strings.login.errorPasswordLength);
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
      });
      saveUserAndRedirect(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || strings.login.errorSignupFailed;
      setError(msg);
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
      const res = await axios.post(`${API_BASE}/forgot-password`, { email: forgotEmail.trim() });
      if (res.data.tempPassword) {
        setTempPassword(res.data.tempPassword);
        setSuccess("A temporary password has been generated. Use it to set your new password below.");
      } else {
        setSuccess(res.data.message || "If an account exists, a reset link has been sent.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to process request.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/reset-password`, {
        email: forgotEmail.trim(),
        oldPassword: tempPassword,
        newPassword,
      });
      setSuccess("Password reset successfully! You can now log in with your new password.");
      setTempPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => switchMode("login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password.");
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
          saveUserAndRedirect(res.data);
        } else {
          throw loginErr;
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || strings.login.errorGoogleFailed;
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
              <h2>{strings.login.logInHeading}</h2>
              <form className="auth-form" onSubmit={handleLogin}>
                {error && <div className="auth-error" role="alert">{error}</div>}
                {success && <div className="auth-success" role="status">{success}</div>}

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

                <button
                  type="submit"
                  className="auth-btn auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? strings.login.loggingIn : strings.login.logInButton}
                </button>
              </form>

              <div className="auth-divider"><span>{strings.common.or}</span></div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError(strings.login.errorGoogleFailed)}
                  text="signin_with"
                  shape="rectangular"
                  size="large"
                  width="100%"
                />
              </div>

              <div className="auth-forgot">
                <button onClick={() => switchMode("forgot")}>
                  Forgot Password?
                </button>
              </div>

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
              {!tempPassword ? (
                <form className="auth-form" onSubmit={handleForgotPassword}>
                  {error && <div className="auth-error" role="alert">{error}</div>}
                  {success && <div className="auth-success" role="status">{success}</div>}
                  <p className="auth-forgot-info">Enter your email address and we'll send you a temporary password.</p>
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
                </form>
              ) : (
                <form className="auth-form" onSubmit={handleResetPassword}>
                  {error && <div className="auth-error" role="alert">{error}</div>}
                  {success && <div className="auth-success" role="status">{success}</div>}
                  <div className="auth-temp-password">
                    <p>Your temporary password:</p>
                    <code className="auth-temp-code">{tempPassword}</code>
                  </div>
                  <div className="auth-field">
                    <label htmlFor="new-password">New Password</label>
                    <input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="confirm-new-password">Confirm New Password</label>
                    <input
                      id="confirm-new-password"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                    {loading ? "Resetting..." : "Set New Password"}
                  </button>
                </form>
              )}
              <div className="auth-switch">
                <button onClick={() => { switchMode("login"); setTempPassword(""); }}>
                  Back to Login
                </button>
              </div>
            </>
          )}

          {mode === "signup" && (
            <>
              <h2>{strings.login.createAccountHeading}</h2>
              <form className="auth-form" onSubmit={handleSignup}>
                {error && <div className="auth-error" role="alert">{error}</div>}
                {success && <div className="auth-success" role="status">{success}</div>}

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
                    <option value="Premium">Premium — $5-$9/mo</option>
                    <option value="Gold">Gold Member — $15-$20/mo</option>
                    <option value="Creator">Creator / Pro — $29-$49/mo</option>
                  </select>
                  <a href="/pricing" target="_blank" rel="noopener noreferrer" className="auth-plan-link">View plan details</a>
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
                    <span>I accept the <a href="/policies" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> and <a href="/policies" target="_blank" rel="noopener noreferrer">Content Creation Policy</a></span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="auth-btn auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? strings.login.creatingAccount : strings.login.createAccountButton}
                </button>
              </form>

              <div className="auth-divider"><span>{strings.common.or}</span></div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError(strings.login.errorGoogleFailed)}
                  text="signup_with"
                  shape="rectangular"
                  size="large"
                  width="100%"
                />
              </div>

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
