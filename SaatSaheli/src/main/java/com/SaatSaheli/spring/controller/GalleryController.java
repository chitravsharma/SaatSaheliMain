package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.Gallery;
import com.SaatSaheli.spring.model.GalleryImage;
import com.SaatSaheli.spring.service.MediaStorageService;
import com.SaatSaheli.spring.service.GalleryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/galleries")
public class GalleryController {

    @Autowired
    private GalleryService galleryService;

    @Autowired
    private MediaStorageService mediaStorage;

    @GetMapping
    public ResponseEntity<?> getPublishedGalleries() {
        try {
            return ResponseEntity.ok(galleryService.getPublishedGalleries());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getGallery(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(galleryService.getGallery(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
        }
    }

    /**
     * A user's galleries. Public by design (profile pages are open to anyone), but
     * drafts belong to their owner: the service returns them only to that owner or an
     * admin. The JwtInterceptor stamps jwtUserId/jwtRole when a token is present;
     * both stay null for anonymous callers, who therefore see published work only.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserGalleries(@PathVariable Long userId, HttpServletRequest request) {
        try {
            Long callerId = (Long) request.getAttribute("jwtUserId");
            Object role = request.getAttribute("jwtRole");
            String callerRole = (role instanceof String) ? (String) role : null;
            return ResponseEntity.ok(galleryService.getGalleriesByUser(userId, callerId, callerRole));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createGallery(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            Long jwtUserId = (Long) request.getAttribute("jwtUserId");
            if (jwtUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
            }
            Object bodyUserId = body.get("userId");
            if (bodyUserId != null) {
                Long parsed = Long.parseLong(bodyUserId.toString());
                if (!jwtUserId.equals(parsed)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(errorMap("Body userId does not match authenticated user"));
                }
            }
            String title = (String) body.get("title");
            String description = (String) body.get("description");
            String status = body.get("status") == null ? null : body.get("status").toString();
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Title is required"));
            }
            Gallery gallery = galleryService.createGallery(title.trim(), description, jwtUserId, status);
            return ResponseEntity.ok(gallery);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateGallery(@PathVariable Long id, @RequestBody Map<String, String> body,
                                           HttpServletRequest request) {
        try {
            Long jwtUserId = (Long) request.getAttribute("jwtUserId");
            if (jwtUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
            }
            String bodyUserId = body.get("userId");
            if (bodyUserId != null) {
                Long parsed = Long.parseLong(bodyUserId);
                if (!jwtUserId.equals(parsed)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(errorMap("Body userId does not match authenticated user"));
                }
            }
            String title = body.get("title");
            String description = body.get("description");
            String status = body.get("status");
            return ResponseEntity.ok(galleryService.updateGallery(id, title, description, status, jwtUserId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteGallery(@PathVariable Long id, @RequestParam(required = false) Long userId) {
        try {
            galleryService.deleteGallery(id, userId);
            return ResponseEntity.ok(Map.of("message", "Gallery deleted"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        }
    }

    @PostMapping("/{galleryId}/images")
    public ResponseEntity<?> addImage(
            @PathVariable Long galleryId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "userId", required = false) Long userId) {
        if (isHeicLike(file)) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .body(errorMap("HEIC/HEIF images aren't supported in browsers. Please convert to JPEG or PNG before uploading."));
        }
        try {
            com.SaatSaheli.spring.util.UploadValidator.requireSafeImage(file);
            String imageUrl = mediaStorage.uploadFile(file);
            GalleryImage img = galleryService.addImage(galleryId, imageUrl, caption, userId);
            return ResponseEntity.ok(img);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(errorMap(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    @DeleteMapping("/images/{imageId}")
    public ResponseEntity<?> removeImage(@PathVariable Long imageId, @RequestParam(required = false) Long userId) {
        try {
            galleryService.removeImage(imageId, userId);
            return ResponseEntity.ok(Map.of("message", "Image removed"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        }
    }

    @PutMapping("/images/{imageId}")
    public ResponseEntity<?> updateImageCaption(
            @PathVariable Long imageId,
            @RequestBody Map<String, Object> body) {
        try {
            String caption = (String) body.get("caption");
            Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId").toString()) : null;
            return ResponseEntity.ok(galleryService.updateImageCaption(imageId, caption, userId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap(e.getMessage()));
        }
    }

    // HEIC/HEIF detection. Browsers other than Safari can't decode these, so reject at upload
    // rather than store a file the gallery grid will render as "Image unavailable".
    // Check both content type and extension because some browsers send application/octet-stream for HEIC.
    private boolean isHeicLike(MultipartFile file) {
        if (file == null) return false;
        String ct = file.getContentType();
        if (ct != null) {
            String c = ct.toLowerCase();
            if (c.contains("heic") || c.contains("heif")) return true;
        }
        String name = file.getOriginalFilename();
        if (name != null) {
            String n = name.toLowerCase();
            if (n.endsWith(".heic") || n.endsWith(".heif")) return true;
        }
        return false;
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
