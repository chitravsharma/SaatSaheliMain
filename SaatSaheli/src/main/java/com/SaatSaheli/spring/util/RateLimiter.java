package com.SaatSaheli.spring.util;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimiter {

    private static final int DEFAULT_MAX_ATTEMPTS = 10;
    private static final long DEFAULT_WINDOW_MS = 15 * 60 * 1000;

    private final ConcurrentHashMap<String, long[]> attempts = new ConcurrentHashMap<>();
    // long[0] = count, long[1] = window start time

    /**
     * Strict default policy: 10 attempts per 15-minute window.
     * Used for auth endpoints (login, signup, forgot-password).
     */
    public boolean tryAcquire(String key) {
        return tryAcquire(key, DEFAULT_MAX_ATTEMPTS, DEFAULT_WINDOW_MS);
    }

    /**
     * Per-endpoint policy. Returns true if allowed, false if rate-limited.
     */
    public boolean tryAcquire(String key, int maxAttempts, long windowMs) {
        long now = System.currentTimeMillis();
        long[] val = attempts.compute(key, (k, v) -> {
            if (v == null || now - v[1] > windowMs) {
                return new long[]{1, now};
            }
            v[0]++;
            return v;
        });
        return val[0] <= maxAttempts;
    }

    /**
     * Remaining attempts for a key under the default policy.
     */
    public int remaining(String key) {
        long[] val = attempts.get(key);
        if (val == null || System.currentTimeMillis() - val[1] > DEFAULT_WINDOW_MS) return DEFAULT_MAX_ATTEMPTS;
        return (int) Math.max(0, DEFAULT_MAX_ATTEMPTS - val[0]);
    }
}
