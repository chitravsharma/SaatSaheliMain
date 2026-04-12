package com.SaatSaheli.spring.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.SaatSaheli.spring.model.Advertisement;
import com.SaatSaheli.spring.service.AdvertisementService;

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
    public ResponseEntity<?> createAdvertisement(@RequestBody Map<String, Object> body) {
        try {
            Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId").toString()) : null;
            String title = (String) body.get("title");

            if (userId == null) {
                return ResponseEntity.badRequest().body(errorMap("userId is required"));
            }
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Title is required"));
            }

            String contentType = (String) body.get("contentType");
            String htmlContent = (String) body.get("htmlContent");
            String imageUrl = (String) body.get("imageUrl");
            String linkUrl = (String) body.get("linkUrl");
            String animation = (String) body.get("animation");
            Boolean active = body.get("active") != null ? Boolean.parseBoolean(body.get("active").toString()) : true;

            Advertisement ad = adService.createAdvertisement(userId, title.trim(), contentType,
                    htmlContent, imageUrl, linkUrl, animation, active);
            return ResponseEntity.ok(ad);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create advertisement: " + e.getMessage()));
        }
    }

    // Admin: update advertisement
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAdvertisement(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            String title = (String) body.get("title");
            String contentType = (String) body.get("contentType");
            String htmlContent = (String) body.get("htmlContent");
            String imageUrl = (String) body.get("imageUrl");
            String linkUrl = (String) body.get("linkUrl");
            String animation = (String) body.get("animation");
            Boolean active = body.get("active") != null ? Boolean.parseBoolean(body.get("active").toString()) : null;

            Advertisement ad = adService.updateAdvertisement(id, title, contentType, htmlContent,
                    imageUrl, linkUrl, animation, active);
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
    public ResponseEntity<?> toggleActive(@PathVariable Long id) {
        try {
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
    public ResponseEntity<?> deleteAdvertisement(@PathVariable Long id) {
        try {
            adService.deleteAdvertisement(id);
            return ResponseEntity.ok(Map.of("message", "Advertisement deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete advertisement: " + e.getMessage()));
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
