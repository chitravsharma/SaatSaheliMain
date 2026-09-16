package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.service.MediaStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FileUploadController {

    @Autowired
    private MediaStorageService mediaStorage;

    @Autowired
    private com.SaatSaheli.spring.service.QuotaService quotaService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file,
                                        jakarta.servlet.http.HttpServletRequest request) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        try {
            com.SaatSaheli.spring.util.UploadValidator.requireSafeImage(file);
            // Storage quota (plan-based). Context of the upload is unknown here, so
            // only the byte budget is checked; picture counts are enforced per feature.
            quotaService.assertCanStore((Long) request.getAttribute("jwtUserId"), file.getSize());
            String url = mediaStorage.uploadFile(file);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (com.SaatSaheli.spring.util.PlanLimitException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", e.getMessage(), "upgradeRequired", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }
}
