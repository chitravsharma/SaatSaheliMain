package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.service.QuotaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** GET /api/account/usage — the caller's plan limits + current usage (Account page meter). */
@RestController
@RequestMapping("/api/account")
public class AccountUsageController {

    @Autowired
    private QuotaService quotaService;

    @GetMapping("/usage")
    public ResponseEntity<?> usage(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("jwtUserId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }
        return ResponseEntity.ok(quotaService.usageFor(userId).toMap());
    }
}
