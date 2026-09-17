package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.Conversation;
import com.SaatSaheli.spring.model.ConversationMessage;
import com.SaatSaheli.spring.service.MessagingService;
import com.SaatSaheli.spring.util.PlanLimitException;
import com.SaatSaheli.spring.util.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/** Private buyer ↔ seller messages about items For Sale. All routes require a JWT. */
@RestController
@RequestMapping("/api/messages")
public class MessagingController {

    @Autowired private MessagingService messaging;
    @Autowired private RateLimiter rateLimiter;

    private Long uid(HttpServletRequest r) { return (Long) r.getAttribute("jwtUserId"); }

    /** POST /conversations {targetType, targetId} → the (existing or new) thread. */
    @PostMapping("/conversations")
    public ResponseEntity<?> start(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = uid(request);
        if (userId == null) return unauthorized();
        try {
            String type = body.get("targetType") == null ? "GALLERY_IMAGE" : body.get("targetType").toString();
            Long targetId = Long.parseLong(String.valueOf(body.get("targetId")));
            return ResponseEntity.ok(messaging.startForItem(userId, type, targetId));
        } catch (Exception e) {
            return map(e);
        }
    }

    @GetMapping("/conversations")
    public ResponseEntity<?> list(HttpServletRequest request) {
        Long userId = uid(request);
        if (userId == null) return unauthorized();
        try { return ResponseEntity.ok(messaging.listMine(userId)); } catch (Exception e) { return map(e); }
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<?> get(@PathVariable Long id, HttpServletRequest request) {
        Long userId = uid(request);
        if (userId == null) return unauthorized();
        try { return ResponseEntity.ok(messaging.get(id, userId)); } catch (Exception e) { return map(e); }
    }

    /** GET /conversations/{id}/messages?after=<lastSeenId> — cheap poll. */
    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<?> messages(@PathVariable Long id, @RequestParam(required = false) Long after,
                                      HttpServletRequest request) {
        Long userId = uid(request);
        if (userId == null) return unauthorized();
        try {
            List<ConversationMessage> list = messaging.messages(id, userId, after);
            return ResponseEntity.ok(list);
        } catch (Exception e) { return map(e); }
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<?> send(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Long userId = uid(request);
        if (userId == null) return unauthorized();
        if (!rateLimiter.tryAcquire("msg:" + userId, 20, 60_000L)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(err("You're sending messages too quickly. Please wait a minute."));
        }
        try {
            String text = body.get("body") == null ? "" : body.get("body").toString();
            return ResponseEntity.ok(messaging.send(id, userId, text));
        } catch (Exception e) { return map(e); }
    }

    @PostMapping("/conversations/{id}/read")
    public ResponseEntity<?> read(@PathVariable Long id, HttpServletRequest request) {
        Long userId = uid(request);
        if (userId == null) return unauthorized();
        try { messaging.markRead(id, userId); return ResponseEntity.ok(Map.of("ok", true)); } catch (Exception e) { return map(e); }
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> unread(HttpServletRequest request) {
        Long userId = uid(request);
        if (userId == null) return unauthorized();
        return ResponseEntity.ok(Map.of("count", messaging.unreadCount(userId)));
    }

    // ── helpers ──
    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err("Authentication required"));
    }

    private ResponseEntity<?> map(Exception e) {
        if (e instanceof PlanLimitException) {
            Map<String, Object> m = new HashMap<>();
            m.put("error", e.getMessage());
            m.put("upgradeRequired", true);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(m);
        }
        if (e instanceof SecurityException) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(err(e.getMessage()));
        if (e instanceof NoSuchElementException) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err(e.getMessage()));
        if (e instanceof IllegalArgumentException || e instanceof IllegalStateException || e instanceof NumberFormatException) {
            return ResponseEntity.badRequest().body(err(e.getMessage()));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err(e.getMessage()));
    }

    private Map<String, String> err(String msg) {
        Map<String, String> m = new HashMap<>();
        m.put("error", msg);
        return m;
    }
}
