package com.SaatSaheli.spring.config;

import com.SaatSaheli.spring.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class JwtInterceptor implements HandlerInterceptor {

    private static final String ACT_AS_HEADER = "X-Act-As-User";

    private final JwtUtil jwtUtil;

    public JwtInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Extract JWT from Authorization header
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isValid(token)) {
                Long jwtSubject = jwtUtil.getUserId(token);
                String role = jwtUtil.getRole(token);
                if (jwtSubject != null) {
                    // Default: user is acting as themselves
                    Long effectiveUserId = jwtSubject;
                    Long actorUserId = jwtSubject;

                    // SuperAdmin impersonation: X-Act-As-User swaps the effective user
                    // to the target, while keeping the real SA as the actor for audit.
                    if ("SUPER_ADMIN".equals(role)) {
                        String actAsHeader = request.getHeader(ACT_AS_HEADER);
                        if (actAsHeader != null && !actAsHeader.isBlank()) {
                            try {
                                Long targetUserId = Long.parseLong(actAsHeader.trim());
                                effectiveUserId = targetUserId;
                                request.setAttribute("jwtActorUserId", actorUserId);
                                request.setAttribute("jwtImpersonating", Boolean.TRUE);
                            } catch (NumberFormatException ignored) {
                                // Malformed header — fall back to acting as self.
                            }
                        }
                    }

                    request.setAttribute("jwtUserId", effectiveUserId);
                    request.setAttribute("jwtRole", role);

                    // Populate audit ThreadLocal so Envers + AuditorAware pick up
                    // the right actor/target pair for every write on this thread.
                    AuditActorContext.set(actorUserId, effectiveUserId, request.getRequestURI());
                }
            }
        }

        // Individual endpoints decide if auth is required
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        // Must clear on every request — Tomcat pools threads and the next
        // request on this thread would otherwise inherit stale audit state.
        AuditActorContext.clear();
    }
}
