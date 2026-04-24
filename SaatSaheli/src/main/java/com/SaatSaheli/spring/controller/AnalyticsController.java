package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.SiteVisit;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.SiteVisitRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.util.RoleUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsController.class);

    @Autowired
    private SiteVisitRepository visitRepo;

    @Autowired
    private UserRepository userRepo;

    private Long getAuthUserId(HttpServletRequest request) {
        Object val = request.getAttribute("jwtUserId");
        return val instanceof Long ? (Long) val : null;
    }

    /**
     * POST /api/analytics/visit — Track a page visit (called from frontend on every page load)
     * No auth required — this tracks anonymous visitors too.
     */
    @PostMapping("/visit")
    public ResponseEntity<?> trackVisit(@RequestBody Map<String, Object> body) {
        try {
            SiteVisit visit = new SiteVisit();
            visit.setVisitorId(cap((String) body.get("visitorId"), 255));
            // Text columns in the entity, but cap defensively so a stale prod
            // schema with VARCHAR(255) doesn't drop the row.
            visit.setPagePath(cap((String) body.get("pagePath"), 2000));
            visit.setReferrer(cap((String) body.get("referrer"), 2000));
            visit.setUserAgent(cap((String) body.get("userAgent"), 2000));
            visit.setDevice(cap((String) body.get("device"), 32));
            visit.setBrowser(cap((String) body.get("browser"), 64));
            visit.setSessionId(cap((String) body.get("sessionId"), 128));
            if (body.get("userId") != null) {
                visit.setUserId(Long.valueOf(body.get("userId").toString()));
            }
            visit.setVisitedAt(LocalDateTime.now(ZoneOffset.UTC));
            visitRepo.save(visit);
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (Exception e) {
            log.error("Error tracking visit", e);
            return ResponseEntity.ok(Map.of("status", "ok")); // don't fail the client
        }
    }

    private static String cap(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    /**
     * GET /api/analytics/summary?days=7 — Get analytics summary (Admin only)
     */
    @GetMapping("/summary")
    public ResponseEntity<?> getSummary(
            @RequestParam(defaultValue = "7") int days,
            HttpServletRequest request) {
        try {
            User caller = verifyCaller(getAuthUserId(request));
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
            }

            LocalDateTime since = LocalDateTime.now().minusDays(days);

            long totalPageViews = visitRepo.countPageViewsSince(since);
            long uniqueVisitors = visitRepo.countUniqueVisitorsSince(since);
            long totalSessions = visitRepo.countSessionsSince(since);
            long anonymousVisitors = visitRepo.countAnonymousVisitorsSince(since);

            // Top pages
            List<Object[]> topPagesRaw = visitRepo.topPagesSince(since);
            List<Map<String, Object>> topPages = new ArrayList<>();
            for (Object[] row : topPagesRaw) {
                if (topPages.size() >= 10) break;
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("page", row[0]);
                entry.put("views", row[1]);
                topPages.add(entry);
            }

            // Device breakdown
            List<Object[]> devicesRaw = visitRepo.deviceBreakdownSince(since);
            Map<String, Long> devices = new LinkedHashMap<>();
            for (Object[] row : devicesRaw) {
                devices.put(row[0] != null ? (String) row[0] : "unknown", (Long) row[1]);
            }

            // Browser breakdown
            List<Object[]> browsersRaw = visitRepo.browserBreakdownSince(since);
            Map<String, Long> browsers = new LinkedHashMap<>();
            for (Object[] row : browsersRaw) {
                browsers.put(row[0] != null ? (String) row[0] : "unknown", (Long) row[1]);
            }

            // Daily stats
            List<Object[]> dailyRaw = visitRepo.dailyStatsSince(since);
            List<Map<String, Object>> dailyStats = new ArrayList<>();
            for (Object[] row : dailyRaw) {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("date", row[0] != null ? row[0].toString() : "");
                entry.put("pageViews", row[1]);
                entry.put("uniqueVisitors", row[2]);
                dailyStats.add(entry);
            }

            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("days", days);
            summary.put("totalPageViews", totalPageViews);
            summary.put("uniqueVisitors", uniqueVisitors);
            summary.put("totalSessions", totalSessions);
            summary.put("anonymousVisitors", anonymousVisitors);
            summary.put("loggedInVisitors", uniqueVisitors - anonymousVisitors);
            summary.put("topPages", topPages);
            summary.put("devices", devices);
            summary.put("browsers", browsers);
            summary.put("dailyStats", dailyStats);

            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            log.error("Error fetching analytics", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch analytics: " + e.getMessage()));
        }
    }

    /**
     * GET /api/analytics/recent?limit=50 — Get recent visits (Admin only)
     */
    @GetMapping("/recent")
    public ResponseEntity<?> getRecentVisits(
            @RequestParam(defaultValue = "50") int limit,
            HttpServletRequest request) {
        try {
            User caller = verifyCaller(getAuthUserId(request));
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
            }

            LocalDateTime since = LocalDateTime.now().minusHours(24);
            List<SiteVisit> visits = visitRepo.findByVisitedAtAfterOrderByVisitedAtDesc(since);
            if (visits.size() > limit) {
                visits = visits.subList(0, limit);
            }
            return ResponseEntity.ok(visits);
        } catch (Exception e) {
            log.error("Error fetching recent visits", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch recent visits"));
        }
    }

    private User verifyCaller(Long callerUserId) {
        try {
            if (callerUserId == null) return null;
            Optional<User> callerOpt = userRepo.findById(callerUserId);
            if (callerOpt.isEmpty()) return null;
            User caller = callerOpt.get();
            if (!RoleUtil.isAdmin(caller.getRole())) return null;
            return caller;
        } catch (Exception e) {
            return null;
        }
    }
}
