import { useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../AuthContext";

const API = process.env.REACT_APP_API_URL;

// Fetches the logged-in user's profile (displayName, interests, etc.).
// Returns { profile, loading, hasProfile } where hasProfile is true iff
// the user is logged in AND has a non-empty displayName — the gate used
// across the tri-state create flow.
export default function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!user);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.get(`${API}/api/auth/user/${user.userId}`)
      .then((res) => { if (!cancelled) setProfile(res.data || null); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const hasProfile = !!(user && profile && (profile.displayName || "").trim());
  return { profile, loading, hasProfile };
}
