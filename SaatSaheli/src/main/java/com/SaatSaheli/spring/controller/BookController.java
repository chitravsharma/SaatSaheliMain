package com.SaatSaheli.spring.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import com.SaatSaheli.spring.model.Page;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.service.ExportService;
import com.SaatSaheli.spring.util.RateLimiter;
import com.SaatSaheli.spring.util.RoleUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.service.BookService;
import com.SaatSaheli.spring.service.DocumentExtractionService;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/books")
public class BookController {

    @Autowired
    private BookService bookService;

    @Autowired
    private DocumentExtractionService documentExtractionService;

    @Autowired
    private ExportService exportService;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private RateLimiter rateLimiter;

    @GetMapping("/search")
    public ResponseEntity<?> searchBooks(
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String category,
            HttpServletRequest request) {
        try {
            String clientIp = request.getRemoteAddr();
            if (!rateLimiter.tryAcquire("search:" + clientIp, 60, 60_000)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body(errorMap("Too many search requests. Please slow down."));
            }
            return ResponseEntity.ok(bookService.searchBooks(id, title, author, status, userId, category));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to search books: " + e.getMessage()));
        }
    }

    @PostMapping("/create")
    public ResponseEntity<?> createBook(@RequestBody Map<String, Object> body) {
        try {
            String title = (String) body.get("title");
            Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId").toString()) : null;
            String category = body.get("category") != null ? body.get("category").toString() : null;
            if (title == null || title.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Title is required"));
            }
            Book book = bookService.createBook(title, userId, category);
            return ResponseEntity.ok(book);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create book: " + e.getMessage()));
        }
    }

