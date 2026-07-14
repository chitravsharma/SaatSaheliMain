package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    /** Recent notifications for the authenticated user (newest first). */
    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("jwtUserId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
        }
        try {
            return ResponseEntity.ok(notificationService.getForUser(userId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    /** Unread count — cheap, polled by the header bell. */
    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("jwtUserId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
        }
        try {
            Map<String, Object> result = new HashMap<>();
            result.put("count", notificationService.getUnreadCount(userId));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("jwtUserId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
        }
        try {
            boolean updated = notificationService.markRead(id, userId);
            if (!updated) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Notification not found"));
            }
            return ResponseEntity.ok(Map.of("message", "Marked read"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    /**
     * One-time backfill of notifications from existing comments in the last N days.
     * Super-admin only. Idempotent — safe to call more than once.
     */
    @PostMapping("/backfill")
    public ResponseEntity<?> backfill(@RequestParam(defaultValue = "14") int days, HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("jwtUserId");
        String role = (String) request.getAttribute("jwtRole");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
        }
        if (!"SUPER_ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Super-admin only"));
        }
        try {
            int processed = notificationService.backfillRecentComments(days);
            return ResponseEntity.ok(Map.of("backfilled", processed, "days", days));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllRead(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("jwtUserId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
        }
        try {
            int updated = notificationService.markAllRead(userId);
            return ResponseEntity.ok(Map.of("updated", updated));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
