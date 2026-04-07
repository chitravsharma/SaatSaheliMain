package com.SaatSaheli.spring.config;

import com.SaatSaheli.spring.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class JwtInterceptor implements HandlerInterceptor {

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
                Long userId = jwtUtil.getUserId(token);
                String role = jwtUtil.getRole(token);
                if (userId != null) {
                    request.setAttribute("jwtUserId", userId);
                    request.setAttribute("jwtRole", role);
                }
            }
        }

        // Individual endpoints decide if auth is required
        return true;
    }
}
