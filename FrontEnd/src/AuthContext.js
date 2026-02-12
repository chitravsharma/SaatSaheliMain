import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const saved = localStorage.getItem("saatsaheli_user");
        if (saved) {
            try { setUser(JSON.parse(saved)); } catch (e) { /* ignore */ }
        }
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem("saatsaheli_user", JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("saatsaheli_user");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
