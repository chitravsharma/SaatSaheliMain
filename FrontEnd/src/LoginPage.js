import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const API = `${process.env.REACT_APP_API_URL}/api/auth`;

function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from || "/";

    const [mode, setMode] = useState("login"); // "login" or "signup"
    const [firstName, setFirstName] = useState("");
    const [middleName, setMiddleName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!email || !password) {
            setError("Please fill in email and password.");
            return;
        }
        if (mode === "signup" && !firstName) {
            setError("Please enter your first name.");
            return;
        }
        setLoading(true);
        try {
            if (mode === "signup") {
                const res = await axios.post(`${API}/signup`, {
                    firstName, middleName, lastName, phoneNumber,
                    email, password, age: age || null, gender, provider: "email"
                });
                login(res.data);
            } else {
                const res = await axios.post(`${API}/login`, { email, password, provider: "email" });
                login(res.data);
            }
            navigate(from, { replace: true });
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            setError(msg);
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setError("");
        setLoading(true);
        // For Google login, try login first; if not found, auto-signup
        const googleEmail = prompt("Enter your Google email:");
        if (!googleEmail) { setLoading(false); return; }
        try {
            const res = await axios.post(`${API}/login`, { email: googleEmail, provider: "google" });
            login(res.data);
            navigate(from, { replace: true });
        } catch (err) {
            if (err.response?.status === 401) {
                // Auto-signup for Google users
                try {
                    const res = await axios.post(`${API}/signup`, {
                        firstName: googleEmail.split("@")[0], email: googleEmail, provider: "google", password: ""
                    });
                    login(res.data);
                    navigate(from, { replace: true });
                } catch (signupErr) {
                    setError(signupErr.response?.data?.error || signupErr.message);
                }
            } else {
                setError(err.response?.data?.error || err.message);
            }
        }
        setLoading(false);
    };

    const handleAppleLogin = async () => {
        setError("");
        setLoading(true);
        const appleEmail = prompt("Enter your Apple email:");
        if (!appleEmail) { setLoading(false); return; }
        try {
            const res = await axios.post(`${API}/login`, { email: appleEmail, provider: "apple" });
            login(res.data);
            navigate(from, { replace: true });
        } catch (err) {
            if (err.response?.status === 401) {
                try {
                    const res = await axios.post(`${API}/signup`, {
                        firstName: appleEmail.split("@")[0], email: appleEmail, provider: "apple", password: ""
                    });
                    login(res.data);
                    navigate(from, { replace: true });
                } catch (signupErr) {
                    setError(signupErr.response?.data?.error || signupErr.message);
                }
            } else {
                setError(err.response?.data?.error || err.message);
            }
        }
        setLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>{mode === "login" ? "Log In" : "Create Account"}</h2>

                <div className="social-buttons">
                    <button onClick={handleGoogleLogin} className="btn-social btn-google" disabled={loading}>
                        <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: "8px", verticalAlign: "middle" }}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        Continue with Google
                    </button>
                    <button onClick={handleAppleLogin} className="btn-social btn-apple" disabled={loading}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ marginRight: "8px", verticalAlign: "middle" }}>
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        Continue with Apple
                    </button>
                </div>

                <div className="login-divider">
                    <span>or</span>
                </div>

                <form onSubmit={handleSubmit}>
                    {mode === "signup" && (
                        <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name *</label>
                                    <input type="text" placeholder="First name" value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)} className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label>Middle Name</label>
                                    <input type="text" placeholder="Middle name" value={middleName}
                                        onChange={(e) => setMiddleName(e.target.value)} className="form-input" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input type="text" placeholder="Last name" value={lastName}
                                        onChange={(e) => setLastName(e.target.value)} className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input type="tel" placeholder="Phone number" value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)} className="form-input" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Age</label>
                                    <input type="number" placeholder="Age" value={age}
                                        onChange={(e) => setAge(e.target.value)} className="form-input" />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="form-input">
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                    <div className="form-group">
                        <label>Email *</label>
                        <input type="email" placeholder="you@example.com" value={email}
                            onChange={(e) => setEmail(e.target.value)} className="form-input" />
                    </div>
                    <div className="form-group">
                        <label>Password *</label>
                        <input type="password" placeholder="Password" value={password}
                            onChange={(e) => setPassword(e.target.value)} className="form-input" />
                    </div>
                    {error && <p className="login-error">{error}</p>}
                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
                        {loading ? "Please wait..." : (mode === "login" ? "Log In" : "Create Account")}
                    </button>
                </form>

                <p className="login-toggle">
                    {mode === "login" ? (
                        <>Don't have an account? <button className="toggle-link" onClick={() => { setMode("signup"); setError(""); }}>Sign Up</button></>
                    ) : (
                        <>Already have an account? <button className="toggle-link" onClick={() => { setMode("login"); setError(""); }}>Log In</button></>
                    )}
                </p>
            </div>
        </div>
    );
}

export default LoginPage;
