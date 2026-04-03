package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.ContactMessage;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.ContactMessageRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.service.EmailService;
import com.SaatSaheli.spring.util.RoleUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
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

    /**
     * POST /api/contact — Submit a contact form message (public endpoint)
     */
    @PostMapping
    public ResponseEntity<?> submitContactForm(@RequestBody Map<String, String> body) {
        try {
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

            ContactMessage contact = new ContactMessage();
            contact.setName(name.trim());
            contact.setEmail(email.trim());
            contact.setSubject(subject != null ? subject.trim() : "");
            contact.setMessage(message.trim());
            contact.setCreatedDate(LocalDateTime.now());
            contactRepo.save(contact);

            log.info("Contact form submission from {} ({})", name.trim(), email.trim());

            // Notify admin via email
            try {
                emailService.sendContactNotification(name.trim(), email.trim(), contact.getSubject(), message.trim());
            } catch (Exception emailErr) {
                log.warn("Failed to send contact notification email: {}", emailErr.getMessage());
            }

            Map<String, String> response = new HashMap<>();
            response.put("message", "Thank you for reaching out! We'll get back to you soon.");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to save contact message", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to send message. Please try again later."));
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

    private Long getAuthUserId(HttpServletRequest request) {
        Object val = request.getAttribute("jwtUserId");
        return val instanceof Long ? (Long) val : null;
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
