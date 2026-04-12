import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
});

// Attach Authorization header (JWT) on every request
api.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem("saatSaheliToken");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }
    } catch { /* ignore */ }
    return config;
});

export function getAnonId() {
    let id = localStorage.getItem("saatSaheliAnonId");
    if (!id) {
        id = "anon-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("saatSaheliAnonId", id);
    }
    return id;
}

export function profileUrl(userId, name) {
    const slug = (name || "")
        .trim()
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
    return slug ? `/profile/${userId}/${encodeURIComponent(slug)}` : `/profile/${userId}`;
}

export default api;
