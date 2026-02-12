import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import axios from "axios";
import './Login.css';

const API_BASE = "http://localhost:8081/api/auth";
const GOOGLE_CLIENT_ID = "48927390752-qq6q50a1pfo5uajai4072ehnoifs0s7t.apps.googleusercontent.com";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const saveUserAndRedirect = (data) => {
    const userData = {
      userId: data.userId,
      loginId: data.loginId,
      name: data.name,
      email: data.email,
      role: data.role,
      provider: data.provider,
    };
    localStorage.setItem("saatSaheliUser", JSON.stringify(userData));
    navigate("/");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError("Email and password are required.");
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
      const msg = err.response?.data?.error || "Login failed. Please try again.";
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
      setError("First name, email, and password are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
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
      });
      saveUserAndRedirect(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || "Signup failed. Please try again.";
      setError(msg);
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
      const msg = err.response?.data?.error || "Google sign-in failed. Please try again.";
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
            <h1>Saat Saheli</h1>
            <p>Your digital book platform</p>
          </div>

          {mode === "login" && (
            <>
              <h2>Log In</h2>
              <form className="auth-form" onSubmit={handleLogin}>
                {error && <div className="auth-error" role="alert">{error}</div>}
                {success && <div className="auth-success" role="status">{success}</div>}

                <div className="auth-field">
                  <label htmlFor="login-email">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
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
                  {loading ? "Logging in..." : "Log In"}
                </button>
              </form>

              <div className="auth-divider"><span>or</span></div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google sign-in failed. Please try again.")}
                  text="signin_with"
                  shape="rectangular"
                  size="large"
                  width="100%"
                />
              </div>

              <div className="auth-switch">
                Don't have an account?{" "}
                <button onClick={() => switchMode("signup")}>
                  Create Account
                </button>
              </div>
            </>
          )}

          {mode === "signup" && (
            <>
              <h2>Create Account</h2>
              <form className="auth-form" onSubmit={handleSignup}>
                {error && <div className="auth-error" role="alert">{error}</div>}
                {success && <div className="auth-success" role="status">{success}</div>}

                <div className="auth-field-row">
                  <div className="auth-field">
                    <label htmlFor="signup-first">First Name *</label>
                    <input
                      id="signup-first"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="signup-last">Last Name</label>
                    <input
                      id="signup-last"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-email">Email *</label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-phone">Phone Number</label>
                  <input
                    id="signup-phone"
                    type="tel"
                    placeholder="(optional)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    autoComplete="tel"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-password">Password *</label>
                  <input
                    id="signup-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="signup-confirm">Confirm Password *</label>
                  <input
                    id="signup-confirm"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  className="auth-btn auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </form>

              <div className="auth-divider"><span>or</span></div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google sign-in failed. Please try again.")}
                  text="signup_with"
                  shape="rectangular"
                  size="large"
                  width="100%"
                />
              </div>

              <div className="auth-switch">
                Already have an account?{" "}
                <button onClick={() => switchMode("login")}>
                  Log In
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
