package com.SaatSaheli.spring.util;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimiter {

    private static final int MAX_ATTEMPTS = 10; // max attempts per window
    private static final long WINDOW_MS = 15 * 60 * 1000; // 15-minute window

    private final ConcurrentHashMap<String, long[]> attempts = new ConcurrentHashMap<>();
    // long[0] = count, long[1] = window start time

    /**
     * Check if the given key (e.g., IP address or email) is rate-limited.
     * Returns true if the request is ALLOWED, false if rate-limited.
     */
    public boolean tryAcquire(String key) {
        long now = System.currentTimeMillis();
        attempts.compute(key, (k, val) -> {
            if (val == null || now - val[1] > WINDOW_MS) {
                return new long[]{1, now};
            }
            val[0]++;
            return val;
        });
        long[] val = attempts.get(key);
        return val != null && val[0] <= MAX_ATTEMPTS;
    }

    /**
     * Get remaining attempts for a key.
     */
    public int remaining(String key) {
        long[] val = attempts.get(key);
        if (val == null || System.currentTimeMillis() - val[1] > WINDOW_MS) return MAX_ATTEMPTS;
        return (int) Math.max(0, MAX_ATTEMPTS - val[0]);
    }
}
