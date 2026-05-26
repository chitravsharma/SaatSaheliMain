package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.ContactMessage;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.ContactMessageRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.service.EmailService;
import com.SaatSaheli.spring.service.RecaptchaService;
import com.SaatSaheli.spring.util.RateLimiter;
import com.SaatSaheli.spring.util.RoleUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.PageRequest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/contact")
public class ContactController {

    private static final Logger log = LoggerFactory.getLogger(ContactController.class);

    @Autowired
    private ContactMessageRepository contactRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private EmailService emailService;

    @Autowired
    private RateLimiter rateLimiter;

    @Autowired
    private RecaptchaService recaptchaService;

    private Long getAuthUserId(HttpServletRequest request) {
        Object val = request.getAttribute("jwtUserId");
        return val instanceof Long ? (Long) val : null;
    }

    /**
     * POST /api/contact — Submit a contact form message (public endpoint)
     */
    @PostMapping
    public ResponseEntity<?> submitContactForm(@RequestBody Map<String, String> body, HttpServletRequest request) {
        try {
            // Authenticated callers (e.g. logged-in users submitting via the magazine
            // form) have already proven they're human at login — skip honeypot +
            // reCAPTCHA for them. Rate limit still applies as compromised-account
            // / abuse defense.
            boolean authenticated = getAuthUserId(request) != null;

            // Honeypot check — bots fill hidden fields, real users don't
            if (!authenticated) {
                String honeypot = body.get("website");
                if (honeypot != null && !honeypot.trim().isEmpty()) {
                    log.warn("Honeypot field filled from IP {} — possible bot or autofill", request.getRemoteAddr());
                    return ResponseEntity.badRequest()
                            .body(errorMap("Something went wrong with your submission. Please clear the form and try again."));
                }
            }

            // Rate limit: 5 submissions per 15 minutes per IP
            String clientIp = request.getRemoteAddr();
            if (!rateLimiter.tryAcquire("contact_" + clientIp)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(errorMap("Too many submissions. Please try again in a few minutes."));
            }

            // reCAPTCHA — must come before any DB writes
            if (!authenticated) {
                String recaptchaToken = body.get("recaptchaToken");
                if (!recaptchaService.verify(recaptchaToken, clientIp)) {
                    return ResponseEntity.badRequest()
                            .body(errorMap("Please complete the reCAPTCHA challenge."));
                }
            }

            String name = body.get("name");
            String email = body.get("email");
            String subject = body.get("subject");
            String message = body.get("message");

            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Name is required"));
            }
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Email is required"));
            }
            if (message == null || message.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Message is required"));
            }

