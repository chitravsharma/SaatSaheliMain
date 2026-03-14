package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.model.Login;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.LoginRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.service.BookService;
import com.SaatSaheli.spring.util.RoleUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private LoginRepository loginRepo;

    @Autowired
    private BookService bookService;

    /** GET /api/admin/users — List all users with login info */
    @GetMapping("/users")
    public ResponseEntity<?> listUsers(@RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, false);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }

            List<User> users = userRepo.findAll();
            List<Login> logins = loginRepo.findAll();
            Map<Long, Login> loginByUserId = logins.stream()
                    .collect(Collectors.toMap(Login::getUserId, l -> l, (a, b) -> a));

            List<Map<String, Object>> result = new ArrayList<>();
            for (User u : users) {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id", u.getId());
                entry.put("firstName", u.getFirstName());
                entry.put("middleName", u.getMiddleName());
                entry.put("lastName", u.getLastName());
                entry.put("email", u.getEmail());
                entry.put("role", u.getRole());
                entry.put("createdDate", u.getCreatedDate());
                Login login = loginByUserId.get(u.getId());
                if (login != null) {
                    entry.put("loginId", login.getId());
                    entry.put("status", login.getStatus());
                    entry.put("lastLoginDate", login.getLastLoginDate());
                    entry.put("provider", login.getProvider());
                } else {
                    entry.put("loginId", null);
                    entry.put("status", "UNKNOWN");
                    entry.put("lastLoginDate", null);
                    entry.put("provider", null);
                }
                result.add(entry);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to list users: " + e.getMessage()));
        }
    }

    /** PUT /api/admin/users/{userId}/role — Change user role (SUPER_ADMIN only) */
    @PutMapping("/users/{userId}/role")
    public ResponseEntity<?> changeUserRole(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, true);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Super Admin access required"));
            }

            String newRole = body.get("role");
            if (!RoleUtil.isValidRole(newRole)) {
                return ResponseEntity.badRequest().body(errorMap("Invalid role. Must be: USER, ADMIN, SUPER_ADMIN"));
            }
            if (!RoleUtil.canAssignRole(caller.getRole(), newRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("You cannot assign this role"));
            }

            Optional<User> userOpt = userRepo.findById(userId);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("User not found"));
            }

            User user = userOpt.get();
            user.setRole(newRole.toUpperCase());
            user.setModifiedDate(LocalDateTime.now());
            userRepo.save(user);

            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to change role: " + e.getMessage()));
        }
    }

    /** PUT /api/admin/users/{userId}/status — Change login status */
    @PutMapping("/users/{userId}/status")
    public ResponseEntity<?> changeUserStatus(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body,
            @RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, false);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }

            String newStatus = body.get("status");
            if (newStatus == null) {
                return ResponseEntity.badRequest().body(errorMap("Status is required"));
            }

            Optional<Login> loginOpt = loginRepo.findByUserId(userId);
            if (loginOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Login not found for user"));
            }

            Login login = loginOpt.get();
            login.setStatus(newStatus.toUpperCase());
            loginRepo.save(login);

            return ResponseEntity.ok(login);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to change status: " + e.getMessage()));
        }
    }

    /** GET /api/admin/books — List all books */
    @GetMapping("/books")
    public ResponseEntity<?> listBooks(@RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, false);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }
            List<Book> books = bookService.getAllBooks();
            return ResponseEntity.ok(books);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to list books: " + e.getMessage()));
        }
    }

    /** DELETE /api/admin/books/{bookId} — Delete any book */
    @DeleteMapping("/books/{bookId}")
    public ResponseEntity<?> deleteBook(
            @PathVariable Long bookId,
            @RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, false);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }
            bookService.deleteBook(bookId, null, caller.getRole());
            return ResponseEntity.ok(Map.of("message", "Book deleted"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete book: " + e.getMessage()));
        }
    }

    /** GET /api/admin/stats — Dashboard stats */
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, false);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }

            List<User> users = userRepo.findAll();
            List<Login> logins = loginRepo.findAll();
            List<Book> books = bookService.getAllBooks();

            long totalUsers = users.size();
            long activeUsers = logins.stream().filter(l -> "ACTIVE".equalsIgnoreCase(l.getStatus())).count();
            long blockedUsers = logins.stream().filter(l -> "BLOCKED".equalsIgnoreCase(l.getStatus())).count();
            long totalBooks = books.size();
            long publishedBooks = books.stream().filter(b -> "PUBLISHED".equalsIgnoreCase(b.getStatus())).count();
            long draftBooks = books.stream().filter(b -> "DRAFT".equalsIgnoreCase(b.getStatus())).count();
            long adminCount = users.stream().filter(u -> RoleUtil.isAdmin(u.getRole())).count();

            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("totalUsers", totalUsers);
            stats.put("activeUsers", activeUsers);
            stats.put("blockedUsers", blockedUsers);
            stats.put("adminCount", adminCount);
            stats.put("totalBooks", totalBooks);
            stats.put("publishedBooks", publishedBooks);
            stats.put("draftBooks", draftBooks);

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to fetch stats: " + e.getMessage()));
        }
    }

    private User verifyCaller(String callerUserId, boolean requireSuperAdmin) {
        try {
            if (callerUserId == null || callerUserId.isEmpty()) return null;
            Optional<User> callerOpt = userRepo.findById(Long.parseLong(callerUserId));
            if (callerOpt.isEmpty()) return null;
            User caller = callerOpt.get();
            if (requireSuperAdmin && !RoleUtil.isSuperAdmin(caller.getRole())) return null;
            if (!requireSuperAdmin && !RoleUtil.isAdmin(caller.getRole())) return null;
            return caller;
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
