import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // True until the mount-time session restore has run. ProtectedRoute must wait
    // for this before deciding to redirect, otherwise a hard page load (e.g.
    // returning from Stripe Checkout) renders with user=null and bounces to /Login
    // before localStorage rehydration completes.
    const [initializing, setInitializing] = useState(true);
    const [flashAccount, setFlashAccount] = useState(false);
    const timerRef = useRef(null);
    const flashTimerRef = useRef(null);

    const clearAuth = useCallback(() => {
        localStorage.removeItem("saatSaheliUser");
        localStorage.removeItem("saatSaheliToken");
        localStorage.removeItem("saatSaheliLastActivity");
        sessionStorage.removeItem("saatSaheliSession");
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        clearAuth();
    }, [clearAuth]);

    // Auto-logout: clear auth then full-page redirect to /Login with reason.
    // Full reload (not SPA navigate) because AuthContext lives above Router,
    // and it also flushes any in-memory state from the previously authenticated session.
    const autoLogout = useCallback((reason) => {
        clearAuth();
        const suffix = reason ? `?reason=${encodeURIComponent(reason)}` : "";
        window.location.href = `/Login${suffix}`;
    }, [clearAuth]);

    const updateActivity = useCallback(() => {
        localStorage.setItem("saatSaheliLastActivity", Date.now().toString());
    }, []);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        updateActivity();
        timerRef.current = setTimeout(() => autoLogout("idle"), INACTIVITY_TIMEOUT);
    }, [autoLogout, updateActivity]);

    // Restore session on mount — but only if window session is still active
    // and user was not inactive for more than 15 minutes
    useEffect(() => {
        try {
            const saved = localStorage.getItem("saatSaheliUser");
            if (!saved) return;

            const sessionActive = sessionStorage.getItem("saatSaheliSession");
            if (!sessionActive) {
                clearAuth();
                return;
            }

            const lastActivity = localStorage.getItem("saatSaheliLastActivity");
            if (lastActivity) {
                const elapsed = Date.now() - parseInt(lastActivity, 10);
                if (elapsed > INACTIVITY_TIMEOUT) {
                    clearAuth();
                    return;
                }
            }

            setUser(JSON.parse(saved));
        } catch (e) {
            clearAuth();
        } finally {
            // Always mark init complete so ProtectedRoute can stop waiting —
            // on every path, including the early returns above.
            setInitializing(false);
        }
    }, [clearAuth]);

    // Set up inactivity listeners when user is logged in
    useEffect(() => {
        if (!user) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
        events.forEach((e) => window.addEventListener(e, resetTimer));
        resetTimer();

        return () => {
            events.forEach((e) => window.removeEventListener(e, resetTimer));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [user, resetTimer]);

    // Cross-tab sync: if another tab clears the auth keys (manual logout or idle
    // timeout in that tab), this tab also drops the user from state so the UI
    // doesn't keep showing a logged-in view.
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === "saatSaheliUser" && e.newValue === null) {
                if (timerRef.current) clearTimeout(timerRef.current);
                setUser(null);
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // Briefly draw attention to "My Account" links across the site after a
    // fresh Google sign-in. Auto-dismisses after 5.5s; can be dismissed early
    // by either Header or Home when the user clicks the link.
    const triggerAccountFlash = useCallback(() => {
        setFlashAccount(true);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setFlashAccount(false), 5500);
    }, []);

    const dismissAccountFlash = useCallback(() => {
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        setFlashAccount(false);
    }, []);

    const login = (userData) => {
        // Store user data
        const { token, ...userInfo } = userData;
        setUser(userInfo);
        localStorage.setItem("saatSaheliUser", JSON.stringify(userInfo));
        // Store JWT token separately
        if (token) {
            localStorage.setItem("saatSaheliToken", token);
        }
        sessionStorage.setItem("saatSaheliSession", "active");
        updateActivity();
    };

    const role = (user?.role || "").toUpperCase();
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    const isSuperAdmin = role === "SUPER_ADMIN";
    const userPlan = (user?.plan || "Free");
    const isPremiumOrAbove = ["Premium", "Gold", "Creator"].includes(userPlan);

    return (
        <AuthContext.Provider value={{ user, initializing, login, logout, isAdmin, isSuperAdmin, userPlan, isPremiumOrAbove, flashAccount, triggerAccountFlash, dismissAccountFlash }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
