package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.Article;
import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.model.Login;
import com.SaatSaheli.spring.model.Podcast;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.ArticleRepository;
import com.SaatSaheli.spring.repository.BookRepository;
import com.SaatSaheli.spring.repository.LoginRepository;
import com.SaatSaheli.spring.repository.PodcastRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.util.JwtUtil;
import com.SaatSaheli.spring.util.RateLimiter;
import com.SaatSaheli.spring.service.EmailService;
import com.SaatSaheli.spring.service.RecaptchaService;
import com.SaatSaheli.spring.util.RoleUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private LoginRepository loginRepo;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private RateLimiter rateLimiter;

    @Autowired
    private EmailService emailService;

    @Autowired
    private RecaptchaService recaptchaService;

    @Autowired
    private BookRepository bookRepo;

    @Autowired
    private ArticleRepository articleRepo;

    @Autowired
    private PodcastRepository podcastRepo;

    private static final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // Helper: get authenticated userId from JWT (set by JwtInterceptor)
    private Long getAuthUserId(HttpServletRequest request) {
        Object val = request.getAttribute("jwtUserId");
        return val instanceof Long ? (Long) val : null;
    }

    /**
     * POST /api/auth/signup
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            String clientIp = request.getRemoteAddr();
            if (!rateLimiter.tryAcquire("signup:" + clientIp)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(errorMap("Too many signup attempts. Please try again later."));
            }

            String email = (String) body.get("email");
            String password = (String) body.get("password");
            String provider = body.getOrDefault("provider", "email").toString();

            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Email is required"));
            }

            // reCAPTCHA only for email signup — Google OAuth already proves humanness
            if ("email".equalsIgnoreCase(provider)) {
                String recaptchaToken = (String) body.get("recaptchaToken");
                if (!recaptchaService.verify(recaptchaToken, clientIp)) {
                    return ResponseEntity.badRequest()
                            .body(errorMap("Please complete the reCAPTCHA challenge."));
                }
            }

            Optional<Login> existing = loginRepo.findByEmailIgnoreCase(email);
            if (existing.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(errorMap("Account with this email already exists"));
            }

            LocalDateTime now = LocalDateTime.now();

            User user = new User();
            user.setFirstName(getStr(body, "firstName"));
            user.setMiddleName(getStr(body, "middleName"));
            user.setLastName(getStr(body, "lastName"));
            user.setPhoneNumber(getStr(body, "phoneNumber"));
            user.setEmail(email);
            if (body.get("age") != null) {
                user.setAge(Integer.parseInt(body.get("age").toString()));
            }
            user.setGender(getStr(body, "gender"));
            user.setRole("USER");
            String plan = getStr(body, "plan");
            user.setPlan(plan.isEmpty() ? "Free" : plan);
            user.setCreatedDate(now);
            user.setModifiedDate(now);
            user = userRepo.save(user);

            Login login = new Login();
            login.setUserId(user.getId());
            login.setEmail(email);
            login.setPassword(password != null && !password.isEmpty() ? passwordEncoder.encode(password) : "");
            login.setStatus("ACTIVE");
            login.setAccountCreatedDate(now);
            login.setLastLoginDate(now);
            login.setProvider(provider);
            login = loginRepo.save(login);

            Map<String, Object> response = buildUserResponse(user, login);
            // Issue JWT token
            response.put("token", jwtUtil.generateToken(user.getId(), email, user.getRole()));
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create account: " + e.getMessage()));
        }
    }

    /**
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            String email = (String) body.get("email");
            String password = (String) body.get("password");
            String provider = body.getOrDefault("provider", "email").toString();

            String clientIp = request.getRemoteAddr();
            String rateLimitKey = "login:" + (email != null ? email.toLowerCase() : clientIp);
            if (!rateLimiter.tryAcquire(rateLimitKey)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(errorMap("Too many login attempts. Please try again later."));
            }

            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Email is required"));
            }

            Optional<Login> loginOpt = loginRepo.findByEmailIgnoreCase(email);
            if (loginOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Invalid email or password"));
            }

            Login loginRecord = loginOpt.get();

            if ("BLOCKED".equals(loginRecord.getStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Account is blocked"));
            }
            if ("DISABLED".equals(loginRecord.getStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Account is disabled"));
            }
            if ("DELETED".equals(loginRecord.getStatus())) {
                return ResponseEntity.status(HttpStatus.GONE).body(errorMap("Account has been deleted"));
            }

            if ("email".equals(provider)) {
                boolean matchesOldPassword = password != null && passwordEncoder.matches(password, loginRecord.getPassword());
                boolean matchesTempPassword = password != null
                        && loginRecord.getTempPassword() != null
                        && !loginRecord.getTempPassword().isEmpty()
                        && passwordEncoder.matches(password, loginRecord.getTempPassword());

                if (!matchesOldPassword && !matchesTempPassword) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Invalid email or password"));
                }

                // If user logged in with old password, clear temp password and flag
                if (matchesOldPassword && !matchesTempPassword) {
                    loginRecord.setTempPassword(null);
                    loginRecord.setMustChangePassword(false);
                }
            }

            LocalDateTime now = LocalDateTime.now();
            loginRecord.setLastLoginDate(now);
            loginRecord.setStatus("ACTIVE");
            loginRepo.save(loginRecord);

            Optional<User> userOpt = userRepo.findById(loginRecord.getUserId());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap("User record not found"));
            }

            User user = userOpt.get();
            Map<String, Object> response = buildUserResponse(user, loginRecord);
            // Issue JWT token
            response.put("token", jwtUtil.generateToken(user.getId(), email, user.getRole()));
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Login failed: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/auth/{loginId}/status — Admin only
     */
    @PutMapping("/{loginId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long loginId,
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
            if (newStatus == null || !isValidStatus(newStatus)) {
                return ResponseEntity.badRequest().body(errorMap("Invalid status. Must be: ACTIVE, INACTIVE, DISABLED, DELETED, BLOCKED"));
            }

            Optional<Login> loginOpt = loginRepo.findById(loginId);
            if (loginOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Login not found"));
            }

            Login loginRecord = loginOpt.get();
            loginRecord.setStatus(newStatus.toUpperCase());
            loginRepo.save(loginRecord);

            return ResponseEntity.ok(loginRecord);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update status: " + e.getMessage()));
        }
    }

    /**
     * GET /api/auth/writers — public list of users with ≥1 published book, article, or podcast.
     * Sorted by most recent content first. Used by the public Writers directory page.
     */
    @GetMapping("/writers")
    public ResponseEntity<?> getWriters() {
        try {
            // Collect (userId → most recent content date) across all published content types.
            Map<Long, LocalDateTime> latestByUser = new HashMap<>();
            Set<Long> creatorIds = new HashSet<>();

            for (Book b : bookRepo.findByStatusIgnoreCase("PUBLISHED")) {
                if (b.getUserId() == null) continue;
                creatorIds.add(b.getUserId());
                LocalDateTime t = b.getModifiedDate() != null ? b.getModifiedDate() : b.getCreatedDate();
                mergeLatest(latestByUser, b.getUserId(), t);
            }
            for (Article a : articleRepo.findByStatusOrderByCreatedDateDesc("PUBLISHED")) {
                if (a.getUserId() == null) continue;
                creatorIds.add(a.getUserId());
                mergeLatest(latestByUser, a.getUserId(), a.getCreatedDate());
            }
            for (Podcast p : podcastRepo.findByStatusOrderByCreatedDateDesc("PUBLISHED")) {
                if (p.getUserId() == null) continue;
                creatorIds.add(p.getUserId());
                mergeLatest(latestByUser, p.getUserId(), p.getCreatedDate());
            }

            if (creatorIds.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            List<Map<String, Object>> writers = new ArrayList<>();
            for (User user : userRepo.findAllById(creatorIds)) {
                Map<String, Object> w = new HashMap<>();
                w.put("id", user.getId());
                w.put("displayName", user.getDisplayName());
                w.put("firstName", user.getFirstName());
                w.put("lastName", user.getLastName());
                w.put("headline", user.getHeadline());
                w.put("profileImageUrl", user.getProfileImageUrl());
                w.put("location", user.getLocation());
                w.put("latestContentDate", latestByUser.get(user.getId()));
                writers.add(w);
            }
            // Most recently active writer first
            writers.sort(Comparator.comparing(
                    (Map<String, Object> m) -> (LocalDateTime) m.get("latestContentDate"),
                    Comparator.nullsLast(Comparator.reverseOrder())));
            return ResponseEntity.ok(writers);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to fetch writers: " + e.getMessage()));
        }
    }

    private static void mergeLatest(Map<Long, LocalDateTime> map, Long userId, LocalDateTime t) {
        if (t == null) return;
        LocalDateTime existing = map.get(userId);
        if (existing == null || t.isAfter(existing)) {
            map.put(userId, t);
        }
    }

    /**
     * GET /api/auth/public-profile/{userId} — no auth required
     */
    @GetMapping("/public-profile/{userId}")
    public ResponseEntity<?> getPublicProfile(@PathVariable Long userId) {
        try {
            Optional<User> userOpt = userRepo.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("User not found"));
            }
            User user = userOpt.get();
            Map<String, Object> profile = new HashMap<>();
            profile.put("id", user.getId());
            profile.put("displayName", user.getDisplayName());
            profile.put("firstName", user.getFirstName());
            profile.put("lastName", user.getLastName());
            profile.put("headline", user.getHeadline());
            profile.put("profileImageUrl", user.getProfileImageUrl());
            profile.put("location", user.getLocation());
            profile.put("bio", user.getBio());
            profile.put("createdDate", user.getCreatedDate());
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to fetch profile: " + e.getMessage()));
        }
    }

    /**
     * GET /api/auth/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUser(@PathVariable Long userId, HttpServletRequest request) {
        try {
            Long callerUserId = getAuthUserId(request);
            if (callerUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
            }
            // Users can only view their own profile, admins can view any
            if (!callerUserId.equals(userId)) {
                Optional<User> callerOpt = userRepo.findById(callerUserId);
                if (callerOpt.isEmpty() || !RoleUtil.isAdmin(callerOpt.get().getRole())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("You can only view your own profile"));
                }
            }
            Optional<User> userOpt = userRepo.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("User not found"));
            }
            return ResponseEntity.ok(userOpt.get());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to fetch user: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/auth/user/{userId}
     */
    @PutMapping("/user/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable Long userId, @RequestBody User updated, HttpServletRequest request) {
        try {
            // Verify the caller is the same user or an admin
            Long callerUserId = getAuthUserId(request);
            if (callerUserId != null && !callerUserId.equals(userId)) {
                Optional<User> callerOpt = userRepo.findById(callerUserId);
                if (callerOpt.isEmpty() || !RoleUtil.isAdmin(callerOpt.get().getRole())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("You can only update your own profile"));
                }
            }

            Optional<User> userOpt = userRepo.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("User not found"));
            }
            User user = userOpt.get();
            if (updated.getRole() != null && !updated.getRole().equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(errorMap("Role changes are not allowed through this endpoint"));
            }
            if (updated.getFirstName() != null) user.setFirstName(updated.getFirstName());
            if (updated.getMiddleName() != null) user.setMiddleName(updated.getMiddleName());
            if (updated.getLastName() != null) user.setLastName(updated.getLastName());
            if (updated.getPhoneNumber() != null) user.setPhoneNumber(updated.getPhoneNumber());
            if (updated.getEmail() != null) user.setEmail(updated.getEmail());
            if (updated.getAge() != null) user.setAge(updated.getAge());
            if (updated.getGender() != null) user.setGender(updated.getGender());
            if (updated.getDisplayName() != null) user.setDisplayName(updated.getDisplayName());
            if (updated.getHeadline() != null) user.setHeadline(updated.getHeadline());
            if (updated.getProfileImageUrl() != null) user.setProfileImageUrl(updated.getProfileImageUrl());
            if (updated.getLocation() != null) user.setLocation(updated.getLocation());
            if (updated.getBio() != null) user.setBio(updated.getBio());
            if (updated.getInterests() != null) user.setInterests(updated.getInterests());
            if (updated.getFields() != null) user.setFields(updated.getFields());
            // Plan changes should go through payment flow, but allow for now
            if (updated.getPlan() != null) user.setPlan(updated.getPlan());
            user.setModifiedDate(LocalDateTime.now());
            user = userRepo.save(user);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update user: " + e.getMessage()));
        }
    }

    /**
     * POST /api/auth/forgot-password
     * Generates a temporary password. In production, send via email.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body, HttpServletRequest request) {
        try {
            String clientIp = request.getRemoteAddr();
            if (!rateLimiter.tryAcquire("forgot:" + clientIp)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(errorMap("Too many password reset attempts. Please try again later."));
            }

            String email = body.get("email");
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Email is required"));
            }

            // Always return same response to avoid leaking account existence
            Map<String, Object> safeResponse = new HashMap<>();
            safeResponse.put("message", "If an account with that email exists, a temporary password has been generated. Please check your email.");

            Optional<Login> loginOpt = loginRepo.findByEmailIgnoreCase(email);
            if (loginOpt.isEmpty()) {
                return ResponseEntity.ok(safeResponse);
            }

            Login loginRecord = loginOpt.get();
            if (!"email".equalsIgnoreCase(loginRecord.getProvider())) {
                safeResponse.put("message", "This account uses " + loginRecord.getProvider() + " login. Please sign in with " + loginRecord.getProvider() + " instead.");
                return ResponseEntity.ok(safeResponse);
            }

            // Generate temp password — store in separate column, keep old password intact
            String tempPassword = generateTempPassword();
            loginRecord.setTempPassword(passwordEncoder.encode(tempPassword));
            loginRecord.setMustChangePassword(true);
            loginRepo.save(loginRecord);

            // Send temp password via email
            emailService.sendPasswordResetEmail(email, tempPassword);

            return ResponseEntity.ok(safeResponse);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to process password reset"));
        }
    }

    /**
     * POST /api/auth/reset-password
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String oldPassword = body.get("oldPassword");
            String newPassword = body.get("newPassword");

            if (email == null || newPassword == null || newPassword.length() < 6) {
                return ResponseEntity.badRequest().body(errorMap("Email and new password (min 6 chars) are required"));
            }

            Optional<Login> loginOpt = loginRepo.findByEmailIgnoreCase(email);
            if (loginOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Account not found"));
            }

            Login loginRecord = loginOpt.get();
            if (oldPassword != null && !oldPassword.isEmpty() && !passwordEncoder.matches(oldPassword, loginRecord.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Current password is incorrect"));
            }

            loginRecord.setPassword(passwordEncoder.encode(newPassword));
            loginRecord.setTempPassword(null);
            loginRecord.setMustChangePassword(false);
            loginRepo.save(loginRecord);

            return ResponseEntity.ok(Map.of("message", "Password has been reset successfully"));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to reset password"));
        }
    }

    /**
     * PUT /api/auth/admin-reset-password/{userId} — SUPER_ADMIN only
     */
    @PutMapping("/admin-reset-password/{userId}")
    public ResponseEntity<?> adminResetPassword(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        try {
            Long callerUserId = getAuthUserId(request);
            if (callerUserId == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Authentication required"));
            }
            Optional<User> callerOpt = userRepo.findById(callerUserId);
            if (callerOpt.isEmpty() || !RoleUtil.isSuperAdmin(callerOpt.get().getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Super Admin access required"));
            }

            String newPassword = body.get("newPassword");
            if (newPassword == null || newPassword.length() < 6) {
                return ResponseEntity.badRequest().body(errorMap("New password must be at least 6 characters"));
            }

            Optional<Login> loginOpt = loginRepo.findByUserId(userId);
            if (loginOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Login not found for user"));
            }

            Login loginRecord = loginOpt.get();
            loginRecord.setPassword(passwordEncoder.encode(newPassword));
            loginRepo.save(loginRecord);

            return ResponseEntity.ok(Map.of("message", "Password reset successfully for user " + userId));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to reset password"));
        }
    }

    private String generateTempPassword() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        java.util.Random rng = new java.security.SecureRandom();
        for (int i = 0; i < 10; i++) {
            sb.append(chars.charAt(rng.nextInt(chars.length())));
        }
        return sb.toString();
    }

    private Map<String, Object> buildUserResponse(User user, Login login) {
        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getId());
        response.put("loginId", login.getId());
        response.put("name", buildFullName(user));
        response.put("email", user.getEmail());
        response.put("role", user.getRole());
        response.put("status", login.getStatus());
        response.put("provider", login.getProvider());
        response.put("plan", user.getPlan());
        response.put("lastLoginDate", login.getLastLoginDate());
        response.put("mustChangePassword", Boolean.TRUE.equals(login.getMustChangePassword()));
        return response;
    }

    private String buildFullName(User user) {
        StringBuilder sb = new StringBuilder();
        if (user.getFirstName() != null && !user.getFirstName().isEmpty()) sb.append(user.getFirstName());
        if (user.getMiddleName() != null && !user.getMiddleName().isEmpty()) sb.append(" ").append(user.getMiddleName());
        if (user.getLastName() != null && !user.getLastName().isEmpty()) sb.append(" ").append(user.getLastName());
        return sb.toString().trim().isEmpty() ? user.getEmail() : sb.toString().trim();
    }

    private String getStr(Map<String, Object> body, String key) {
        Object val = body.get(key);
        return val != null ? val.toString() : "";
    }

    private boolean isValidStatus(String status) {
        return "ACTIVE".equalsIgnoreCase(status) || "INACTIVE".equalsIgnoreCase(status)
                || "DISABLED".equalsIgnoreCase(status) || "DELETED".equalsIgnoreCase(status)
                || "BLOCKED".equalsIgnoreCase(status);
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
