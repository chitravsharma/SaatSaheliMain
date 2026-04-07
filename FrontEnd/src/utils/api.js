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

export default api;
