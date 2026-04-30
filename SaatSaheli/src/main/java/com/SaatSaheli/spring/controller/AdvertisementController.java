package com.SaatSaheli.spring.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.SaatSaheli.spring.model.Advertisement;
import com.SaatSaheli.spring.service.AdvertisementService;
import com.SaatSaheli.spring.util.RoleUtil;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/advertisements")
public class AdvertisementController {

    @Autowired
    private AdvertisementService adService;

    // Public: get active advertisements (for Home page)
    @GetMapping("/active")
    public ResponseEntity<?> getActiveAdvertisements() {
        try {
            return ResponseEntity.ok(adService.getActiveAdvertisements());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get advertisements: " + e.getMessage()));
        }
    }

    // Public: get active advertisements for a specific placement slot
    @GetMapping("/active/{placement}")
    public ResponseEntity<?> getActiveAdvertisementsByPlacement(@PathVariable String placement) {
        try {
            return ResponseEntity.ok(adService.getActiveAdvertisementsByPlacement(placement));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get advertisements: " + e.getMessage()));
        }
    }

    // Admin: get all advertisements
    @GetMapping
    public ResponseEntity<?> getAllAdvertisements() {
        try {
            return ResponseEntity.ok(adService.getAllAdvertisements());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get advertisements: " + e.getMessage()));
        }
    }

    // Get single advertisement by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getAdvertisement(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(adService.getAdvertisement(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get advertisement: " + e.getMessage()));
        }
    }

    // Admin: create advertisement
    @PostMapping
    public ResponseEntity<?> createAdvertisement(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            ResponseEntity<?> guard = guardAdmin(request);
            if (guard != null) return guard;
            Long userId = (Long) request.getAttribute("jwtUserId");

            String title = (String) body.get("title");
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Title is required"));
            }

            String contentType = (String) body.get("contentType");
            String htmlContent = (String) body.get("htmlContent");
            String imageUrl = (String) body.get("imageUrl");
            String linkUrl = (String) body.get("linkUrl");
            String animation = (String) body.get("animation");
            String placement = (String) body.get("placement");
            Integer width = parseIntOrNull(body.get("width"));
            Integer height = parseIntOrNull(body.get("height"));
            Boolean active = body.get("active") != null ? Boolean.parseBoolean(body.get("active").toString()) : true;

            Advertisement ad = adService.createAdvertisement(userId, title.trim(), contentType,
                    htmlContent, imageUrl, linkUrl, animation, placement, width, height, active);
            return ResponseEntity.ok(ad);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create advertisement: " + e.getMessage()));
        }
    }

    // Admin: update advertisement
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAdvertisement(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            ResponseEntity<?> guard = guardAdmin(request);
            if (guard != null) return guard;
            String title = (String) body.get("title");
            String contentType = (String) body.get("contentType");
            String htmlContent = (String) body.get("htmlContent");
            String imageUrl = (String) body.get("imageUrl");
            String linkUrl = (String) body.get("linkUrl");
            String animation = (String) body.get("animation");
            String placement = (String) body.get("placement");
            Integer width = parseIntOrNull(body.get("width"));
            Integer height = parseIntOrNull(body.get("height"));
            Boolean active = body.get("active") != null ? Boolean.parseBoolean(body.get("active").toString()) : null;

            Advertisement ad = adService.updateAdvertisement(id, title, contentType, htmlContent,
                    imageUrl, linkUrl, animation, placement, width, height, active);
            return ResponseEntity.ok(ad);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update advertisement: " + e.getMessage()));
        }
    }

    // Admin: toggle active status
    @PutMapping("/{id}/toggle")
    public ResponseEntity<?> toggleActive(@PathVariable Long id, HttpServletRequest request) {
        try {
            ResponseEntity<?> guard = guardAdmin(request);
            if (guard != null) return guard;
            Advertisement ad = adService.toggleActive(id);
            return ResponseEntity.ok(ad);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to toggle advertisement: " + e.getMessage()));
        }
    }

    // Admin: delete advertisement
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAdvertisement(@PathVariable Long id, HttpServletRequest request) {
        try {
            ResponseEntity<?> guard = guardAdmin(request);
            if (guard != null) return guard;
            adService.deleteAdvertisement(id);
            return ResponseEntity.ok(Map.of("message", "Advertisement deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete advertisement: " + e.getMessage()));
        }
    }

    /**
     * Guard helper: returns null if the request has a valid JWT for an
     * admin/super-admin user, otherwise returns the appropriate error response
     * (401 if no token, 403 if token belongs to a non-admin).
     * Body.userId is no longer accepted — caller identity comes only from the JWT.
     */
    private ResponseEntity<?> guardAdmin(HttpServletRequest request) {
        Long jwtUserId = (Long) request.getAttribute("jwtUserId");
        String jwtRole = (String) request.getAttribute("jwtRole");
        if (jwtUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
        }
        if (!RoleUtil.isAdmin(jwtRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin role required"));
        }
        return null;
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }

    private Integer parseIntOrNull(Object v) {
        if (v == null) return null;
        String s = v.toString().trim();
        if (s.isEmpty()) return null;
        try { return Integer.valueOf(s); } catch (NumberFormatException e) { return null; }
    }
}