    @PostMapping("/upload-document")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "userId", required = false) Long userId) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("File is required"));
            }
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Title is required"));
            }
            String filename = file.getOriginalFilename();
            boolean isPdf = filename != null && filename.toLowerCase().endsWith(".pdf");

            Book book;
            if (isPdf) {
                List<String> imageUrls = documentExtractionService.extractPdfAsImages(file);
                if (imageUrls.isEmpty()) {
                    return ResponseEntity.badRequest().body(errorMap("No pages could be rendered from the PDF"));
                }
                book = bookService.createBookFromPdfImages(title.trim(), userId, imageUrls);
            } else {
                List<String> pageTexts = documentExtractionService.extractText(file);
                if (pageTexts.isEmpty()) {
                    return ResponseEntity.badRequest().body(errorMap("No text could be extracted from the document"));
                }
                book = bookService.createBookFromDocument(title.trim(), userId, pageTexts);
            }
            return ResponseEntity.ok(book);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to process document: " + e.getMessage()));
        }
    }

    @GetMapping("/{bookId}")
    public ResponseEntity<?> getBook(@PathVariable Long bookId) {
        try {
            return ResponseEntity.ok(bookService.getBook(bookId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get book: " + e.getMessage()));
        }
    }

    @PutMapping("/{bookId}")
    public ResponseEntity<?> updateBook(@PathVariable Long bookId, @RequestBody Map<String, String> body) {
        try {
            String title = body.get("title");
            String status = body.get("status");
            Long reqUserId = body.get("userId") != null ? Long.parseLong(body.get("userId")) : null;
            Book book = bookService.updateBook(bookId, title, status, reqUserId);
            return ResponseEntity.ok(book);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update book: " + e.getMessage()));
        }
    }

    @PutMapping("/{bookId}/publish")
    public ResponseEntity<?> publishBook(@PathVariable Long bookId, @RequestParam(required = false) Long userId) {
        try {
            return ResponseEntity.ok(bookService.publishBook(bookId, userId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to publish book: " + e.getMessage()));
        }
    }

    @PutMapping("/{bookId}/draft")
    public ResponseEntity<?> saveDraft(@PathVariable Long bookId, @RequestParam(required = false) Long userId) {
        try {
            return ResponseEntity.ok(bookService.saveDraft(bookId, userId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to save draft: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{bookId}")
    public ResponseEntity<?> deleteBook(@PathVariable Long bookId, @RequestParam(required = false) Long userId) {
        try {
            bookService.deleteBook(bookId, userId);
            return ResponseEntity.ok(Map.of("message", "Book deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete book: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getBooksByUser(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(bookService.getBooksByUser(userId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get books: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}/drafts")
    public ResponseEntity<?> getDraftsByUser(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(bookService.getDraftsByUser(userId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get drafts: " + e.getMessage()));
        }
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<?> getBooksByCategory(@PathVariable String category) {
        try {
            return ResponseEntity.ok(bookService.getPublishedBooksByCategory(category));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get books by category: " + e.getMessage()));
        }
    }

    @GetMapping("/category/{category}/user/{userId}")
    public ResponseEntity<?> getBooksByUserAndCategory(@PathVariable String category, @PathVariable Long userId) {
        try {
            return ResponseEntity.ok(bookService.getBooksByUserAndCategory(userId, category));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get user books by category: " + e.getMessage()));
        }
    }

    @GetMapping("/{bookId}/pages")
    public ResponseEntity<?> getPages(@PathVariable Long bookId) {
        try {
            return ResponseEntity.ok(bookService.getPagesByBookId(bookId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get pages: " + e.getMessage()));
        }
    }

    @PostMapping("/{bookId}/page")
    public ResponseEntity<?> addPage(@PathVariable Long bookId, @RequestBody Page page,
                                     @RequestParam(required = false) Long userId) {
        try {
            return ResponseEntity.ok(bookService.addPage(bookId, page, userId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to add page: " + e.getMessage()));
        }
    }

    @PutMapping("/page/{pageId}")
    public ResponseEntity<?> updatePage(@PathVariable Long pageId, @RequestBody Page updated,
                                        @RequestParam(required = false) Long userId) {
        try {
            return ResponseEntity.ok(bookService.updatePage(pageId, updated, userId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update page: " + e.getMessage()));
        }
    }

    @DeleteMapping("/page/{pageId}")
    public ResponseEntity<?> deletePage(@PathVariable Long pageId, @RequestParam(required = false) Long userId) {
        try {
            bookService.deletePage(pageId, userId);
            return ResponseEntity.ok(Map.of("message", "Page deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete page: " + e.getMessage()));
        }
    }

    @GetMapping("/magazine")
    public ResponseEntity<?> getMagazine() {
        try {
            Book magazine = bookService.getMagazine();
            if (magazine == null || !"PUBLISHED".equalsIgnoreCase(magazine.getStatus())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Magazine not available yet"));
            }
            return ResponseEntity.ok(magazine);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to fetch magazine: " + e.getMessage()));
        }
    }

    /** GET /api/books/magazines — List all published magazine editions (for readers) */
    @GetMapping("/magazines")
    public ResponseEntity<?> getPublishedMagazines() {
        try {
            List<Book> all = bookService.getAllMagazines();
            List<Book> published = all.stream()
                    .filter(m -> "PUBLISHED".equalsIgnoreCase(m.getStatus()))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(published);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to fetch magazines: " + e.getMessage()));
        }
    }

    /**
     * GET /api/books/{bookId}/export/pdf — Export book as PDF (SUPER_ADMIN only)
     */
    @GetMapping("/{bookId}/export/pdf")
    public ResponseEntity<?> exportBookPdf(@PathVariable Long bookId, HttpServletRequest request) {
        return exportBook(bookId, "pdf", request);
    }

    /**
     * GET /api/books/{bookId}/export/docx — Export book as DOCX (SUPER_ADMIN only)
     */
    @GetMapping("/{bookId}/export/docx")
    public ResponseEntity<?> exportBookDocx(@PathVariable Long bookId, HttpServletRequest request) {
        return exportBook(bookId, "docx", request);
    }

    private ResponseEntity<?> exportBook(Long bookId, String format, HttpServletRequest request) {
        try {
            // Verify SUPER_ADMIN
            Object val = request.getAttribute("jwtUserId");
            Long callerUserId = val instanceof Long ? (Long) val : null;
            if (callerUserId == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Authentication required"));
            }
            Optional<User> callerOpt = userRepo.findById(callerUserId);
            if (callerOpt.isEmpty() || !RoleUtil.isSuperAdmin(callerOpt.get().getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Super Admin access required"));
            }

            Book book = bookService.getBook(bookId);
            if (book == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Book not found"));
            }

            List<Page> pages = book.getPages();
            if (pages == null || pages.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorMap("Book has no pages"));
            }

            byte[] data;
            String contentType;
            String extension;

            if ("docx".equalsIgnoreCase(format)) {
                data = exportService.exportToDocx(book, pages);
                contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                extension = "docx";
            } else {
                data = exportService.exportToPdf(book, pages);
                contentType = "application/pdf";
                extension = "pdf";
            }

            String filename = book.getTitle().replaceAll("[^a-zA-Z0-9\\-_ ]", "").trim().replaceAll("\\s+", "_") + "." + extension;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
            headers.setContentLength(data.length);

            return new ResponseEntity<>(data, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to export book: " + e.getMessage()));
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
