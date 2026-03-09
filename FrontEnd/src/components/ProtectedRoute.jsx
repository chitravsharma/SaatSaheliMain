import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user } = useAuth();

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
