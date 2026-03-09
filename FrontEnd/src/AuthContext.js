import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const timerRef = useRef(null);

    const clearAuth = useCallback(() => {
        localStorage.removeItem("saatSaheliUser");
        localStorage.removeItem("saatSaheliLastActivity");
        sessionStorage.removeItem("saatSaheliSession");
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        clearAuth();
    }, [clearAuth]);

    const updateActivity = useCallback(() => {
        localStorage.setItem("saatSaheliLastActivity", Date.now().toString());
    }, []);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        updateActivity();
        timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    }, [logout, updateActivity]);

    // Restore session on mount — but only if window session is still active
    // and user was not inactive for more than 15 minutes
    useEffect(() => {
        const saved = localStorage.getItem("saatSaheliUser");
        if (!saved) return;

        // sessionStorage is cleared when browser/tab is closed.
        // If the flag is missing, it means the window was closed → clear & don't restore.
        const sessionActive = sessionStorage.getItem("saatSaheliSession");
        if (!sessionActive) {
            clearAuth();
            return;
        }

        // Check if last activity was more than 15 minutes ago
        const lastActivity = localStorage.getItem("saatSaheliLastActivity");
        if (lastActivity) {
            const elapsed = Date.now() - parseInt(lastActivity, 10);
            if (elapsed > INACTIVITY_TIMEOUT) {
                clearAuth();
                return;
            }
        }

        try { setUser(JSON.parse(saved)); } catch (e) { clearAuth(); }
    }, [clearAuth]);

    // Set up inactivity listeners when user is logged in
    useEffect(() => {
        if (!user) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
        events.forEach((e) => window.addEventListener(e, resetTimer));
        resetTimer(); // start the timer

        return () => {
            events.forEach((e) => window.removeEventListener(e, resetTimer));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [user, resetTimer]);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem("saatSaheliUser", JSON.stringify(userData));
        sessionStorage.setItem("saatSaheliSession", "active");
        updateActivity();
    };

    const role = (user?.role || "").toUpperCase();
    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    const isSuperAdmin = role === "SUPER_ADMIN";

    return (
        <AuthContext.Provider value={{ user, login, logout, isAdmin, isSuperAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
