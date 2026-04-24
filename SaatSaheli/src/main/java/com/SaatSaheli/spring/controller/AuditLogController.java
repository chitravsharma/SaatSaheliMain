package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.config.SaatSaheliRevisionEntity;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.RevisionInfoRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.util.RoleUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Phase 1 placeholder for #24 SuperAdmin act-on-behalf audit trail.
 * Returns the shared revision_info rows — one per entity write, with
 * actor (real SA) + target (content owner) + timestamp + request path.
 * Phase 3 will add filters, per-entity diff joins, and a frontend tab.
 */
@RestController
@RequestMapping("/api/admin/audit-log")
public class AuditLogController {

    @Autowired
    private RevisionInfoRepository revisionRepo;

    @Autowired
    private UserRepository userRepo;

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(defaultValue = "100") int limit,
            HttpServletRequest request) {
        try {
            Long callerUserId = (Long) request.getAttribute("jwtUserId");
            if (callerUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error("Authentication required"));
            }
            Optional<User> callerOpt = userRepo.findById(callerUserId);
            if (callerOpt.isEmpty() || !RoleUtil.isSuperAdmin(callerOpt.get().getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("SuperAdmin access required"));
            }

            int capped = Math.max(1, Math.min(limit, 500));
            List<SaatSaheliRevisionEntity> revs = revisionRepo.findAllByOrderByTimestampDesc(
                    PageRequest.of(0, capped));

            List<Map<String, Object>> result = revs.stream().map(r -> {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("rev", r.getId());
                entry.put("timestamp", r.getTimestamp());
                entry.put("actorUserId", r.getActorUserId());
                entry.put("targetUserId", r.getTargetUserId());
                entry.put("requestPath", r.getRequestPath());
                return entry;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("Failed to load audit log: " + e.getMessage()));
        }
    }

    private Map<String, String> error(String msg) {
        Map<String, String> m = new HashMap<>();
        m.put("error", msg);
        return m;
    }
}
