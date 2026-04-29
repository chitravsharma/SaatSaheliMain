package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.HeroSlide;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.service.HeroSlideService;
import com.SaatSaheli.spring.util.RoleUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/hero-slides")
public class HeroSlideController {

    private static final Logger log = LoggerFactory.getLogger(HeroSlideController.class);

    @Autowired
    private HeroSlideService heroSlideService;

    @Autowired
    private UserRepository userRepo;

    private Long getAuthUserId(HttpServletRequest request) {
        Object val = request.getAttribute("jwtUserId");
        return val instanceof Long ? (Long) val : null;
    }

    private ResponseEntity<?> requireAdmin(HttpServletRequest request) {
        Long callerId = getAuthUserId(request);
        if (callerId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Authentication required"));
        }
        Optional<User> opt = userRepo.findById(callerId);
        if (opt.isEmpty() || !RoleUtil.isAdmin(opt.get().getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
        }
        return null;
    }

    // Public: only slots with a non-empty imageUrl, ordered by slot.
    @GetMapping
    public ResponseEntity<?> getActiveSlides() {
        try {
            return ResponseEntity.ok(heroSlideService.getActiveSlots());
        } catch (Exception e) {
            log.error("Failed to load hero slides", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to load hero slides"));
        }
    }

    // Admin: all 8 slots (including empty) for the editor.
    @GetMapping("/all")
    public ResponseEntity<?> getAllSlots(HttpServletRequest request) {
        ResponseEntity<?> denied = requireAdmin(request);
        if (denied != null) return denied;
        try {
            return ResponseEntity.ok(heroSlideService.getAllSlots());
        } catch (Exception e) {
            log.error("Failed to load all hero slides", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to load hero slides"));
        }
    }

    // Admin: replace all 8 slots in one request. Body: { "slides": [{slot,name,imageUrl}, ...] }
    @PutMapping
    public ResponseEntity<?> upsertAll(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        ResponseEntity<?> denied = requireAdmin(request);
        if (denied != null) return denied;
        try {
            Object raw = body.get("slides");
            if (!(raw instanceof List<?> rawList)) {
                return ResponseEntity.badRequest().body(errorMap("slides array required"));
            }
            List<Map<String, Object>> incoming = new java.util.ArrayList<>();
            for (Object o : rawList) {
                if (o instanceof Map<?, ?> m) {
                    Map<String, Object> typed = new HashMap<>();
                    for (Map.Entry<?, ?> e : m.entrySet()) typed.put(String.valueOf(e.getKey()), e.getValue());
                    incoming.add(typed);
                }
            }
            List<HeroSlide> result = heroSlideService.upsertAll(incoming, getAuthUserId(request));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to save hero slides", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to save hero slides: " + e.getMessage()));
        }
    }

    // Admin: resolve a single sourceUrl → image URL without saving (for live preview).
    @PostMapping("/resolve")
    public ResponseEntity<?> resolve(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        ResponseEntity<?> denied = requireAdmin(request);
        if (denied != null) return denied;
        String url = body.get("url") == null ? null : String.valueOf(body.get("url"));
        String resolved = heroSlideService.resolveSourceUrl(url);
        Map<String, Object> resp = new HashMap<>();
        resp.put("sourceUrl", url);
        resp.put("imageUrl", resolved);
        return ResponseEntity.ok(resp);
    }

    // Admin: clear a single slot.
    @DeleteMapping("/{slot}")
    public ResponseEntity<?> clearSlot(@PathVariable Integer slot, HttpServletRequest request) {
        ResponseEntity<?> denied = requireAdmin(request);
        if (denied != null) return denied;
        try {
            Optional<HeroSlide> updated = heroSlideService.clearSlot(slot, getAuthUserId(request));
            if (updated.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Slot not found"));
            }
            return ResponseEntity.ok(updated.get());
        } catch (Exception e) {
            log.error("Failed to clear hero slide", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to clear slot: " + e.getMessage()));
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
