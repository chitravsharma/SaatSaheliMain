/* SaatSaheli PWA service worker
 * Minimal hand-rolled SW (no Workbox) so the site qualifies as a PWA and
 * survives spotty mobile networks. Three rules:
 *   1. /api/* and external trackers → always go to network. Never cache user
 *      data or analytics beacons here.
 *   2. Page navigations → network-first; fall back to a cached /index.html
 *      so the app shell still loads when offline.
 *   3. /static/* and /icons/* (CRA-hashed assets, never change) → cache-first.
 * Bump CACHE_VERSION on any cache-shape change to flush old caches.
 */
const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `saatsaheli-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `saatsaheli-static-${CACHE_VERSION}`;
const APP_SHELL_URLS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== APP_SHELL_CACHE && k !== STATIC_CACHE)
                    .map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);

    // Skip cross-origin requests (analytics, fonts CDN, Cloudinary). Letting
    // them flow through the SW just adds overhead with no benefit.
    if (url.origin !== self.location.origin) return;

    // Always-fresh: API calls. Never cache responses that depend on auth
    // or user state.
    if (url.pathname.startsWith("/api/")) return;

    // Page navigations: network-first, fall back to cached app shell.
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(APP_SHELL_CACHE).then((c) => c.put("/index.html", copy));
                    return res;
                })
                .catch(() => caches.match("/index.html"))
        );
        return;
    }

    // Static assets: cache-first.
    if (url.pathname.startsWith("/static/") || url.pathname.startsWith("/icons/")) {
        event.respondWith(
            caches.match(req).then((cached) => {
                if (cached) return cached;
                return fetch(req).then((res) => {
                    if (res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
                    }
                    return res;
                });
            })
        );
    }
});

// Push notifications. The DevTools "Push" button fires this with whatever
// payload string is in the textbox; in production the same handler runs for
// every web-push delivery. Payload format: either plain text (used as body)
// or JSON { title, body, url, icon }.
self.addEventListener("push", (event) => {
    let payload = { title: "SaatSaheli", body: "You have a new notification", url: "/" };
    if (event.data) {
        try {
            payload = { ...payload, ...event.data.json() };
        } catch {
            payload.body = event.data.text();
        }
    }
    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: payload.icon || "/icons/icon-192.png",
            badge: "/icons/icon-96.png",
            tag: payload.tag || "saatsaheli",
            renotify: true,
            data: { url: payload.url || "/" },
        })
    );
});

// Click on a notification: focus an existing tab on the target URL or open one.
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || "/";
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        })
    );
});
