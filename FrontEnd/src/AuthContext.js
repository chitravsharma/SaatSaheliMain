import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const timerRef = useRef(null);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem("saatSaheliUser");
    }, []);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    }, [logout]);

    useEffect(() => {
        const saved = localStorage.getItem("saatSaheliUser");
        if (saved) {
            try { setUser(JSON.parse(saved)); } catch (e) { /* ignore */ }
        }
    }, []);

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
