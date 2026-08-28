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
import com.SaatSaheli.spring.util.PageSizes;
import com.SaatSaheli.spring.util.RateLimiter;
import com.SaatSaheli.spring.util.RoleUtil;
import com.SaatSaheli.spring.util.PlanLimits;
import com.SaatSaheli.spring.util.PlanLimitException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.service.BookService;
import com.SaatSaheli.spring.service.DocumentExtractionService;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(BookController.class);

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

    // OOM safety: reject an oversized upload before it's parsed/rasterized.
    @Value("${app.pdf.max-upload-mb:25}")
    private int maxUploadMb;

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
    public ResponseEntity<?> createBook(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            Long jwtUserId = (Long) request.getAttribute("jwtUserId");
            if (jwtUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
            }
            Object bodyUserId = body.get("userId");
            if (bodyUserId != null) {
                Long parsed = Long.parseLong(bodyUserId.toString());
                if (!jwtUserId.equals(parsed)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(errorMap("Body userId does not match authenticated user"));
                }
            }
            String title = (String) body.get("title");
            String category = body.get("category") != null ? body.get("category").toString() : null;
            if (title == null || title.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Title is required"));
            }
            // No file to measure here, so AUTO/blank just leaves the default frame.
            String pageSize = PageSizes.normalize(
                    body.get("pageSize") != null ? body.get("pageSize").toString() : null, 0, 0);
            Book book = bookService.createBook(title, jwtUserId, category, pageSize);
            return ResponseEntity.ok(book);
        } catch (PlanLimitException e) {
            return upgradeRequired(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create book: " + e.getMessage()));
        }
    }

    /**
     * Create a book from an uploaded PDF or Word document.
     *
     * @param pageSize page shape for the book: a {@link PageSizes} shape key, or
     *                 {@code AUTO}/absent to pick the shape closest to the uploaded
     *                 PDF's own proportions. The book's reader frame is built from
     *                 this, and pages are fitted inside it rather than cropped to it.
     */
    @PostMapping("/upload-document")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "pageSize", required = false) String pageSize) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("File is required"));
            }
            long maxBytes = (long) maxUploadMb * 1024 * 1024;
            if (file.getSize() > maxBytes) {
                log.warn("Document upload REJECTED (size): name={}, size={} MB > {} MB",
                        file.getOriginalFilename(), file.getSize() / (1024 * 1024), maxUploadMb);
                return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                        .body(errorMap("This file is " + (file.getSize() / (1024 * 1024)) + " MB, over the "
                                + maxUploadMb + " MB limit. Please compress or split it before uploading."));
            }
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Title is required"));
            }
            com.SaatSaheli.spring.util.UploadValidator.requireDocument(file);
            String filename = file.getOriginalFilename();
            boolean isPdf = filename != null && filename.toLowerCase().endsWith(".pdf");

            Book book;
            if (isPdf) {
                DocumentExtractionService.PdfImport imported = documentExtractionService.importPdfAsImages(file);
                if (imported.imageUrls().isEmpty()) {
                    return ResponseEntity.badRequest().body(errorMap("No pages could be rendered from the PDF"));
                }
                // The PDF's own proportions are the fallback, so AUTO shapes the frame
                // like the file.
                String resolvedSize = PageSizes.normalize(pageSize,
                        imported.widthInches(), imported.heightInches());
                book = bookService.createBookFromPdfImages(title.trim(), userId,
                        imported.imageUrls(), resolvedSize);
            } else {
                List<String> pageTexts = documentExtractionService.extractText(file);
                if (pageTexts.isEmpty()) {
                    return ResponseEntity.badRequest().body(errorMap("No text could be extracted from the document"));
                }
                // A Word document has no page shape to measure, so AUTO stays default.
                book = bookService.createBookFromDocument(title.trim(), userId, pageTexts,
                        PageSizes.normalize(pageSize, 0, 0));
            }
            return ResponseEntity.ok(book);
        } catch (PlanLimitException e) {
            return upgradeRequired(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to process document: " + e.getMessage()));
        }
    }

    /**
     * POST /api/books/{bookId}/append-document — add a document's pages to the END of
     * an existing book.
     *
     * <p>Exists because /upload-document always creates a NEW book, so a book split
     * across several files (or one too large for the per-upload page cap) could not be
     * assembled — each part became its own one-part book.
     *
     * <p>The book keeps its existing page shape: a book is read as one object, so a
     * later part must not re-shape the frame the earlier parts were laid out in.
     */
    @PostMapping("/{bookId}/append-document")
    public ResponseEntity<?> appendDocument(
            @PathVariable Long bookId,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        try {
            Long jwtUserId = (Long) request.getAttribute("jwtUserId");
            if (jwtUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
            }
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("File is required"));
            }
            // Same per-upload guards as creating a book — these exist to keep a single
            // rasterization from exhausting the container, and appending rasterizes
            // exactly the same way.
            long maxBytes = (long) maxUploadMb * 1024 * 1024;
            if (file.getSize() > maxBytes) {
                log.warn("Append upload REJECTED (size): book={}, name={}, size={} MB > {} MB",
                        bookId, file.getOriginalFilename(), file.getSize() / (1024 * 1024), maxUploadMb);
                return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                        .body(errorMap("This file is " + (file.getSize() / (1024 * 1024)) + " MB, over the "
                                + maxUploadMb + " MB limit. Please compress or split it before uploading."));
            }
            com.SaatSaheli.spring.util.UploadValidator.requireDocument(file);

            String filename = file.getOriginalFilename();
            boolean isPdf = filename != null && filename.toLowerCase().endsWith(".pdf");

            Book book;
            if (isPdf) {
                List<String> imageUrls = documentExtractionService.extractPdfAsImages(file);
                if (imageUrls.isEmpty()) {
                    return ResponseEntity.badRequest().body(errorMap("No pages could be rendered from the PDF"));
                }
                book = bookService.appendPdfImages(bookId, imageUrls, jwtUserId);
            } else {
                List<String> pageTexts = documentExtractionService.extractText(file);
                if (pageTexts.isEmpty()) {
                    return ResponseEntity.badRequest().body(errorMap("No text could be extracted from the document"));
                }
                book = bookService.appendTextPages(bookId, pageTexts, jwtUserId);
            }
            return ResponseEntity.ok(book);
        } catch (PlanLimitException e) {
            return upgradeRequired(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorMap(e.getMessage()));
        } catch (RuntimeException e) {
            // The service signals both "no such book" and "not your book" as plain
            // RuntimeExceptions; a missing book is a 404, not a permission failure.
            String msg = e.getMessage() == null ? "" : e.getMessage();
            HttpStatus code = msg.contains("not found") ? HttpStatus.NOT_FOUND : HttpStatus.FORBIDDEN;
            return ResponseEntity.status(code).body(errorMap(msg));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to append document: " + e.getMessage()));
        }
    }

    /**
     * GET /api/books/page-sizes — the page shapes the upload UI offers.
     *
     * <p>Served from the backend catalogue so the picker cannot drift from the frames
     * the reader actually builds.
     */
    @GetMapping("/page-sizes")
    public ResponseEntity<?> pageSizes() {
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (PageSizes.Spec spec : PageSizes.selectable()) {
            out.add(pageSizeMap(spec));
        }
        return ResponseEntity.ok(out);
    }

    private Map<String, Object> pageSizeMap(PageSizes.Spec spec) {
        Map<String, Object> row = new HashMap<>();
        row.put("key", spec.key());
        row.put("label", spec.label());
        row.put("description", spec.description());
        row.put("widthUnits", spec.widthUnits());
        row.put("heightUnits", spec.heightUnits());
        row.put("frameWidth", spec.frameWidth());
        row.put("frameHeight", spec.frameHeight());
        return row;
    }

    /**
     * GET /api/books/{bookId}/page-size — the page shape one book is published in.
     *
     * <p>Deliberately separate from GET /api/books/{id}: the reader needs only the
     * frame, and that endpoint carries every page of the book with it.
     */
    @GetMapping("/{bookId}/page-size")
    public ResponseEntity<?> getPageSize(@PathVariable Long bookId) {
        try {
            Book book = bookService.getBookSummary(bookId);
            Map<String, Object> out = pageSizeMap(PageSizes.resolve(book.getPageSize()));
            out.put("pageSize", book.getPageSize());
            return ResponseEntity.ok(out);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
        }
    }

    /**
     * PUT /api/books/{bookId}/page-size — change a published book's page shape.
     *
     * <p>Re-fits imported pages to the new frame, so an author who picked the wrong
     * shape on upload does not have to re-upload the PDF.
     */
    @PutMapping("/{bookId}/page-size")
    public ResponseEntity<?> updatePageSize(@PathVariable Long bookId,
                                            @RequestBody Map<String, String> body,
                                            HttpServletRequest request) {
        try {
            Long jwtUserId = (Long) request.getAttribute("jwtUserId");
            if (jwtUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
            }
            Book book = bookService.updatePageSize(bookId, body.get("pageSize"), jwtUserId);
            return ResponseEntity.ok(book);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update page size: " + e.getMessage()));
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
    public ResponseEntity<?> updateBook(@PathVariable Long bookId, @RequestBody Map<String, String> body,
                                        HttpServletRequest request) {
        try {
            Long jwtUserId = (Long) request.getAttribute("jwtUserId");
            if (jwtUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMap("Authentication required"));
            }
            String bodyUserId = body.get("userId");
            if (bodyUserId != null) {
                Long parsed = Long.parseLong(bodyUserId);
                if (!jwtUserId.equals(parsed)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(errorMap("Body userId does not match authenticated user"));
                }
            }
            String title = body.get("title");
            String status = body.get("status");
            Book book = bookService.updateBook(bookId, title, status, jwtUserId);
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
        } catch (PlanLimitException e) {
            return upgradeRequired(e.getMessage());
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
            List<Book> all = bookService.getMagazineSummaries();
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
            if (callerOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap("Authentication required"));
            }
            User caller = callerOpt.get();

            Book book = bookService.getBook(bookId);
            if (book == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap("Book not found"));
            }

            // Export allowed for SUPER_ADMIN, or the book's owner on a plan that includes export (Premium/Creator).
            boolean isSuper = RoleUtil.isSuperAdmin(caller.getRole());
            boolean ownsAndCanExport = book.getUserId() != null
                    && book.getUserId().equals(callerUserId)
                    && PlanLimits.forPlan(caller.getPlan()).canExport;
            if (!isSuper && !ownsAndCanExport) {
                return upgradeRequired("Exporting books to PDF/DOCX is available on the Premium and Creator plans. Upgrade your plan to download your books.");
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

    /** 403 body for plan-limit hits — the frontend shows an upgrade prompt on upgradeRequired. */
    private ResponseEntity<?> upgradeRequired(String message) {
        Map<String, Object> map = new HashMap<>();
        map.put("error", message);
        map.put("upgradeRequired", true);
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(map);
    }
}
