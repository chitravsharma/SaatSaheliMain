package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.util.PageSizes;
import com.SaatSaheli.spring.model.Page;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.BookRepository;
import com.SaatSaheli.spring.repository.PageRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.util.RoleUtil;
import com.SaatSaheli.spring.util.PlanLimits;
import com.SaatSaheli.spring.util.PlanLimitException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BookService {

    private static final Logger log = LoggerFactory.getLogger(BookService.class);

    private static final String[] RANDOM_TITLES = {
            "Untitled Story", "My Adventures", "A New Beginning", "The Journey",
            "Creative Tales", "Thoughts & Ideas", "Inspiration Book", "Dream Journal",
            "My Collection", "The Notebook", "Wandering Pages", "Hidden Chapters",
            "Open Horizons", "Quiet Reflections", "Bold Strokes", "Fresh Canvas"
    };

    @Autowired
    private BookRepository bookRepo;

    @Autowired
    private PageRepository pageRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private TranslationService translationService;

    @PostConstruct
    public void syncOrphanedPages() {
        try {
            List<Page> allPages = pageRepo.findAll();
            List<Book> allBooks = bookRepo.findAll();

            Set<Long> existingBookIds = allBooks.stream()
                    .map(Book::getId)
                    .collect(Collectors.toSet());

            Set<Long> orphanedBookIds = allPages.stream()
                    .map(Page::getBookId)
                    .filter(id -> id != null && !existingBookIds.contains(id))
                    .collect(Collectors.toSet());

            if (orphanedBookIds.isEmpty()) {
                log.info("No orphaned pages found - all bookIds exist in Books table");
                return;
            }

            log.warn("Found {} orphaned bookIds in Pages table: {}. These pages reference non-existent books.", orphanedBookIds.size(), orphanedBookIds);
        } catch (Exception e) {
            log.error("Failed to check orphaned pages: {}", e.getMessage(), e);
        }
    }

    // --- Plan-limit enforcement helpers -------------------------------------
    private PlanLimits limitsForUser(Long userId) {
        String plan = userId == null ? "Free"
                : userRepo.findById(userId).map(User::getPlan).orElse("Free");
        return PlanLimits.forPlan(plan);
    }

    /**
     * Admins (ADMIN + SUPER_ADMIN) bypass plan caps — they manage platform
     * content (e.g. the magazine upload workflow, which appends pages well past
     * the per-book cap) and are not subject to subscription limits.
     */
    private boolean isPlanExempt(Long userId) {
        if (userId == null) return false;
        return userRepo.findById(userId)
                .map(u -> RoleUtil.isAdmin(u.getRole()))
                .orElse(false);
    }

    private void assertCanCreateBook(Long userId) {
        if (userId == null || isPlanExempt(userId)) return;
        PlanLimits lim = limitsForUser(userId);
        // Free tier cannot create or upload books at all — it's a paid-tier feature.
        if (!lim.canCreateBooks) {
            throw new PlanLimitException("Creating and uploading books is available on the "
                    + "Premium and Creator plans. Upgrade your plan to create books.");
        }
        // Count only live books — soft-deleted (DELETED) books no longer count
        // against the cap. countBooksByUser excludes DELETED.
        long count = countBooksByUser(userId);
        if (count >= lim.maxBooks) {
            throw new PlanLimitException("You've reached your " + lim.plan
                    + " plan limit of " + lim.maxBooks + " books. Upgrade your plan to create more.");
        }
    }

    private void assertImportPageCount(Long userId, int pageCount) {
        if (isPlanExempt(userId)) return;
        PlanLimits lim = limitsForUser(userId);
        if (pageCount > lim.maxPagesPerBook) {
            throw new PlanLimitException("This document has " + pageCount + " pages, which exceeds your "
                    + lim.plan + " plan limit of " + lim.maxPagesPerBook
                    + " pages per book. Upgrade your plan or split the document.");
        }
    }

    private void assertCanAddPage(Long bookId) {
        Book book = bookRepo.findById(bookId).orElse(null);
        if (book == null || book.getUserId() == null) return;
        if (isPlanExempt(book.getUserId())) return;
        PlanLimits lim = limitsForUser(book.getUserId());
        // Free tier is read-only for authoring — cannot add pages to any book.
        if (!lim.canCreateBooks) {
            throw new PlanLimitException("Adding pages is available on the Premium and Creator plans. "
                    + "Upgrade your plan to keep building your books.");
        }
        long pages = pageRepo.countByBookId(bookId);
        if (pages >= lim.maxPagesPerBook) {
            throw new PlanLimitException("This book has reached the " + lim.plan
                    + " plan limit of " + lim.maxPagesPerBook
                    + " pages. Upgrade your plan for more pages per book.");
        }
    }

    @Transactional
    public Book createBook(String title, Long userId) {
        return createBook(title, userId, null);
    }

    @Transactional
    public Book createBook(String title, Long userId, String category) {
        return createBook(title, userId, category, null);
    }

    @Transactional
    public Book createBook(String title, Long userId, String category, String pageSizeValue) {
        assertCanCreateBook(userId);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        Book book = new Book();
        book.setTitle(title);
        book.setUserId(userId);
        book.setCategory(category);
        book.setPageSize(pageSizeValue);
        book.setStatus("DRAFT");
        book.setCreatedDate(now);
        book.setModifiedDate(now);
        book = bookRepo.save(book);

        // Create default pages: Cover and Back
        Page cover = new Page();
        cover.setBookId(book.getId());
        cover.setPageNumber(1);
        cover.setContent("Cover Page");
        cover.setFormat("bold");
        cover.setCreatedDate(now);
        cover.setModifiedDate(now);
        pageRepo.save(cover);

        Page back = new Page();
        back.setBookId(book.getId());
        back.setPageNumber(50);
        back.setContent("The End");
        back.setFormat("italic");
        back.setCreatedDate(now);
        back.setModifiedDate(now);
        pageRepo.save(back);

        book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        return book;
    }

    /** Book row only — no pages loaded. For callers that just need its metadata. */
    public Book getBookSummary(Long id) {
        return bookRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Book not found"));
    }

    public Book getBook(Long id) {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isEmpty()) throw new RuntimeException("Book not found");
        Book book = bookOpt.get();
        List<Page> pages = pageRepo.findByBookIdOrderByPageNumberAsc(id);
        book.setPages(pages);
        if (!pages.isEmpty() && pages.get(0).getImageUrl() != null && !pages.get(0).getImageUrl().isEmpty()) {
            book.setCoverImageUrl(pages.get(0).getImageUrl());
        }
        return book;
    }

    public Book updateBook(Long id, String title, String status, Long requestUserId) {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isEmpty()) throw new RuntimeException("Book not found");
        Book book = bookOpt.get();
        if (requestUserId != null && !requestUserId.equals(book.getUserId())) {
            throw new RuntimeException("Only the author can edit this book");
        }
        if (title != null) book.setTitle(title);
        if (status != null) book.setStatus(status);
        book.setModifiedDate(LocalDateTime.now(ZoneOffset.UTC));
        return bookRepo.save(book);
    }

    public Book publishBook(Long id, Long requestUserId) {
        // Renumber back page to be right after the last content page
        renumberBackPage(id);
        return updateBook(id, null, "PUBLISHED", requestUserId);
    }

    /**
     * Finds the back page (highest page number) and renumbers it
     * to be sequentially after the last content page.
     */
    private void renumberBackPage(Long bookId) {
        List<Page> pages = pageRepo.findByBookIdOrderByPageNumberAsc(bookId);
        if (pages.size() < 2) return;

        Page lastPage = pages.get(pages.size() - 1);
        Page secondLast = pages.get(pages.size() - 2);

        // Only renumber if there's a gap (back page number > secondLast + 1)
        int expectedNumber = secondLast.getPageNumber() + 1;
        if (lastPage.getPageNumber() > expectedNumber) {
            lastPage.setPageNumber(expectedNumber);
            lastPage.setModifiedDate(LocalDateTime.now(ZoneOffset.UTC));
            pageRepo.save(lastPage);
        }
    }

    public Book saveDraft(Long id, Long requestUserId) {
        return updateBook(id, null, "DRAFT", requestUserId);
    }

    public void deleteBook(Long id, Long requestUserId) {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            if (requestUserId != null && !requestUserId.equals(book.getUserId())) {
                throw new RuntimeException("Only the author can delete this book");
            }
            book.setStatus("DELETED");
            book.setModifiedDate(LocalDateTime.now(ZoneOffset.UTC));
            bookRepo.save(book);
        }
    }

    /** Archive a book (soft status change) */
    public void archiveBook(Long id) {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            book.setStatus("ARCHIVED");
            book.setModifiedDate(LocalDateTime.now(ZoneOffset.UTC));
            bookRepo.save(book);
        }
    }

    /** Recover a deleted or archived book back to DRAFT */
    public void recoverBook(Long id) {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            book.setStatus("DRAFT");
            book.setModifiedDate(LocalDateTime.now(ZoneOffset.UTC));
            bookRepo.save(book);
        }
    }

    /** Permanently purge a single book and its pages */
    @Transactional
    public void purgeBook(Long id) {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isPresent()) {
            List<Page> pages = pageRepo.findByBookIdOrderByPageNumberAsc(id);
            pageRepo.deleteAll(pages);
            bookRepo.delete(bookOpt.get());
            log.info("Permanently purged book {} and {} pages", id, pages.size());
        }
    }

    /** Role-aware updateBook: admins skip ownership check */
    public Book updateBook(Long id, String title, String status, Long requestUserId, String requestUserRole) {
        if (RoleUtil.isAdmin(requestUserRole)) {
            return updateBook(id, title, status, null);
        }
        return updateBook(id, title, status, requestUserId);
    }

    /** Role-aware deleteBook: admins skip ownership check */
    public void deleteBook(Long id, Long requestUserId, String requestUserRole) {
        if (RoleUtil.isAdmin(requestUserRole)) {
            deleteBook(id, null);
        } else {
            deleteBook(id, requestUserId);
        }
    }

    /** Get all books (for admin dashboard) */
    public List<Book> getAllBooks() {
        List<Book> books = bookRepo.findAll();
        List<User> allUsers = userRepo.findAll();
        Map<Long, User> userMap = allUsers.stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        for (Book book : books) {
            if (book.getUserId() != null && userMap.containsKey(book.getUserId())) {
                User u = userMap.get(book.getUserId());
                String name = (u.getDisplayName() != null && !u.getDisplayName().isEmpty())
                        ? u.getDisplayName()
                        : ((u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "")).trim();
                book.setAuthorName(name);
            }
        }
        enrichWithCoverImages(books);
        return books;
    }

    /** Get the most recent non-deleted magazine */
    public Book getMagazine() {
        List<Book> mags = bookRepo.findByCategoryIgnoreCaseOrderByModifiedDateDesc("MAGAZINE");
        // Prioritize PUBLISHED magazines, then fall back to any non-deleted
        Book mag = mags.stream()
                .filter(m -> "PUBLISHED".equalsIgnoreCase(m.getStatus()))
                .findFirst()
                .orElse(mags.stream()
                        .filter(m -> !"DELETED".equalsIgnoreCase(m.getStatus()))
                        .findFirst().orElse(null));
        if (mag == null) return null;
        mag.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(mag.getId()));
        enrichWithCoverImages(List.of(mag));
        return mag;
    }

    /**
     * Set the language label on a magazine edition ("en" or "hi").
     * Only labels the edition — no content is translated or cloned.
     * Deliberately leaves modifiedDate untouched so relabelling an old edition
     * does not push it to the top of the "newest first" listings.
     */
    @Transactional
    public Book setMagazineLanguage(Long magazineId, String language) {
        if (language == null || !("en".equalsIgnoreCase(language.trim()) || "hi".equalsIgnoreCase(language.trim()))) {
            throw new IllegalArgumentException("Language must be 'en' or 'hi'");
        }
        Book mag = bookRepo.findById(magazineId)
                .orElseThrow(() -> new RuntimeException("Magazine not found"));
        if (!"MAGAZINE".equalsIgnoreCase(mag.getCategory())) {
            throw new IllegalArgumentException("Book is not a magazine");
        }
        mag.setLanguage(language.trim().toLowerCase());
        return bookRepo.save(mag);
    }

    /**
     * Magazine editions for cover cards (Home + /magazine listings).
     * Same ordering and filtering as getAllMagazines, but reads only each
     * magazine's first page to derive the cover and returns no page payload —
     * the listings render title/cover/language only. Loading every page of
     * every edition made this response grow with the whole back catalogue.
     */
    public List<Book> getMagazineSummaries() {
        List<Book> mags = bookRepo.findByCategoryIgnoreCaseOrderByModifiedDateDesc("MAGAZINE").stream()
                .filter(m -> !"DELETED".equalsIgnoreCase(m.getStatus()))
                .collect(Collectors.toList());
        for (Book mag : mags) {
            String cover = resolveCoverImageUrl(mag.getId());
            if (cover != null) mag.setCoverImageUrl(cover);
            mag.setPages(Collections.emptyList());
        }
        return mags;
    }

    /**
     * Resolve a book's cover image from its first page — the image URL if the page
     * has one, otherwise the first image in the page's format JSON.
     *
     * Book.coverImageUrl is @Transient, so a plain bookRepo.findById() never has it
     * populated. Anything outside this service that needs a cover (e.g. Open Graph
     * share tags) must call this rather than reading the getter off a raw entity.
     */
    public String resolveCoverImageUrl(Long bookId) {
        if (bookId == null) return null;
        return pageRepo.findFirstByBookIdOrderByPageNumberAsc(bookId)
                .map(first -> {
                    if (first.getImageUrl() != null && !first.getImageUrl().isEmpty()) {
                        return first.getImageUrl();
                    }
                    return extractFirstImageFromFormat(first.getFormat());
                })
                .orElse(null);
    }

    /** Get all magazine editions ordered by most recent first (excludes deleted) */
    public List<Book> getAllMagazines() {
        List<Book> mags = bookRepo.findByCategoryIgnoreCaseOrderByModifiedDateDesc("MAGAZINE").stream()
                .filter(m -> !"DELETED".equalsIgnoreCase(m.getStatus()))
                .collect(Collectors.toList());
        for (Book mag : mags) {
            mag.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(mag.getId()));
        }
        enrichWithCoverImages(mags);
        return mags;
    }

    /** Get or create the current magazine (for admin use) — returns the most recent one regardless of status */
    @Transactional
    public Book getOrCreateMagazine(Long adminUserId) {
        Book mag = getMagazine();
        if (mag != null) return mag;
        // No magazine exists at all — create one
        return createBook("Saat Saheli Magazine", adminUserId, "MAGAZINE");
    }

    /** Create a new magazine edition (always a new draft) */
    @Transactional
    public Book createNewMagazineEdition(Long adminUserId, String title) {
        String editionTitle = (title != null && !title.trim().isEmpty()) ? title.trim() : "Saat Saheli Magazine";
        return createBook(editionTitle, adminUserId, "MAGAZINE");
    }

    /**
     * Clone a published magazine and translate all text content to Hindi.
     * Images are kept as-is; text content and text blocks in format JSON are translated.
     */
    @Transactional
    public Book createHindiEdition(Long sourceMagazineId, Long adminUserId) {
        Book source = bookRepo.findById(sourceMagazineId)
                .orElseThrow(() -> new RuntimeException("Source magazine not found"));
        if (!"MAGAZINE".equalsIgnoreCase(source.getCategory())) {
            throw new RuntimeException("Source is not a magazine");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        String hindiTitle = translationService.translateToHindi(source.getTitle());

        Book hindi = new Book();
        hindi.setTitle(hindiTitle + " — हिंदी संस्करण");
        hindi.setUserId(adminUserId);
        hindi.setCategory("MAGAZINE");
        hindi.setLanguage("hi");
        hindi.setStatus("DRAFT");
        hindi.setCreatedDate(now);
        hindi.setModifiedDate(now);
        hindi = bookRepo.save(hindi);

        // Clone and translate each page
        List<Page> sourcePages = pageRepo.findByBookIdOrderByPageNumberAsc(sourceMagazineId);
        for (Page sp : sourcePages) {
            Page hp = new Page();
            hp.setBookId(hindi.getId());
            hp.setPageNumber(sp.getPageNumber());
            hp.setImageUrl(sp.getImageUrl());
            hp.setImageUrl2(sp.getImageUrl2());
            hp.setCreatedDate(now);
            hp.setModifiedDate(now);

            // Translate page content
            if (sp.getContent() != null && !sp.getContent().isBlank()) {
                hp.setContent(translationService.translateToHindi(sp.getContent()));
            }

            // Translate text blocks inside format JSON
            hp.setFormat(translateFormatJson(sp.getFormat()));

            pageRepo.save(hp);
        }

        hindi.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(hindi.getId()));
        enrichWithCoverImages(List.of(hindi));
        return hindi;
    }

    /** Translate textBlocks content inside a format JSON string */
    private String translateFormatJson(String formatStr) {
        if (formatStr == null || formatStr.isBlank()) return formatStr;
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.node.ObjectNode root = (com.fasterxml.jackson.databind.node.ObjectNode) mapper.readTree(formatStr);

            if (root.has("textBlocks") && root.get("textBlocks").isArray()) {
                com.fasterxml.jackson.databind.node.ArrayNode blocks = (com.fasterxml.jackson.databind.node.ArrayNode) root.get("textBlocks");
                for (int i = 0; i < blocks.size(); i++) {
                    com.fasterxml.jackson.databind.node.ObjectNode block = (com.fasterxml.jackson.databind.node.ObjectNode) blocks.get(i);
                    if (block.has("content") && !block.get("content").asText("").isBlank()) {
                        String translated = translationService.translateToHindi(block.get("content").asText());
                        block.put("content", translated);
                    }
                }
            }

            // Translate pageContentHindi field if present, or add it
            if (root.has("pageContentHindi") && !root.get("pageContentHindi").asText("").isBlank()) {
                // Already has Hindi content, leave it
            }

            return mapper.writeValueAsString(root);
        } catch (Exception e) {
            log.warn("Failed to translate format JSON: {}", e.getMessage());
            return formatStr;
        }
    }

    public List<Book> getBooksByUser(Long userId) {
        List<Book> books = bookRepo.findByUserId(userId).stream()
                .filter(b -> !"DELETED".equalsIgnoreCase(b.getStatus()))
                .collect(Collectors.toList());
        for (Book book : books) {
            book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        }
        enrichWithCoverImages(books);
        return books;
    }

    /** Get published books by category, enriched with author names */
    public List<Book> getPublishedBooksByCategory(String category) {
        List<Book> books = bookRepo.findAll().stream()
                .filter(b -> category.equalsIgnoreCase(b.getCategory()))
                .filter(b -> "PUBLISHED".equalsIgnoreCase(b.getStatus()))
                .collect(Collectors.toList());
        List<User> allUsers = userRepo.findAll();
        Map<Long, User> userMap = allUsers.stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        for (Book book : books) {
            if (book.getUserId() != null && userMap.containsKey(book.getUserId())) {
                User u = userMap.get(book.getUserId());
                String name = (u.getDisplayName() != null && !u.getDisplayName().isEmpty())
                        ? u.getDisplayName()
                        : ((u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "")).trim();
                book.setAuthorName(name);
            }
        }
        enrichWithCoverImages(books);
        return books;
    }

    /** Get books by user and category (for "my books in this category") */
    public List<Book> getBooksByUserAndCategory(Long userId, String category) {
        return bookRepo.findByUserId(userId).stream()
                .filter(b -> category.equalsIgnoreCase(b.getCategory()))
                .filter(b -> !"DELETED".equalsIgnoreCase(b.getStatus()))
                .collect(Collectors.toList());
    }

    public List<Book> getDraftsByUser(Long userId) {
        return bookRepo.findByUserIdAndStatusIgnoreCase(userId, "DRAFT");
    }

    /**
     * Newest first. modifiedDate leads because publishing a book goes through
     * updateBook, which bumps it — so a freshly published book sorts to the top of the
     * Published Books shelf, which is what "recently added" means there. createdDate
     * and id break ties and keep the order stable for rows with no timestamps.
     */
    private static final Comparator<Book> NEWEST_FIRST =
            Comparator.comparing(Book::getModifiedDate, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(Book::getCreatedDate, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(Book::getId, Comparator.nullsLast(Comparator.reverseOrder()));

    public List<Book> searchBooks(Long id, String title, String author, String status, Long requestUserId, String category) {
        List<Book> books = bookRepo.findAll();

        // Build a userId->User lookup for author enrichment
        List<User> allUsers = userRepo.findAll();
        Map<Long, User> userMap = allUsers.stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        // If filtering by author, find matching user IDs first
        Set<Long> authorMatchIds = null;
        if (author != null && !author.trim().isEmpty()) {
            String authorLower = author.trim().toLowerCase();
            authorMatchIds = allUsers.stream()
                    .filter(u -> {
                        String first = u.getFirstName() != null ? u.getFirstName().toLowerCase() : "";
                        String last = u.getLastName() != null ? u.getLastName().toLowerCase() : "";
                        String display = u.getDisplayName() != null ? u.getDisplayName().toLowerCase() : "";
                        return first.contains(authorLower) || last.contains(authorLower) || display.contains(authorLower);
                    })
                    .map(User::getId)
                    .collect(Collectors.toSet());
        }

        final Set<Long> finalAuthorMatchIds = authorMatchIds;

        List<Book> filtered = books.stream()
                // Hide DELETED books from everyone
                .filter(b -> !"DELETED".equalsIgnoreCase(b.getStatus()))
                // Hide DRAFT books unless the requesting user is the author
                .filter(b -> {
                    if ("DRAFT".equalsIgnoreCase(b.getStatus())) {
                        return requestUserId != null && requestUserId.equals(b.getUserId());
                    }
                    return true;
                })
                .filter(b -> id == null || b.getId().equals(id))
                .filter(b -> title == null || title.trim().isEmpty()
                        || (b.getTitle() != null && b.getTitle().toLowerCase().contains(title.trim().toLowerCase())))
                .filter(b -> status == null || status.trim().isEmpty()
                        || status.trim().equalsIgnoreCase(b.getStatus()))
                .filter(b -> finalAuthorMatchIds == null
                        || (b.getUserId() != null && finalAuthorMatchIds.contains(b.getUserId())))
                .filter(b -> category == null || category.trim().isEmpty()
                        || category.trim().equalsIgnoreCase(b.getCategory()))
                // findAll() returns insertion order, so without this the newest book
                // lands at the BOTTOM of every list built on this endpoint.
                .sorted(NEWEST_FIRST)
                .collect(Collectors.toList());

        // Enrich with author name and pages
        for (Book book : filtered) {
            if (book.getUserId() != null && userMap.containsKey(book.getUserId())) {
                User u = userMap.get(book.getUserId());
                String name = (u.getDisplayName() != null && !u.getDisplayName().isEmpty())
                        ? u.getDisplayName()
                        : ((u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "")).trim();
                book.setAuthorName(name);
            }
            book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        }
        enrichWithCoverImages(filtered);

        return filtered;
    }

    @Transactional
    public Book createBookFromDocument(String title, Long userId, List<String> pageTexts) {
        return createBookFromDocument(title, userId, pageTexts, null);
    }

    @Transactional
    public Book createBookFromDocument(String title, Long userId, List<String> pageTexts, String pageSizeValue) {
        assertCanCreateBook(userId);
        assertImportPageCount(userId, pageTexts == null ? 0 : pageTexts.size());
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        Book book = new Book();
        book.setTitle(title);
        book.setUserId(userId);
        book.setPageSize(pageSizeValue);
        book.setStatus("DRAFT");
        book.setCreatedDate(now);
        book.setModifiedDate(now);
        book = bookRepo.save(book);

        if (pageTexts.size() >= 2) {
            // Cover page — use first page of the document
            Page cover = new Page();
            cover.setBookId(book.getId());
            cover.setPageNumber(1);
            cover.setContent(pageTexts.get(0));
            cover.setFormat("bold");
            cover.setCreatedDate(now);
            cover.setModifiedDate(now);
            pageRepo.save(cover);

            // Middle content pages (skip first and last)
            for (int i = 1; i < pageTexts.size() - 1; i++) {
                Page page = new Page();
                page.setBookId(book.getId());
                page.setPageNumber(i + 1);
                page.setContent(pageTexts.get(i));
                page.setCreatedDate(now);
                page.setModifiedDate(now);
                pageRepo.save(page);
            }

            // Back cover — use last page of the document
            Page back = new Page();
            back.setBookId(book.getId());
            back.setPageNumber(pageTexts.size());
            back.setContent(pageTexts.get(pageTexts.size() - 1));
            back.setFormat("italic");
            back.setCreatedDate(now);
            back.setModifiedDate(now);
            pageRepo.save(back);
        } else if (pageTexts.size() == 1) {
            // Single page document — use it as cover, add "The End" back page
            Page cover = new Page();
            cover.setBookId(book.getId());
            cover.setPageNumber(1);
            cover.setContent(pageTexts.get(0));
            cover.setFormat("bold");
            cover.setCreatedDate(now);
            cover.setModifiedDate(now);
            pageRepo.save(cover);

            Page back = new Page();
            back.setBookId(book.getId());
            back.setPageNumber(2);
            back.setContent("The End");
            back.setFormat("italic");
            back.setCreatedDate(now);
            back.setModifiedDate(now);
            pageRepo.save(back);
        }

        book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        return book;
    }

    @Transactional
    public Book createBookFromPdfImages(String title, Long userId, List<String> imageUrls) {
        return createBookFromPdfImages(title, userId, imageUrls, null);
    }

    @Transactional
    public Book createBookFromPdfImages(String title, Long userId, List<String> imageUrls, String pageSizeValue) {
        assertCanCreateBook(userId);
        assertImportPageCount(userId, imageUrls == null ? 0 : imageUrls.size());
        PageSizes.Spec size = PageSizes.resolve(pageSizeValue);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        Book book = new Book();
        book.setTitle(title);
        book.setUserId(userId);
        book.setPageSize(pageSizeValue);
        book.setStatus("DRAFT");
        book.setCreatedDate(now);
        book.setModifiedDate(now);
        book = bookRepo.save(book);

        if (imageUrls.size() >= 2) {
            // Cover page — use first page of the PDF as cover image
            Page cover = new Page();
            cover.setBookId(book.getId());
            cover.setPageNumber(1);
            cover.setContent(title);
            cover.setImageUrl(imageUrls.get(0));
            cover.setFormat(pdfPageFormat(1, imageUrls.get(0), size));
            cover.setCreatedDate(now);
            cover.setModifiedDate(now);
            pageRepo.save(cover);

            // Middle content pages (skip first and last)
            for (int i = 1; i < imageUrls.size() - 1; i++) {
                Page page = new Page();
                page.setBookId(book.getId());
                page.setPageNumber(i + 1);
                page.setImageUrl(imageUrls.get(i));
                page.setFormat(pdfPageFormat(i + 1, imageUrls.get(i), size));
                page.setCreatedDate(now);
                page.setModifiedDate(now);
                pageRepo.save(page);
            }

            // Back cover — use last page of the PDF as back cover image
            Page back = new Page();
            back.setBookId(book.getId());
            back.setPageNumber(imageUrls.size());
            back.setImageUrl(imageUrls.get(imageUrls.size() - 1));
            back.setFormat(pdfPageFormat(imageUrls.size(), imageUrls.get(imageUrls.size() - 1), size));
            back.setCreatedDate(now);
            back.setModifiedDate(now);
            pageRepo.save(back);
        } else if (imageUrls.size() == 1) {
            // Single page PDF — use it as cover, add "The End" back page
            Page cover = new Page();
            cover.setBookId(book.getId());
            cover.setPageNumber(1);
            cover.setContent(title);
            cover.setImageUrl(imageUrls.get(0));
            cover.setFormat(pdfPageFormat(1, imageUrls.get(0), size));
            cover.setCreatedDate(now);
            cover.setModifiedDate(now);
            pageRepo.save(cover);

            Page back = new Page();
            back.setBookId(book.getId());
            back.setPageNumber(2);
            back.setContent("The End");
            back.setFormat("italic");
            back.setCreatedDate(now);
            back.setModifiedDate(now);
            pageRepo.save(back);
        }

        book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        return book;
    }

    /** Enrich books with cover image URL from their first page (page 1) */
    private void enrichWithCoverImages(List<Book> books) {
        for (Book book : books) {
            List<Page> pages = book.getPages();
            if (pages == null || pages.isEmpty()) {
                pages = pageRepo.findByBookIdOrderByPageNumberAsc(book.getId());
            }
            if (pages != null && !pages.isEmpty()) {
                Page firstPage = pages.get(0);
                if (firstPage.getImageUrl() != null && !firstPage.getImageUrl().isEmpty()) {
                    book.setCoverImageUrl(firstPage.getImageUrl());
                } else {
                    // Try to extract image URL from format JSON (magazine-style pages store images in imageBlocks)
                    String coverUrl = extractFirstImageFromFormat(firstPage.getFormat());
                    if (coverUrl != null) {
                        book.setCoverImageUrl(coverUrl);
                    }
                }
            }
        }
    }

    /** Extract the first image URL from a page's format JSON (imageBlocks array) */
    private String extractFirstImageFromFormat(String format) {
        if (format == null || format.isEmpty() || !format.startsWith("{")) return null;
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(format);
            com.fasterxml.jackson.databind.JsonNode imageBlocks = root.get("imageBlocks");
            if (imageBlocks != null && imageBlocks.isArray() && imageBlocks.size() > 0) {
                com.fasterxml.jackson.databind.JsonNode url = imageBlocks.get(0).get("url");
                if (url != null && !url.asText().isEmpty()) {
                    return url.asText();
                }
            }
        } catch (Exception e) {
            // ignore parse errors
        }
        return null;
    }

    /** Permanently delete all books with DELETED status and their pages */
    @Transactional
    public int purgeDeletedBooks() {
        List<Book> deletedBooks = bookRepo.findByStatusIgnoreCase("DELETED");
        int count = deletedBooks.size();
        for (Book book : deletedBooks) {
            List<Page> pages = pageRepo.findByBookIdOrderByPageNumberAsc(book.getId());
            pageRepo.deleteAll(pages);
            bookRepo.delete(book);
        }
        log.info("Permanently purged {} deleted books and their pages", count);
        return count;
    }

    /** Count books created by a user (excluding DELETED) */
    public long countBooksByUser(Long userId) {
        return bookRepo.findByUserId(userId).stream()
                .filter(b -> !"DELETED".equalsIgnoreCase(b.getStatus()))
                .count();
    }

    public List<Page> getPagesByBookId(Long bookId) {
        return pageRepo.findByBookIdOrderByPageNumberAsc(bookId);
    }

    public Page addPage(Long bookId, Page page, Long requestUserId) {
        Optional<Book> bookOpt = bookRepo.findById(bookId);
        if (bookOpt.isPresent() && requestUserId != null && !requestUserId.equals(bookOpt.get().getUserId())) {
            throw new RuntimeException("Only the author can add pages to this book");
        }
        assertCanAddPage(bookId);
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        page.setBookId(bookId);
        page.setCreatedDate(now);
        page.setModifiedDate(now);
        Page saved = pageRepo.save(page);
        // Update book modified date
        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            book.setModifiedDate(now);
            bookRepo.save(book);
        }
        return saved;
    }

    public Page updatePage(Long pageId, Page updated, Long requestUserId) {
        Optional<Page> pageOpt = pageRepo.findById(pageId);
        if (pageOpt.isEmpty()) throw new RuntimeException("Page not found");
        Page page = pageOpt.get();
        // Check ownership via the book
        if (requestUserId != null && page.getBookId() != null) {
            Optional<Book> bookOpt = bookRepo.findById(page.getBookId());
            if (bookOpt.isPresent() && !requestUserId.equals(bookOpt.get().getUserId())) {
                throw new RuntimeException("Only the author can edit pages of this book");
            }
        }
        if (updated.getContent() != null) page.setContent(updated.getContent());
        if (updated.getImageUrl() != null) page.setImageUrl(updated.getImageUrl());
        if (updated.getImageUrl2() != null) page.setImageUrl2(updated.getImageUrl2());
        if (updated.getFormat() != null) page.setFormat(updated.getFormat());
        if (updated.getPageNumber() > 0) page.setPageNumber(updated.getPageNumber());
        page.setModifiedDate(LocalDateTime.now(ZoneOffset.UTC));
        return pageRepo.save(page);
    }

    public void deletePage(Long pageId, Long requestUserId) {
        Optional<Page> pageOpt = pageRepo.findById(pageId);
        if (pageOpt.isPresent() && requestUserId != null && pageOpt.get().getBookId() != null) {
            Optional<Book> bookOpt = bookRepo.findById(pageOpt.get().getBookId());
            if (bookOpt.isPresent() && !requestUserId.equals(bookOpt.get().getUserId())) {
                throw new RuntimeException("Only the author can delete pages of this book");
            }
        }
        pageRepo.deleteById(pageId);
    }

    // Page format for PDF-imported pages: a single image block at full-page bounds.
    // The MagazineEditor canvas renders imageBlocks; the older layout.image1 shape was a no-op there.
    /**
     * Layout for an imported PDF page: the rendered page image, full-bleed in the
     * book's own frame.
     *
     * <p>Two things here stop imported artwork being cropped. The block fills the
     * frame exactly (0,0 to frame width/height) instead of the old 530x700 inset,
     * and objectFit is "contain" rather than the renderer's "cover" default — so if
     * the PDF's real proportions do not quite match the chosen shape the page is
     * letterboxed instead of having its edges cut off.
     */
    private String pdfPageFormat(int pageNumber, String imageUrl, PageSizes.Spec size) {
        String safeUrl = imageUrl == null ? "" :
                imageUrl.replace("\\", "\\\\").replace("\"", "\\\"");
        return "{\"imageBlocks\":[{\"id\":\"imported-" + pageNumber
                + "\",\"url\":\"" + safeUrl
                + "\",\"x\":0,\"y\":0,\"width\":" + size.frameWidth()
                + ",\"height\":" + size.frameHeight()
                + ",\"objectFit\":\"contain\"}]}";
    }

    /**
     * Plan check for appending a whole batch of pages at once.
     *
     * <p>assertCanAddPage checks one page at a time, so a bulk append would write
     * pages until it hit the cap and then throw, leaving the book half-extended.
     * This checks the whole batch up front so the import either lands completely or
     * not at all.
     */
    private void assertCanAppendPages(Book book, int incoming) {
        if (book.getUserId() == null || isPlanExempt(book.getUserId())) return;
        PlanLimits lim = limitsForUser(book.getUserId());
        if (!lim.canCreateBooks) {
            throw new PlanLimitException("Adding pages is available on the Premium and Creator plans. "
                    + "Upgrade your plan to keep building your books.");
        }
        long existing = pageRepo.countByBookId(book.getId());
        if (existing + incoming > lim.maxPagesPerBook) {
            throw new PlanLimitException("This book has " + existing + " pages and the document adds "
                    + incoming + ", which would exceed your " + lim.plan + " plan limit of "
                    + lim.maxPagesPerBook + " pages per book. Upgrade your plan or split the document.");
        }
    }

    /** Page number to continue from: past the highest existing one, not the count. */
    private int nextPageNumber(List<Page> existing) {
        int highest = 0;
        for (Page p : existing) {
            if (p.getPageNumber() > highest) highest = p.getPageNumber();
        }
        return highest + 1;
    }

    /**
     * Append rendered PDF pages to the end of an existing book.
     *
     * <p>The book keeps the page shape it already has — a book is read as one object,
     * so a later part cannot re-shape the frame the earlier parts were laid out in.
     * Pages whose proportions differ from that shape are letterboxed by the
     * objectFit:"contain" that pdfPageFormat writes, never cropped.
     */
    @Transactional
    public Book appendPdfImages(Long bookId, List<String> imageUrls, Long requestUserId) {
        Book book = bookRepo.findById(bookId)
                .orElseThrow(() -> new RuntimeException("Book not found"));
        if (requestUserId != null && !requestUserId.equals(book.getUserId())) {
            throw new RuntimeException("Only the author can add pages to this book");
        }
        assertCanAppendPages(book, imageUrls == null ? 0 : imageUrls.size());

        PageSizes.Spec size = PageSizes.resolve(book.getPageSize());
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        int pageNumber = nextPageNumber(pageRepo.findByBookIdOrderByPageNumberAsc(bookId));

        for (String url : imageUrls) {
            Page page = new Page();
            page.setBookId(bookId);
            page.setPageNumber(pageNumber);
            page.setImageUrl(url);
            page.setFormat(pdfPageFormat(pageNumber, url, size));
            page.setCreatedDate(now);
            page.setModifiedDate(now);
            pageRepo.save(page);
            pageNumber++;
        }

        book.setModifiedDate(now);
        book = bookRepo.save(book);
        book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(bookId));
        return book;
    }

    /** Append extracted text pages to the end of an existing book. */
    @Transactional
    public Book appendTextPages(Long bookId, List<String> pageTexts, Long requestUserId) {
        Book book = bookRepo.findById(bookId)
                .orElseThrow(() -> new RuntimeException("Book not found"));
        if (requestUserId != null && !requestUserId.equals(book.getUserId())) {
            throw new RuntimeException("Only the author can add pages to this book");
        }
        assertCanAppendPages(book, pageTexts == null ? 0 : pageTexts.size());

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        int pageNumber = nextPageNumber(pageRepo.findByBookIdOrderByPageNumberAsc(bookId));

        for (String text : pageTexts) {
            Page page = new Page();
            page.setBookId(bookId);
            page.setPageNumber(pageNumber);
            page.setContent(text);
            page.setCreatedDate(now);
            page.setModifiedDate(now);
            pageRepo.save(page);
            pageNumber++;
        }

        book.setModifiedDate(now);
        book = bookRepo.save(book);
        book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(bookId));
        return book;
    }

    /**
     * Change a book's page shape and re-fit every imported page to the new frame.
     *
     * <p>Imported pages store their image block in frame coordinates, so a size
     * change has to rewrite them or the artwork keeps the old frame's proportions.
     * Hand-laid pages (text blocks, manually placed images) are left alone — their
     * positions are the author's, not ours to rescale.
     */
    @Transactional
    public Book updatePageSize(Long bookId, String pageSizeValue, Long requestUserId) {
        Book book = bookRepo.findById(bookId)
                .orElseThrow(() -> new RuntimeException("Book not found"));
        if (requestUserId != null && !requestUserId.equals(book.getUserId())) {
            throw new RuntimeException("Only the author can edit this book");
        }
        String stored = PageSizes.normalize(pageSizeValue, 0, 0);
        PageSizes.Spec size = PageSizes.resolve(stored);
        book.setPageSize(stored);
        book.setModifiedDate(LocalDateTime.now(ZoneOffset.UTC));
        book = bookRepo.save(book);

        List<Page> pages = pageRepo.findByBookIdOrderByPageNumberAsc(bookId);
        for (Page page : pages) {
            String format = page.getFormat();
            if (format == null || !format.contains("\"imported-")) continue;
            page.setFormat(pdfPageFormat(page.getPageNumber(), page.getImageUrl(), size));
            pageRepo.save(page);
        }
        book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(bookId));
        return book;
    }
}
