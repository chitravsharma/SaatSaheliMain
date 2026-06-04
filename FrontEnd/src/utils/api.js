import axios from "axios";
import { emitUpgrade } from "./upgradeModalBus";

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

// Surface plan-limit hits globally. The backend returns HTTP 403 with
// { error, upgradeRequired: true } when an action exceeds the user's plan.
// We pop the global upgrade modal and tag the error as `isUpgradeRequired` so
// call sites can skip their own (now redundant) inline error message. The
// rejection still propagates so callers can early-return.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const resp = error?.response;
        if (resp && resp.status === 403) {
            let body = resp.data;
            if (body instanceof Blob) {
                // Export requests use responseType:'blob', so the error body is a
                // Blob even when it's actually JSON. Reading it does not consume
                // the Blob, so export call sites can still parse resp.data again.
                try { body = JSON.parse(await body.text()); } catch { body = null; }
            }
            if (body && body.upgradeRequired) {
                error.isUpgradeRequired = true;
                emitUpgrade(body.error);
            }
        }
        return Promise.reject(error);
    }
);

/** True when an error was a plan-limit 403 already handled by the global modal. */
export function isUpgradeRequiredError(error) {
    return !!(error && error.isUpgradeRequired);
}

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
