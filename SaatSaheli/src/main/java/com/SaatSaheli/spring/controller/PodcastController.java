package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.Podcast;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.service.PodcastService;
import com.SaatSaheli.spring.util.RoleUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/podcasts")
public class PodcastController {

    private static final Logger log = LoggerFactory.getLogger(PodcastController.class);

    @Autowired
    private PodcastService podcastService;

    @Autowired
    private UserRepository userRepo;

    private Long getAuthUserId(HttpServletRequest request) {
        Object val = request.getAttribute("jwtUserId");
        return val instanceof Long ? (Long) val : null;
    }

    private ResponseEntity<?> requireAdmin(HttpServletRequest request) {
        Long callerUserId = getAuthUserId(request);
        if (callerUserId == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Authentication required"));
        }
        Optional<User> callerOpt = userRepo.findById(callerUserId);
        if (callerOpt.isEmpty() || !RoleUtil.isAdmin(callerOpt.get().getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
        }
        return null;
    }

    @PostMapping
    public ResponseEntity<?> createPodcast(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            ResponseEntity<?> denied = requireAdmin(request);
            if (denied != null) return denied;
            Long userId = Long.valueOf(body.get("userId").toString());
            String title = (String) body.get("title");
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Title is required"));
            }
            String description = (String) body.get("description");
            String audioUrl = (String) body.get("audioUrl");
            String coverImageUrl = (String) body.get("coverImageUrl");
            String language = (String) body.get("language");
            String category = (String) body.get("category");
            String status = (String) body.get("status");
            Integer durationSeconds = body.get("durationSeconds") != null
                    ? Integer.valueOf(body.get("durationSeconds").toString()) : null;

            Podcast podcast = podcastService.createPodcast(userId, title, description, audioUrl,
                    coverImageUrl, language, category, status, durationSeconds);
            return ResponseEntity.ok(podcast);
        } catch (Exception e) {
            log.error("Error creating podcast", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePodcast(@PathVariable Long id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            ResponseEntity<?> denied = requireAdmin(request);
            if (denied != null) return denied;
            Long userId = body.get("userId") != null ? Long.valueOf(body.get("userId").toString()) : null;
            String title = (String) body.get("title");
            String description = (String) body.get("description");
            String audioUrl = (String) body.get("audioUrl");
            String coverImageUrl = (String) body.get("coverImageUrl");
            String language = (String) body.get("language");
            String category = (String) body.get("category");
            String status = (String) body.get("status");
            Integer durationSeconds = body.get("durationSeconds") != null
                    ? Integer.valueOf(body.get("durationSeconds").toString()) : null;

            Podcast podcast = podcastService.updatePodcast(id, userId, title, description, audioUrl,
                    coverImageUrl, language, category, status, durationSeconds);
            return ResponseEntity.ok(podcast);
        } catch (Exception e) {
            log.error("Error updating podcast", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePodcast(@PathVariable Long id, @RequestParam Long userId, HttpServletRequest request) {
        try {
            ResponseEntity<?> denied = requireAdmin(request);
            if (denied != null) return denied;
            podcastService.deletePodcast(id, userId);
            return ResponseEntity.ok(Map.of("message", "Podcast deleted"));
        } catch (Exception e) {
            log.error("Error deleting podcast", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllPodcasts() {
        try {
            return ResponseEntity.ok(podcastService.getAllPodcasts());
        } catch (Exception e) {
            log.error("Error fetching podcasts", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPodcast(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(podcastService.getPodcast(id));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getPodcastsByUser(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(podcastService.getPodcastsByUser(userId));
        } catch (Exception e) {
            log.error("Error fetching user podcasts", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/language/{language}")
    public ResponseEntity<?> getPodcastsByLanguage(@PathVariable String language) {
        try {
            return ResponseEntity.ok(podcastService.getPodcastsByLanguage(language));
        } catch (Exception e) {
            log.error("Error fetching podcasts by language", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<?> getPodcastsByCategory(@PathVariable String category) {
        try {
            return ResponseEntity.ok(podcastService.getPodcastsByCategory(category));
        } catch (Exception e) {
            log.error("Error fetching podcasts by category", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
