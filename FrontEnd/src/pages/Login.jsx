import React, { useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";


/* const clientId = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; */
const clientId = "+++++++++++++++++++++++++++++.apps.googleusercontent.com" ;


function WelcomePage({ onLoginClick }) {
  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h1>Welcome to saat saheli</h1>
      <button onClick={onLoginClick}>Login</button>
    </div>
  );
}


function LoginPage({ onSuccess, onError, onBack, error }) {
  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>Login</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {/* Google login button */}
      <GoogleLogin
        onSuccess={credentialResponse => {
          onSuccess(credentialResponse);
        }}
        onError={() => {
          onError("Google sign-in failed. Please try again.");
        }}
      />
      <br />
      <button onClick={() => alert("Sign Up flow (not implemented)")}>Sign Up</button>
      <br />
      <button onClick={onBack} style={{ marginTop: 10 }}>
        Back
      </button>
    </div>
  );
}


function HomePage({ user, onLogout }) {
  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h1>Welcome {user.name}</h1>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}


export default function App() {
  const [page, setPage] = useState("welcome"); // "welcome" | "login" | "home"
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");


  const handleLoginSuccess = (credentialResponse) => {
    try {
      // Decode user info from credential token (base64 JWT)
      const base64Url = credentialResponse.credential.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const userObject = JSON.parse(jsonPayload);


      setUser({
        name: userObject.name,
        email: userObject.email,
        picture: userObject.picture,
      });
      setError("");
      setPage("home");
    } catch {
      setError("Failed to parse user information.");
    }
  };


  const handleLoginError = (message) => {
    setError(message);
  };


  const handleLogout = () => {
    setUser(null);
    setPage("welcome");
  };


  return (
    <GoogleOAuthProvider clientId={clientId}>
      {page === "welcome" && <WelcomePage onLoginClick={() => setPage("login")} />}
      {page === "login" && (
        <LoginPage
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          onBack={() => {
            setError("");
            setPage("welcome");
          }}
          error={error}
        />
      )}
      {page === "home" && <HomePage user={user} onLogout={handleLogout} />}
    </GoogleOAuthProvider>
  );
}
