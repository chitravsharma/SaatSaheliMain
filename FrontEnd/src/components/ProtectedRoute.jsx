import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, initializing } = useAuth();

    // Wait for the mount-time session restore before deciding. Without this, a
    // hard page load of a protected route (e.g. returning from Stripe Checkout)
    // redirects to /Login before localStorage rehydration runs.
    if (initializing) {
        return null;
    }

    if (!user) {
        return <Navigate to="/Login" replace />;
    }

    if (requiredRole === "ADMIN") {
        const role = (user.role || "").toUpperCase();
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            return <Navigate to="/" replace />;
        }
    }

    if (requiredRole === "SUPER_ADMIN") {
        const role = (user.role || "").toUpperCase();
        if (role !== "SUPER_ADMIN") {
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
