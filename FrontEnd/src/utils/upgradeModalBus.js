// Tiny module-level event bus that bridges the (non-React) axios interceptor in
// api.js to the React <UpgradeModal /> mounted at the app root. The interceptor
// emits when a request fails with HTTP 403 + { upgradeRequired: true }; the
// modal subscribes and shows an "upgrade your plan" prompt.

let listeners = [];

/** Subscribe to upgrade-required events. Returns an unsubscribe function. */
export function subscribeUpgrade(callback) {
    listeners.push(callback);
    return () => {
        listeners = listeners.filter((l) => l !== callback);
    };
}

/** Notify all subscribers. `message` is the human-readable reason from the API. */
export function emitUpgrade(message) {
    listeners.forEach((l) => {
        try {
            l(message);
        } catch { /* a bad listener must not break the others */ }
    });
}
