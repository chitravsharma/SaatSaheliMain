import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import api from "../utils/api";

const API = process.env.REACT_APP_API_URL;

// Gate that blocks content-creation pages until the user has set up their profile
// (has a non-empty displayName). Redirects to /account?profile=required so the
// Account page can surface a clear "Create My Profile" prompt.
export default function RequireProfile({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState("loading"); // "loading" | "ok" | "redirect"

  useEffect(() => {
    if (!user) return;
    api.get(`${API}/api/auth/user/${user.userId}`)
      .then(res => {
        const dn = (res.data?.displayName || "").trim();
        setState(dn ? "ok" : "redirect");
      })
      .catch(() => setState("redirect")); // on error, be conservative: send to account
  }, [user]);

  if (!user) return <Navigate to="/Login" replace />;
  if (state === "loading") return null;
  if (state === "redirect") return <Navigate to="/account?profile=required" replace />;
  return children;
}
