package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.model.Page;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.BookRepository;
import com.SaatSaheli.spring.repository.PageRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import com.SaatSaheli.spring.util.RoleUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;

import java.time.LocalDateTime;
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

    public Book createBook(String title, Long userId) {
        return createBook(title, userId, null);
    }

    @Transactional
    public Book createBook(String title, Long userId, String category) {
        LocalDateTime now = LocalDateTime.now();
        Book book = new Book();
        book.setTitle(title);
        book.setUserId(userId);
        book.setCategory(category);
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
        book.setModifiedDate(LocalDateTime.now());
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
            lastPage.setModifiedDate(LocalDateTime.now());
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
            book.setModifiedDate(LocalDateTime.now());
            bookRepo.save(book);
        }
    }

    /** Archive a book (soft status change) */
    public void archiveBook(Long id) {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            book.setStatus("ARCHIVED");
            book.setModifiedDate(LocalDateTime.now());
            bookRepo.save(book);
        }
    }

    /** Recover a deleted or archived book back to DRAFT */
    public void recoverBook(Long id) {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            book.setStatus("DRAFT");
            book.setModifiedDate(LocalDateTime.now());
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
                String name = (u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "");
                book.setAuthorName(name.trim());
            }
        }
        enrichWithCoverImages(books);
        return books;
    }

    /** Get the published magazine (singleton book with category MAGAZINE) */
    public Book getMagazine() {
        Optional<Book> magOpt = bookRepo.findFirstByCategoryIgnoreCaseOrderByModifiedDateDesc("MAGAZINE");
        if (magOpt.isEmpty()) return null;
        Book mag = magOpt.get();
        mag.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(mag.getId()));
        if (!mag.getPages().isEmpty() && mag.getPages().get(0).getImageUrl() != null) {
            mag.setCoverImageUrl(mag.getPages().get(0).getImageUrl());
        }
        return mag;
    }

    /** Get or create the magazine book (for admin use) */
    @Transactional
    public Book getOrCreateMagazine(Long adminUserId) {
        Book mag = getMagazine();
        if (mag != null) return mag;
        return createBook("Saat Saheli Magazine", adminUserId, "MAGAZINE");
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
                String name = (u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "");
                book.setAuthorName(name.trim());
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
                        return first.contains(authorLower) || last.contains(authorLower);
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
                .collect(Collectors.toList());

        // Enrich with author name and pages
        for (Book book : filtered) {
            if (book.getUserId() != null && userMap.containsKey(book.getUserId())) {
                User u = userMap.get(book.getUserId());
                String name = (u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "");
                book.setAuthorName(name.trim());
            }
            book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        }
        enrichWithCoverImages(filtered);

        return filtered;
    }

    @Transactional
    public Book createBookFromDocument(String title, Long userId, List<String> pageTexts) {
        LocalDateTime now = LocalDateTime.now();
        Book book = new Book();
        book.setTitle(title);
        book.setUserId(userId);
        book.setStatus("DRAFT");
        book.setCreatedDate(now);
        book.setModifiedDate(now);
        book = bookRepo.save(book);

        // Cover page
        Page cover = new Page();
        cover.setBookId(book.getId());
        cover.setPageNumber(1);
        cover.setContent(title);
        cover.setFormat("bold");
        cover.setCreatedDate(now);
        cover.setModifiedDate(now);
        pageRepo.save(cover);

        // Content pages from extracted text
        for (int i = 0; i < pageTexts.size(); i++) {
            Page page = new Page();
            page.setBookId(book.getId());
            page.setPageNumber(i + 2);
            page.setContent(pageTexts.get(i));
            page.setCreatedDate(now);
            page.setModifiedDate(now);
            pageRepo.save(page);
        }

        // Back page — placed right after the last content page
        Page back = new Page();
        back.setBookId(book.getId());
        back.setPageNumber(pageTexts.size() + 2);
        back.setContent("The End");
        back.setFormat("italic");
        back.setCreatedDate(now);
        back.setModifiedDate(now);
        pageRepo.save(back);

        book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        return book;
    }

    @Transactional
    public Book createBookFromPdfImages(String title, Long userId, List<String> imageUrls) {
        LocalDateTime now = LocalDateTime.now();
        Book book = new Book();
        book.setTitle(title);
        book.setUserId(userId);
        book.setStatus("DRAFT");
        book.setCreatedDate(now);
        book.setModifiedDate(now);
        book = bookRepo.save(book);

        // Cover page
        Page cover = new Page();
        cover.setBookId(book.getId());
        cover.setPageNumber(1);
        cover.setContent(title);
        cover.setFormat("bold");
        cover.setCreatedDate(now);
        cover.setModifiedDate(now);
        pageRepo.save(cover);

        // Image pages from rendered PDF — full-page layout
        String fullPageFormat = "{\"layout\":{\"image1\":{\"x\":10,\"y\":0,\"width\":530,\"height\":700}}}";
        for (int i = 0; i < imageUrls.size(); i++) {
            Page page = new Page();
            page.setBookId(book.getId());
            page.setPageNumber(i + 2);
            page.setImageUrl(imageUrls.get(i));
            page.setFormat(fullPageFormat);
            page.setCreatedDate(now);
            page.setModifiedDate(now);
            pageRepo.save(page);
        }

        // Back page — placed right after the last content page
        Page back = new Page();
        back.setBookId(book.getId());
        back.setPageNumber(imageUrls.size() + 2);
        back.setContent("The End");
        back.setFormat("italic");
        back.setCreatedDate(now);
        back.setModifiedDate(now);
        pageRepo.save(back);

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
                }
            }
        }
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
        LocalDateTime now = LocalDateTime.now();
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
        page.setModifiedDate(LocalDateTime.now());
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
}
