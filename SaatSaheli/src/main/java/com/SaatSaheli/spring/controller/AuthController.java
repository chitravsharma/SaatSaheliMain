package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.Login;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.LoginRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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

    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

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
            Optional<Login> existing = loginRepo.findByEmail(email);
            if (existing.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(errorMap("Account with this email already exists"));
            }

            String now = LocalDateTime.now().format(DTF);

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
            user.setCreatedDate(now);
            user.setModifiedDate(now);
            user = userRepo.save(user);

            // Create Login record
            Login login = new Login();
            login.setUserId(user.getId());
            login.setEmail(email);
            login.setPassword(password != null ? password : "");
            login.setStatus("ACTIVE");
            login.setAccountCreatedDate(now);
            login.setLastLoginDate(now);
            login.setProvider(provider);
            login = loginRepo.save(login);

            // Build response
            Map<String, Object> response = buildUserResponse(user, login);
            return ResponseEntity.ok(response);

        } catch (IOException e) {
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

            Optional<Login> loginOpt = loginRepo.findByEmail(email);
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
                if (password == null || !password.equals(login.getPassword())) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Invalid password"));
                }
            }

            // Update last login date
            String now = LocalDateTime.now().format(DTF);
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

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Login failed: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/auth/{loginId}/status
     * Body: { status: "ACTIVE" | "INACTIVE" | "DISABLED" | "DELETED" | "BLOCKED" }
     */
    @PutMapping("/{loginId}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long loginId, @RequestBody Map<String, String> body) {
        try {
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
        } catch (IOException e) {
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
        } catch (IOException e) {
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
            if (updated.getFirstName() != null) user.setFirstName(updated.getFirstName());
            if (updated.getMiddleName() != null) user.setMiddleName(updated.getMiddleName());
            if (updated.getLastName() != null) user.setLastName(updated.getLastName());
            if (updated.getPhoneNumber() != null) user.setPhoneNumber(updated.getPhoneNumber());
            if (updated.getEmail() != null) user.setEmail(updated.getEmail());
            if (updated.getAge() != null) user.setAge(updated.getAge());
            if (updated.getGender() != null) user.setGender(updated.getGender());
            user.setModifiedDate(LocalDateTime.now().format(DTF));
            user = userRepo.save(user);
            return ResponseEntity.ok(user);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update user: " + e.getMessage()));
        }
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
