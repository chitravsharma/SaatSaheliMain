package com.SaatSaheli.spring.config;

/**
 * ThreadLocal holder for act-on-behalf audit metadata. Populated by
 * {@link JwtInterceptor#preHandle} and read by
 * {@link AuditorAwareImpl}, {@link SaatSaheliRevisionListener}.
 * Must be cleared in {@code afterCompletion} to avoid leaking state
 * across pooled threads.
 */
public final class AuditActorContext {
    private static final ThreadLocal<Actor> HOLDER = new ThreadLocal<>();

    private AuditActorContext() {}

    public static void set(Long actorUserId, Long targetUserId, String requestPath) {
        HOLDER.set(new Actor(actorUserId, targetUserId, requestPath));
    }

    public static Actor get() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }

    public record Actor(Long actorUserId, Long targetUserId, String requestPath) {}
}
