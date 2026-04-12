package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.service.SocialService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/social")
public class SocialController {

    @Autowired
    private SocialService socialService;

    // ── Likes ──

    @PostMapping("/like")
    public ResponseEntity<?> toggleLike(@RequestBody Map<String, Object> body) {
        try {
            String targetType = (String) body.get("targetType");
            Long targetId = Long.parseLong(body.get("targetId").toString());
            Long userId;
            if (body.get("userId") != null && !body.get("userId").toString().isEmpty()) {
                userId = Long.parseLong(body.get("userId").toString());
            } else if (body.get("anonId") != null) {
                // Use negative hash of anonId to avoid collision with real user IDs
                userId = (long) -Math.abs(body.get("anonId").toString().hashCode());
            } else {
                return ResponseEntity.badRequest().body(errorMap("userId or anonId required"));
            }
            return ResponseEntity.ok(socialService.toggleLike(userId, targetType, targetId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    @GetMapping("/like")
    public ResponseEntity<?> getLikeStatus(
            @RequestParam(required = false) Long userId,
            @RequestParam String targetType,
            @RequestParam Long targetId) {
        try {
            return ResponseEntity.ok(socialService.getLikeStatus(userId, targetType, targetId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    // ── Comments ──

    @PostMapping("/comment")
    public ResponseEntity<?> addComment(@RequestBody Map<String, Object> body) {
        try {
            String targetType = (String) body.get("targetType");
            Long targetId = Long.parseLong(body.get("targetId").toString());
            String content = (String) body.get("content");
            if (content == null || content.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Comment content is required"));
            }
            Long userId;
            String guestName = null;
            if (body.get("userId") != null && !body.get("userId").toString().isEmpty()) {
                userId = Long.parseLong(body.get("userId").toString());
            } else if (body.get("anonId") != null) {
                userId = (long) -Math.abs(body.get("anonId").toString().hashCode());
                guestName = body.get("guestName") != null ? body.get("guestName").toString().trim() : "Guest";
                if (guestName.isEmpty()) guestName = "Guest";
            } else {
                return ResponseEntity.badRequest().body(errorMap("userId or anonId required"));
            }
            return ResponseEntity.ok(socialService.addComment(userId, targetType, targetId, content.trim(), guestName));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    @GetMapping("/comments")
    public ResponseEntity<?> getComments(
            @RequestParam String targetType,
            @RequestParam Long targetId) {
        try {
            return ResponseEntity.ok(socialService.getComments(targetType, targetId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    @DeleteMapping("/comment/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable Long commentId, @RequestParam Long userId) {
        try {
            socialService.deleteComment(commentId, userId);
            return ResponseEntity.ok(Map.of("message", "Comment deleted"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        }
    }

    // ── Favorites ──

    @PostMapping("/favorite")
    public ResponseEntity<?> toggleFavorite(@RequestBody Map<String, Object> body) {
        try {
            String targetType = (String) body.get("targetType");
            Long targetId = Long.parseLong(body.get("targetId").toString());
            Long userId;
            if (body.get("userId") != null && !body.get("userId").toString().isEmpty()) {
                userId = Long.parseLong(body.get("userId").toString());
            } else if (body.get("anonId") != null) {
                userId = (long) -Math.abs(body.get("anonId").toString().hashCode());
            } else {
                return ResponseEntity.badRequest().body(errorMap("userId or anonId required"));
            }
            return ResponseEntity.ok(socialService.toggleFavorite(userId, targetType, targetId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    @GetMapping("/favorite")
    public ResponseEntity<?> getFavoriteStatus(
            @RequestParam(required = false) Long userId,
            @RequestParam String targetType,
            @RequestParam Long targetId) {
        try {
            return ResponseEntity.ok(socialService.getFavoriteStatus(userId, targetType, targetId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    @GetMapping("/favorites")
    public ResponseEntity<?> getUserFavorites(
            @RequestParam Long userId,
            @RequestParam String targetType) {
        try {
            return ResponseEntity.ok(socialService.getUserFavorites(userId, targetType));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    // ── Bulk counts (for home page) ──

    @GetMapping("/counts")
    public ResponseEntity<?> getCounts(@RequestParam String targetType) {
        try {
            Map<String, Object> result = new HashMap<>();
            result.put("likes", socialService.getLikeCountsForType(targetType));
            result.put("comments", socialService.getCommentCountsForType(targetType));
            return ResponseEntity.ok(result);
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
