import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
});

// Attach X-User-Id header from localStorage on every request
api.interceptors.request.use((config) => {
    try {
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
