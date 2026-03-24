import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
});

// Attach Authorization header (JWT) and legacy X-User-Id on every request
api.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem("saatSaheliToken");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
        // Also send X-User-Id as fallback for backward compatibility
        const saved = localStorage.getItem("saatSaheliUser");
        if (saved) {
            const user = JSON.parse(saved);
            if (user?.userId) {
                config.headers["X-User-Id"] = String(user.userId);
            }
        }
    } catch { /* ignore */ }
    return config;
});

export default api;