            // Basic email format validation
            if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                return ResponseEntity.badRequest().body(errorMap("Please enter a valid email address"));
            }

            String rating = body.get("rating");
            String category = body.get("category");

            String trimmedEmail = email.trim();
            String trimmedSubject = subject != null ? subject.trim() : "";

            // Idempotency: skip if an identical submission landed within the last 60 seconds.
            // Catches double-clicks, proxy/CDN retries on 5xx, and rapid user re-submits.
            LocalDateTime dedupeWindowStart = LocalDateTime.now(ZoneOffset.UTC).minusSeconds(60);
            Optional<ContactMessage> recentDuplicate = contactRepo
                    .findFirstByEmailAndSubjectAndCreatedDateAfterOrderByCreatedDateDesc(
                            trimmedEmail, trimmedSubject, dedupeWindowStart);
            if (recentDuplicate.isPresent()) {
                ContactMessage existing = recentDuplicate.get();
                log.info("Duplicate contact submission suppressed for {} (subject: {})", trimmedEmail, trimmedSubject);
                Map<String, String> response = new HashMap<>();
                response.put("message", "Thank you for reaching out! We'll get back to you soon.");
                response.put("trackingId", formatTrackingId(existing.getId(), existing.getSubject()));
                return ResponseEntity.ok(response);
            }

            ContactMessage contact = new ContactMessage();
            contact.setName(name.trim());
            contact.setEmail(trimmedEmail);
            contact.setSubject(trimmedSubject);
            contact.setMessage(message.trim());
            contact.setRating(rating != null && !rating.trim().isEmpty() ? rating.trim() : null);
            contact.setCategory(category != null && !category.trim().isEmpty() ? category.trim() : null);
            contact.setCreatedDate(LocalDateTime.now(ZoneOffset.UTC));
            contactRepo.save(contact);

            // Tracking id is derived from the auto-generated row id + subject — single
            // source of truth, no separate column to keep in sync.
            String trackingId = formatTrackingId(contact.getId(), trimmedSubject);
            log.info("Contact form submission from {} ({}) — tracking {}", name.trim(), trimmedEmail, trackingId);

            // Notify admin via email. The submission is already persisted, so an email
            // failure must NOT fail the request — otherwise the client retries and we
            // end up with duplicate rows in the support queries table.
            try {
                emailService.sendContactNotification(name.trim(), trimmedEmail, contact.getSubject(), message.trim());
            } catch (Exception emailErr) {
                log.warn("Failed to send contact notification email (submission #{} still saved): {}",
                        contact.getId(), emailErr.getMessage());
            }

            Map<String, String> response = new HashMap<>();
            response.put("message", "Thank you for reaching out! We'll get back to you soon.");
            response.put("trackingId", trackingId);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to save contact message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to send message. Please try again later."));
        }
    }

    /**
     * GET /api/contact/reviews — Public endpoint: recent feedback with ratings (name + rating + message only)
     */
    @GetMapping("/reviews")
    public ResponseEntity<?> getRecentReviews(@RequestParam(defaultValue = "10") int limit) {
        try {
            int safeLimit = Math.min(Math.max(limit, 1), 20);
            List<ContactMessage> reviews = contactRepo.findByRatingIsNotNullAndStatusOrderByCreatedDateDesc(
                    "COMPLETED", PageRequest.of(0, safeLimit));

            // Return only safe public fields (no email)
            List<Map<String, Object>> publicReviews = reviews.stream().map(r -> {
                Map<String, Object> m = new HashMap<>();
                m.put("name", r.getName());
                m.put("rating", r.getRating());
                m.put("category", r.getCategory());
                m.put("message", r.getMessage());
                m.put("createdDate", r.getCreatedDate());
                return m;
            }).toList();

            return ResponseEntity.ok(publicReviews);
        } catch (Exception e) {
            log.error("Failed to fetch recent reviews", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to fetch reviews"));
        }
    }

    /**
     * GET /api/contact — List all contact messages (Admin only)
     */
    @GetMapping
    public ResponseEntity<?> getContactMessages(HttpServletRequest request) {
        try {
            Long callerUserId = getAuthUserId(request);
            if (callerUserId == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Authentication required"));
            }
            Optional<User> callerOpt = userRepo.findById(callerUserId);
            if (callerOpt.isEmpty() || !RoleUtil.isAdmin(callerOpt.get().getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }

            List<ContactMessage> messages = contactRepo.findAllByOrderByCreatedDateDesc();
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to fetch contact messages"));
        }
    }

    private static final List<String> VALID_STATUSES = List.of(
            "NEW", "IN_PROGRESS", "CANCELLED", "APPOINTMENT_SETUP", "COMPLETED", "IN_REVIEW"
    );

    /**
     * PUT /api/contact/{id}/status — Update status of a contact message (Admin only)
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateContactStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        try {
            Long callerUserId = getAuthUserId(request);
            if (callerUserId == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Authentication required"));
            }
            Optional<User> callerOpt = userRepo.findById(callerUserId);
            if (callerOpt.isEmpty() || !RoleUtil.isAdmin(callerOpt.get().getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }

            String newStatus = body.get("status");
            if (newStatus == null || !VALID_STATUSES.contains(newStatus)) {
                return ResponseEntity.badRequest().body(errorMap("Invalid status. Valid values: " + VALID_STATUSES));
            }

            Optional<ContactMessage> msgOpt = contactRepo.findById(id);
            if (msgOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Contact message not found"));
            }

            ContactMessage msg = msgOpt.get();
            msg.setStatus(newStatus);
            msg.setUpdatedDate(LocalDateTime.now(ZoneOffset.UTC));
            contactRepo.save(msg);

            log.info("Contact message #{} status updated to {} by user #{}", id, newStatus, callerUserId);
            return ResponseEntity.ok(msg);
        } catch (Exception e) {
            log.error("Failed to update contact message status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update status"));
        }
    }

    /**
     * DELETE /api/contact/{id} — Delete a contact message (Admin only)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteContactMessage(
            @PathVariable Long id,
            HttpServletRequest request) {
        try {
            Long callerUserId = getAuthUserId(request);
            if (callerUserId == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Authentication required"));
            }
            Optional<User> callerOpt = userRepo.findById(callerUserId);
            if (callerOpt.isEmpty() || !RoleUtil.isAdmin(callerOpt.get().getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }

            if (!contactRepo.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Contact message not found"));
            }

            contactRepo.deleteById(id);
            log.info("Contact message #{} deleted by user #{}", id, callerUserId);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Contact message deleted");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to delete contact message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete message"));
        }
    }

    /**
     * POST /api/contact/bulk-delete — Delete multiple contact messages in one call (Admin only)
     * Body: { "ids": [1, 2, 3] }
     */
    @PostMapping("/bulk-delete")
    public ResponseEntity<?> bulkDeleteContactMessages(
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        try {
            Long callerUserId = getAuthUserId(request);
            if (callerUserId == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Authentication required"));
            }
            Optional<User> callerOpt = userRepo.findById(callerUserId);
            if (callerOpt.isEmpty() || !RoleUtil.isAdmin(callerOpt.get().getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }

            Object idsObj = body.get("ids");
            if (!(idsObj instanceof List<?>)) {
                return ResponseEntity.badRequest().body(errorMap("Request must include an 'ids' array"));
            }
            List<?> rawIds = (List<?>) idsObj;
            List<Long> ids = new java.util.ArrayList<>();
            for (Object o : rawIds) {
                if (o instanceof Number) {
                    ids.add(((Number) o).longValue());
                } else if (o instanceof String) {
                    try { ids.add(Long.parseLong((String) o)); } catch (NumberFormatException ignored) { /* skip */ }
                }
            }
            if (ids.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("No valid ids provided"));
            }

            contactRepo.deleteAllById(ids);
            log.info("Bulk-deleted {} contact messages by user #{}: {}", ids.size(), callerUserId, ids);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Deleted " + ids.size() + " support " + (ids.size() == 1 ? "query" : "queries"));
            response.put("deletedCount", ids.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to bulk-delete contact messages", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete messages"));
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }

    // Tracking-ID format. Derived from the auto-generated database id + the form type
    // (inferred from the subject prefix) so the value the user sees matches the display
    // id shown in the admin Support Queries table:
    //   M00026   — Magazine Submission
    //   HS00027  — Help & Support
    //   FE00028  — Feedback
    //   CU00029  — Contact Us (fallback)
    // Classification mirrors EmailService.sendContactNotification.
    private String formatTrackingId(Long id, String subject) {
        String padded = String.format("%05d", id);
        if (subject != null && subject.startsWith("Magazine Submission:")) return "M" + padded;
        if (subject != null && subject.startsWith("Help & Support:")) return "HS" + padded;
        if (subject != null && subject.toLowerCase().startsWith("feedback")) return "FE" + padded;
        return "CU" + padded;
    }
}
