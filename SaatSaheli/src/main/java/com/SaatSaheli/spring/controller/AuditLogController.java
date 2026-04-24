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
import java.util.stream.Collectors;

/**
 * #24 Phase 3 — SuperAdmin-only feed of the Envers revision_info table so the
 * frontend admin console can render an "Audit Log" tab. Returns the most
 * recent N rows, filterable by actor, target, path substring, and timestamp
 * range, enriched with actor/target display names from the users table.
 * Per-entity diff (_aud row join) is deferred to a later pass.
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
            @RequestParam(defaultValue = "200") int limit,
            @RequestParam(required = false) Long actorUserId,
            @RequestParam(required = false) Long targetUserId,
            @RequestParam(required = false) String pathContains,
            @RequestParam(required = false) Long sinceMs,
            @RequestParam(required = false) Long untilMs,
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

            // Fetch a generous slice ordered by timestamp, then filter in memory.
            // revision_info grows linearly with writes; at community scale the
            // top 2000 rows is trivially cheap to scan for an admin UI probe.
            int fetchSize = Math.max(limit, 500) * 4;
            List<SaatSaheliRevisionEntity> revs = revisionRepo.findAllByOrderByTimestampDesc(
                    PageRequest.of(0, Math.min(fetchSize, 2000)));

            String needle = pathContains == null ? null : pathContains.trim().toLowerCase();
            List<SaatSaheliRevisionEntity> filtered = revs.stream()
                    .filter(r -> actorUserId == null || actorUserId.equals(r.getActorUserId()))
                    .filter(r -> targetUserId == null || targetUserId.equals(r.getTargetUserId()))
                    .filter(r -> sinceMs == null || r.getTimestamp() >= sinceMs)
                    .filter(r -> untilMs == null || r.getTimestamp() <= untilMs)
                    .filter(r -> needle == null || needle.isEmpty()
                            || (r.getRequestPath() != null && r.getRequestPath().toLowerCase().contains(needle)))
                    .limit(Math.max(1, Math.min(limit, 500)))
                    .toList();

            // Enrich with display names. One lookup per unique userId referenced.
            var userIdsSet = filtered.stream()
                    .flatMap(r -> java.util.stream.Stream.of(r.getActorUserId(), r.getTargetUserId()))
                    .filter(id -> id != null)
                    .collect(Collectors.toSet());
            Map<Long, String> nameById = userRepo.findAllById(userIdsSet).stream()
                    .collect(Collectors.toMap(User::getId, AuditLogController::displayNameOf, (a, b) -> a));

            List<Map<String, Object>> result = filtered.stream().map(r -> {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("rev", r.getId());
                entry.put("timestamp", r.getTimestamp());
                entry.put("actorUserId", r.getActorUserId());
                entry.put("actorName", r.getActorUserId() == null ? null : nameById.get(r.getActorUserId()));
                entry.put("targetUserId", r.getTargetUserId());
                entry.put("targetName", r.getTargetUserId() == null ? null : nameById.get(r.getTargetUserId()));
                entry.put("requestPath", r.getRequestPath());
                entry.put("impersonated", r.getActorUserId() != null
                        && r.getTargetUserId() != null
                        && !r.getActorUserId().equals(r.getTargetUserId()));
                return entry;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("Failed to load audit log: " + e.getMessage()));
        }
    }

    private static String displayNameOf(User u) {
        if (u == null) return null;
        String dn = u.getDisplayName();
        if (dn != null && !dn.isBlank()) return dn;
        String full = ((u.getFirstName() == null ? "" : u.getFirstName())
                + " " + (u.getLastName() == null ? "" : u.getLastName())).trim();
        return full.isEmpty() ? u.getEmail() : full;
    }

    private Map<String, String> error(String msg) {
        Map<String, String> m = new HashMap<>();
        m.put("error", msg);
        return m;
    }
}
