package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.util.RoleUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

/**
 * Proxy endpoint for downloading files.
 * Only SUPER_ADMIN users are allowed to download content.
 */
@RestController
@RequestMapping("/api/download")
public class DownloadController {

    @Autowired
    private UserRepository userRepo;

    private final RestTemplate restTemplate = new RestTemplate();

    private Long getAuthUserId(HttpServletRequest request) {
        Object val = request.getAttribute("jwtUserId");
        return val instanceof Long ? (Long) val : null;
    }

    @GetMapping
    public ResponseEntity<?> downloadFile(
            @RequestParam("url") String fileUrl,
            HttpServletRequest request) {

        // Verify user is SUPER_ADMIN via JWT
        Long userId = getAuthUserId(request);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        Optional<User> userOpt = userRepo.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not found"));
        }

        if (!RoleUtil.isSuperAdmin(userOpt.get().getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Only Super Admin users can download content"));
        }

        try {
            // Fetch the file and proxy it back
            byte[] fileBytes = restTemplate.getForObject(fileUrl, byte[].class);
            if (fileBytes == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "File not found"));
            }

            String filename = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
            if (filename.contains("?")) filename = filename.substring(0, filename.indexOf('?'));

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(fileBytes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Download failed: " + e.getMessage()));
        }
    }
}
