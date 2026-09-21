import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import LoginGate from "../components/LoginGate";
import { useAuth } from "../AuthContext";

const LoginGateContext = createContext({
  requireLogin: () => {},
});

/**
 * Wraps the app and provides requireLogin(returnTo) — call from any component
 * to open the login modal when an anonymous user attempts a gated action.
 */
export function LoginGateProvider({ children }) {
  const [returnTo, setReturnTo] = useState(null);
  const [reason, setReason] = useState(null);

  // requireLogin(path) — opens the modal with default (reader) copy.
  // requireLogin(path, { title, subtitle }) — overrides copy for non-reader gates
  // like /magazine/submit.
  const requireLogin = useCallback((path, reasonOverride) => {
    setReturnTo(path || "/");
    setReason(reasonOverride || null);
  }, []);

  const close = useCallback(() => {
    setReturnTo(null);
    setReason(null);
  }, []);

  // Safety net: if the modal is open but the user is (or becomes) logged in —
  // e.g. a gate fired during the mount-time session restore, or they signed in
  // from another tab — dismiss it. Nobody who is logged in should see a login popup.
  const { user } = useAuth();
  useEffect(() => {
    if (user && returnTo !== null) close();
  }, [user, returnTo, close]);

  return (
    <LoginGateContext.Provider value={{ requireLogin }}>
      {children}
      {returnTo !== null && <LoginGate returnTo={returnTo} reason={reason} onClose={close} />}
    </LoginGateContext.Provider>
  );
}

export function useLoginGate() {
  return useContext(LoginGateContext);
}

/**
 * Returns an onClick handler factory: `gateClick(path)` returns a handler
 * that, for anonymous users, preventDefaults the click and opens the login
 * modal with returnTo=path. For logged-in users, the original link/navigation
 * proceeds. Usage: `<Link to={url} onClick={gateClick(url)}>`.
 */
export function useGatedClick() {
  const { user } = useAuth();
  const { requireLogin } = useLoginGate();
  return useCallback(
    (path) => (e) => {
      if (!user) {
        e.preventDefault();
        requireLogin(path);
      }
    },
    [user, requireLogin]
  );
}
