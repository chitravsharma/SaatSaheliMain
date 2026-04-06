package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.Article;
import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.model.Login;
import com.SaatSaheli.spring.model.Page;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.ArticleRepository;
import com.SaatSaheli.spring.repository.BookRepository;
import com.SaatSaheli.spring.repository.GalleryRepository;
import com.SaatSaheli.spring.repository.LoginRepository;
import com.SaatSaheli.spring.repository.PodcastRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.service.ArticleService;
import com.SaatSaheli.spring.service.BookService;
import com.SaatSaheli.spring.service.DocumentExtractionService;
import com.SaatSaheli.spring.util.RoleUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private LoginRepository loginRepo;

    @Autowired
    private BookService bookService;

    @Autowired
    private BookRepository bookRepo;

    @Autowired
    private GalleryRepository galleryRepo;

    @Autowired
    private ArticleRepository articleRepo;

    @Autowired
    private ArticleService articleService;

    @Autowired
    private PodcastRepository podcastRepo;

    @Autowired
    private DocumentExtractionService documentExtractionService;

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

            // Pre-compute content counts per user
            Map<Long, Long> bookCounts = bookRepo.findAll().stream()
                    .filter(b -> !"DELETED".equalsIgnoreCase(b.getStatus()))
                    .filter(b -> b.getUserId() != null)
                    .collect(Collectors.groupingBy(Book::getUserId, Collectors.counting()));
            Map<Long, Long> galleryCounts = galleryRepo.findAll().stream()
                    .filter(g -> g.getUserId() != null)
                    .collect(Collectors.groupingBy(g -> g.getUserId(), Collectors.counting()));
            Map<Long, Long> articleCounts = articleRepo.findAllByOrderByCreatedDateDesc().stream()
                    .filter(a -> a.getUserId() != null)
                    .collect(Collectors.groupingBy(a -> a.getUserId(), Collectors.counting()));

            List<Map<String, Object>> result = new ArrayList<>();
            for (User u : users) {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id", u.getId());
                entry.put("firstName", u.getFirstName());
                entry.put("middleName", u.getMiddleName());
                entry.put("lastName", u.getLastName());
                entry.put("email", u.getEmail());
                entry.put("role", u.getRole());
                entry.put("plan", u.getPlan() != null ? u.getPlan() : "Free");
                entry.put("createdDate", u.getCreatedDate());

                // Activity counts
                long books = bookCounts.getOrDefault(u.getId(), 0L);
                long galleries = galleryCounts.getOrDefault(u.getId(), 0L);
                long articles = articleCounts.getOrDefault(u.getId(), 0L);
                entry.put("bookCount", books);
                entry.put("galleryCount", galleries);
                entry.put("articleCount", articles);
                entry.put("userType", (books + galleries + articles) > 0 ? "Creator" : "Visitor");

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

    /** PUT /api/admin/books/{bookId}/archive — Archive a book */
    @PutMapping("/books/{bookId}/archive")
    public ResponseEntity<?> archiveBook(
            @PathVariable Long bookId,
            @RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, false);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }
            bookService.archiveBook(bookId);
            return ResponseEntity.ok(Map.of("message", "Book archived"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to archive book: " + e.getMessage()));
        }
    }

    /** PUT /api/admin/books/{bookId}/recover — Recover a deleted/archived book back to DRAFT */
    @PutMapping("/books/{bookId}/recover")
    public ResponseEntity<?> recoverBook(
            @PathVariable Long bookId,
            @RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, false);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }
            bookService.recoverBook(bookId);
            return ResponseEntity.ok(Map.of("message", "Book recovered to DRAFT"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to recover book: " + e.getMessage()));
        }
    }

    /** DELETE /api/admin/books/{bookId}/purge — Permanently purge a single book (SUPER_ADMIN only) */
    @DeleteMapping("/books/{bookId}/purge")
    public ResponseEntity<?> purgeSingleBook(
            @PathVariable Long bookId,
            @RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, true);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Super Admin access required"));
            }
            bookService.purgeBook(bookId);
            return ResponseEntity.ok(Map.of("message", "Book permanently purged"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to purge book: " + e.getMessage()));
        }
    }

    /** DELETE /api/admin/books/purge — Permanently delete all books with DELETED status (SUPER_ADMIN only) */
    @DeleteMapping("/books/purge")
    public ResponseEntity<?> purgeDeletedBooks(@RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, true);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Super Admin access required"));
            }
            int count = bookService.purgeDeletedBooks();
            return ResponseEntity.ok(Map.of("message", "Permanently deleted " + count + " books", "count", count));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to purge books: " + e.getMessage()));
        }
    }

    // ─── Article Admin Endpoints ───

    /** GET /api/admin/articles — List all articles */
    @GetMapping("/articles")
    public ResponseEntity<?> listArticles(@RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, false);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }
            List<Article> articles = articleRepo.findAllByOrderByCreatedDateDesc();
            // Enrich with author names
            Map<Long, User> userMap = userRepo.findAll().stream()
                    .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
            for (Article article : articles) {
                if (article.getUserId() != null && userMap.containsKey(article.getUserId())) {
                    User u = userMap.get(article.getUserId());
                    String name = (u.getDisplayName() != null && !u.getDisplayName().isEmpty())
                            ? u.getDisplayName()
                            : ((u.getFirstName() != null ? u.getFirstName() : "")
                            + (u.getLastName() != null ? " " + u.getLastName() : "")).trim();
                    article.setAuthorName(name);
                }
            }
            return ResponseEntity.ok(articles);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to list articles: " + e.getMessage()));
        }
    }

    /** DELETE /api/admin/articles/{articleId} — Delete any article */
    @DeleteMapping("/articles/{articleId}")
    public ResponseEntity<?> deleteArticle(
            @PathVariable Long articleId,
            @RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, false);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
            }
            articleRepo.deleteById(articleId);
            return ResponseEntity.ok(Map.of("message", "Article deleted"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete article: " + e.getMessage()));
        }
    }

    /** PUT /api/admin/articles/{articleId}/status — Change article status (PUBLISHED/DRAFT) */
    @PutMapping("/articles/{articleId}/status")
    public ResponseEntity<?> changeArticleStatus(
            @PathVariable Long articleId,
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
            Optional<Article> opt = articleRepo.findById(articleId);
            if (opt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Article not found"));
            }
            Article article = opt.get();
            article.setStatus(newStatus.toUpperCase());
            article.setModifiedDate(java.time.LocalDateTime.now());
            articleRepo.save(article);
            return ResponseEntity.ok(article);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to change article status: " + e.getMessage()));
        }
    }

    /** DELETE /api/admin/articles/purge — Permanently delete all DRAFT articles (SUPER_ADMIN only) */
    @DeleteMapping("/articles/purge")
    public ResponseEntity<?> purgeDraftArticles(@RequestHeader("X-User-Id") String callerUserId) {
        try {
            User caller = verifyCaller(callerUserId, true);
            if (caller == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Super Admin access required"));
            }
            List<Article> drafts = articleRepo.findByStatusOrderByCreatedDateDesc("DRAFT");
            int count = drafts.size();
            articleRepo.deleteAll(drafts);
            return ResponseEntity.ok(Map.of("message", "Permanently deleted " + count + " draft articles", "count", count));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to purge articles: " + e.getMessage()));
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
            List<Article> articles = articleRepo.findAllByOrderByCreatedDateDesc();

            long totalUsers = users.size();
            long activeUsers = logins.stream().filter(l -> "ACTIVE".equalsIgnoreCase(l.getStatus())).count();
            long blockedUsers = logins.stream().filter(l -> "BLOCKED".equalsIgnoreCase(l.getStatus())).count();
            long totalBooks = books.size();
            long publishedBooks = books.stream().filter(b -> "PUBLISHED".equalsIgnoreCase(b.getStatus())).count();
            long draftBooks = books.stream().filter(b -> "DRAFT".equalsIgnoreCase(b.getStatus())).count();
            long adminCount = users.stream().filter(u -> RoleUtil.isAdmin(u.getRole())).count();

            // Article stats
            long totalArticles = articles.size();
            long publishedArticles = articles.stream().filter(a -> "PUBLISHED".equalsIgnoreCase(a.getStatus())).count();
            long draftArticles = articles.stream().filter(a -> "DRAFT".equalsIgnoreCase(a.getStatus())).count();
            long totalBlogs = articles.stream().filter(a -> "Blog".equalsIgnoreCase(a.getContentType())).count();
            long totalPoems = articles.stream().filter(a -> "Poetry".equalsIgnoreCase(a.getContentType())).count();
            long totalArticleType = articles.stream().filter(a -> "Article".equalsIgnoreCase(a.getContentType())).count();

            // Podcast stats
            long totalPodcasts = podcastRepo.count();

            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("totalUsers", totalUsers);
            stats.put("activeUsers", activeUsers);
            stats.put("blockedUsers", blockedUsers);
            stats.put("adminCount", adminCount);
            stats.put("totalBooks", totalBooks);
            stats.put("publishedBooks", publishedBooks);
            stats.put("draftBooks", draftBooks);
            stats.put("totalArticles", totalArticles);
            stats.put("publishedArticles", publishedArticles);
            stats.put("draftArticles", draftArticles);
            stats.put("totalBlogs", totalBlogs);
            stats.put("totalPoems", totalPoems);
            stats.put("totalArticleType", totalArticleType);
            stats.put("totalPodcasts", totalPodcasts);

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to fetch stats: " + e.getMessage()));
        }
    }

    // ── Magazine endpoints ──

    @GetMapping("/magazine")
    public ResponseEntity<?> getOrCreateMagazine(@RequestHeader("X-User-Id") String callerUserId) {
        User caller = verifyCaller(callerUserId, false);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
        }
        try {
            Book magazine = bookService.getOrCreateMagazine(caller.getId());
            return ResponseEntity.ok(magazine);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get magazine: " + e.getMessage()));
        }
    }

    /** GET /api/admin/magazines — List all magazine editions (latest first) */
    @GetMapping("/magazines")
    public ResponseEntity<?> listMagazines(@RequestHeader("X-User-Id") String callerUserId) {
        User caller = verifyCaller(callerUserId, false);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
        }
        try {
            return ResponseEntity.ok(bookService.getAllMagazines());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to list magazines: " + e.getMessage()));
        }
    }

    /** POST /api/admin/magazine/new — Create a new magazine edition */
    @PostMapping("/magazine/new")
    public ResponseEntity<?> createNewMagazineEdition(
            @RequestHeader("X-User-Id") String callerUserId,
            @RequestBody(required = false) Map<String, String> body) {
        User caller = verifyCaller(callerUserId, false);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
        }
        try {
            String title = body != null ? body.get("title") : null;
            Book magazine = bookService.createNewMagazineEdition(caller.getId(), title);
            return ResponseEntity.ok(magazine);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create magazine edition: " + e.getMessage()));
        }
    }

    @PutMapping("/magazine/publish")
    public ResponseEntity<?> publishMagazine(@RequestHeader("X-User-Id") String callerUserId) {
        User caller = verifyCaller(callerUserId, false);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
        }
        try {
            Book magazine = bookService.getMagazine();
            if (magazine == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Magazine not found"));
            }
            bookService.publishBook(magazine.getId(), null);
            return ResponseEntity.ok(Map.of("message", "Magazine published successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to publish magazine: " + e.getMessage()));
        }
    }

    /** PUT /api/admin/magazine/{magazineId}/unpublish — Unpublish (set back to DRAFT) */
    @PutMapping("/magazine/{magazineId}/unpublish")
    public ResponseEntity<?> unpublishMagazine(
            @PathVariable Long magazineId,
            @RequestHeader("X-User-Id") String callerUserId) {
        User caller = verifyCaller(callerUserId, false);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
        }
        try {
            bookService.saveDraft(magazineId, null);
            return ResponseEntity.ok(Map.of("message", "Magazine unpublished"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to unpublish magazine: " + e.getMessage()));
        }
    }

    /** PUT /api/admin/magazine/{magazineId}/publish — Publish a specific magazine edition */
    @PutMapping("/magazine/{magazineId}/publish")
    public ResponseEntity<?> publishMagazineById(
            @PathVariable Long magazineId,
            @RequestHeader("X-User-Id") String callerUserId) {
        User caller = verifyCaller(callerUserId, false);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
        }
        try {
            bookService.publishBook(magazineId, null);
            return ResponseEntity.ok(Map.of("message", "Magazine published"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to publish magazine: " + e.getMessage()));
        }
    }

    /** POST /api/admin/magazine/{magazineId}/create-hindi-edition — Clone magazine and translate to Hindi */
    @PostMapping("/magazine/{magazineId}/create-hindi-edition")
    public ResponseEntity<?> createHindiEdition(
            @PathVariable Long magazineId,
            @RequestHeader("X-User-Id") String callerUserId) {
        User caller = verifyCaller(callerUserId, false);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
        }
        try {
            Book hindiEdition = bookService.createHindiEdition(magazineId, caller.getId());
            return ResponseEntity.ok(hindiEdition);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create Hindi edition: " + e.getMessage()));
        }
    }

    /** POST /api/admin/magazine/upload-document — Upload PDF/Word to create magazine pages */
    @PostMapping("/magazine/upload-document")
    public ResponseEntity<?> uploadMagazineDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "magazineId", required = false) Long magazineId,
            @RequestParam(value = "title", required = false) String title,
            @RequestHeader("X-User-Id") String callerUserId) {
        User caller = verifyCaller(callerUserId, false);
        if (caller == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Admin access required"));
        }
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("File is required"));
            }
            String filename = file.getOriginalFilename();
            boolean isPdf = filename != null && filename.toLowerCase().endsWith(".pdf");

            // Get or create magazine
            Book magazine;
            if (magazineId != null) {
                magazine = bookService.getBook(magazineId);
            } else {
                magazine = bookService.getOrCreateMagazine(caller.getId());
            }
            if (title != null && !title.trim().isEmpty()) {
                bookService.updateBook(magazine.getId(), title.trim(), null, null);
            }

            // Extract pages from document and add them to the magazine
            if (isPdf) {
                List<String> imageUrls = documentExtractionService.extractPdfAsImages(file);
                if (imageUrls.isEmpty()) {
                    return ResponseEntity.badRequest().body(errorMap("No pages could be rendered from the PDF"));
                }
                int startPage = magazine.getPages() != null ? magazine.getPages().size() + 1 : 1;
                for (int i = 0; i < imageUrls.size(); i++) {
                    Page page = new Page();
                    page.setBookId(magazine.getId());
                    page.setPageNumber(startPage + i);
                    page.setImageUrl(imageUrls.get(i));
                    page.setFormat("{\"layout\":{\"image1\":{\"x\":0,\"y\":0,\"width\":550,\"height\":700}}}");
                    page.setCreatedDate(java.time.LocalDateTime.now());
                    page.setModifiedDate(java.time.LocalDateTime.now());
                    bookService.addPage(magazine.getId(), page, null);
                }
            } else {
                List<String> pageTexts = documentExtractionService.extractText(file);
                if (pageTexts.isEmpty()) {
                    return ResponseEntity.badRequest().body(errorMap("No text could be extracted from the document"));
                }
                int startPage = magazine.getPages() != null ? magazine.getPages().size() + 1 : 1;
                for (int i = 0; i < pageTexts.size(); i++) {
                    Page page = new Page();
                    page.setBookId(magazine.getId());
                    page.setPageNumber(startPage + i);
                    page.setContent(pageTexts.get(i));
                    String format = "{\"textBlocks\":[{\"id\":\"tb" + System.currentTimeMillis() + i +
                            "\",\"content\":" + escapeJson(pageTexts.get(i)) +
                            ",\"fontFamily\":\"serif\",\"fontSize\":\"14px\",\"color\":\"#000000\"," +
                            "\"x\":20,\"y\":20,\"width\":510,\"height\":660}]}";
                    page.setFormat(format);
                    page.setCreatedDate(java.time.LocalDateTime.now());
                    page.setModifiedDate(java.time.LocalDateTime.now());
                    bookService.addPage(magazine.getId(), page, null);
                }
            }

            // Reload and return the magazine with updated pages
            Book updated = bookService.getBook(magazine.getId());
            updated.setPages(bookService.getPagesByBookId(magazine.getId()));
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to process document: " + e.getMessage()));
        }
    }

    private String escapeJson(String text) {
        if (text == null) return "\"\"";
        return "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
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
