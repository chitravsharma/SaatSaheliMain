package com.SaatSaheli.spring.util;

/**
 * Thrown when an action would exceed the user's subscription plan limits.
 * Controllers map this to HTTP 403 with {"error", "upgradeRequired": true}.
 */
public class PlanLimitException extends RuntimeException {
    public PlanLimitException(String message) {
        super(message);
    }
}
