package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.Login;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.LoginRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.SaatSaheli.spring.util.RoleUtil;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private LoginRepository loginRepo;

    private static final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * POST /api/auth/signup
     * Body: { firstName, middleName, lastName, phoneNumber, email, age, gender, password, provider }
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, Object> body) {
        try {
            String email = (String) body.get("email");
            String password = (String) body.get("password");
            String provider = body.getOrDefault("provider", "email").toString();

            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Email is required"));
            }

            // Check if email already exists
            Optional<Login> existing = loginRepo.findByEmailIgnoreCase(email);
            if (existing.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(errorMap("Account with this email already exists"));
            }

            LocalDateTime now = LocalDateTime.now();

            // Create User
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

            // Create Login record
            Login login = new Login();
            login.setUserId(user.getId());
            login.setEmail(email);
            login.setPassword(password != null && !password.isEmpty() ? passwordEncoder.encode(password) : "");
            login.setStatus("ACTIVE");
            login.setAccountCreatedDate(now);
            login.setLastLoginDate(now);
            login.setProvider(provider);
            login = loginRepo.save(login);

            // Build response
            Map<String, Object> response = buildUserResponse(user, login);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create account: " + e.getMessage()));
        }
    }

    /**
     * POST /api/auth/login
     * Body: { email, password, provider }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, Object> body) {
        try {
            String email = (String) body.get("email");
            String password = (String) body.get("password");
            String provider = body.getOrDefault("provider", "email").toString();

            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Email is required"));
            }

            Optional<Login> loginOpt = loginRepo.findByEmailIgnoreCase(email);
            if (loginOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Account not found"));
            }

            Login login = loginOpt.get();

            // Check status
            if ("BLOCKED".equals(login.getStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Account is blocked"));
            }
            if ("DISABLED".equals(login.getStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Account is disabled"));
            }
            if ("DELETED".equals(login.getStatus())) {
                return ResponseEntity.status(HttpStatus.GONE).body(errorMap("Account has been deleted"));
            }

            // Verify password for email provider
            if ("email".equals(provider)) {
                if (password == null || !passwordEncoder.matches(password, login.getPassword())) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Invalid password"));
                }
            }

            // Update last login date
            LocalDateTime now = LocalDateTime.now();
            login.setLastLoginDate(now);
            login.setStatus("ACTIVE");
            loginRepo.save(login);

            // Get user
            Optional<User> userOpt = userRepo.findById(login.getUserId());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorMap("User record not found"));
            }

            Map<String, Object> response = buildUserResponse(userOpt.get(), login);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Login failed: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/auth/{loginId}/status
     * Body: { status: "ACTIVE" | "INACTIVE" | "DISABLED" | "DELETED" | "BLOCKED" }
     */
    @PutMapping("/{loginId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long loginId,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false) String callerUserId) {
        try {
            // Verify caller is ADMIN or SUPER_ADMIN
            if (callerUserId == null || callerUserId.isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }
            Optional<User> callerOpt = userRepo.findById(Long.parseLong(callerUserId));
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

            Login login = loginOpt.get();
            login.setStatus(newStatus.toUpperCase());
            loginRepo.save(login);

            return ResponseEntity.ok(login);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update status: " + e.getMessage()));
        }
    }

    /**
     * GET /api/auth/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUser(@PathVariable Long userId) {
        try {
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
     * Body: User fields to update
     */
    @PutMapping("/user/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable Long userId, @RequestBody User updated) {
        try {
            Optional<User> userOpt = userRepo.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("User not found"));
            }
            User user = userOpt.get();
            // Block role changes through this endpoint — use admin endpoint instead
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
     * Body: { email }
     * Generates a temporary password and returns it (in production, send via email).
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Email is required"));
            }

            Optional<Login> loginOpt = loginRepo.findByEmailIgnoreCase(email);
            if (loginOpt.isEmpty()) {
                // Don't reveal whether account exists
                return ResponseEntity.ok(Map.of("message", "If an account with that email exists, a password reset link has been sent."));
            }

            Login login = loginOpt.get();
            if (!"email".equalsIgnoreCase(login.getProvider())) {
                return ResponseEntity.ok(Map.of("message",
                        "This account uses " + login.getProvider() + " login. Please sign in with " + login.getProvider() + " instead."));
            }

            // Generate a temporary password
            String tempPassword = generateTempPassword();
            login.setPassword(passwordEncoder.encode(tempPassword));
            loginRepo.save(login);

            // In production, send this via email. For now, return it in response.
            Map<String, Object> response = new HashMap<>();
            response.put("message", "A temporary password has been generated. Please check your email.");
            response.put("tempPassword", tempPassword); // Remove this in production; send via email instead
            response.put("email", email);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to process password reset: " + e.getMessage()));
        }
    }

    /**
     * POST /api/auth/reset-password
     * Body: { email, oldPassword, newPassword }
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

            Login login = loginOpt.get();
            // Verify old password
            if (oldPassword != null && !oldPassword.isEmpty() && !passwordEncoder.matches(oldPassword, login.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Current password is incorrect"));
            }

            login.setPassword(passwordEncoder.encode(newPassword));
            loginRepo.save(login);

            return ResponseEntity.ok(Map.of("message", "Password has been reset successfully"));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to reset password: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/auth/admin-reset-password/{userId}
     * SUPER_ADMIN can reset any user's password.
     * Body: { newPassword }
     */
    @PutMapping("/admin-reset-password/{userId}")
    public ResponseEntity<?> adminResetPassword(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String callerUserId) {
        try {
            // Verify caller is SUPER_ADMIN
            if (callerUserId == null || callerUserId.isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Super Admin access required"));
            }
            Optional<User> callerOpt = userRepo.findById(Long.parseLong(callerUserId));
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

            Login login = loginOpt.get();
            login.setPassword(passwordEncoder.encode(newPassword));
            loginRepo.save(login);

            return ResponseEntity.ok(Map.of("message", "Password reset successfully for user " + userId));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to reset password: " + e.getMessage()));
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
