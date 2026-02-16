package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.model.Page;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.BookRepository;
import com.SaatSaheli.spring.repository.PageRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BookService {

    private static final Logger log = LoggerFactory.getLogger(BookService.class);
    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

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

            log.info("Found {} orphaned bookIds in Pages table: {}", orphanedBookIds.size(), orphanedBookIds);

            String now = LocalDateTime.now().format(DTF);
            int created = 0;
            for (Long bookId : orphanedBookIds) {
                String title = RANDOM_TITLES[(int) (bookId % RANDOM_TITLES.length)];
                Book book = new Book();
                book.setId(bookId);
                book.setTitle(title + " #" + bookId);
                book.setUserId(1L);
                book.setStatus("DRAFT");
                book.setCreatedDate(now);
                book.setModifiedDate(now);
                bookRepo.saveWithId(book);
                created++;
                log.info("Created missing book: id={}, title='{}'", bookId, book.getTitle());
            }
            log.info("Sync complete - created {} missing books", created);
        } catch (Exception e) {
            log.error("Failed to sync orphaned pages: {}", e.getMessage(), e);
        }
    }

    public Book createBook(String title, Long userId) throws IOException {
        String now = LocalDateTime.now().format(DTF);
        Book book = new Book();
        book.setTitle(title);
        book.setUserId(userId);
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
        back.setPageNumber(99);
        back.setContent("The End");
        back.setFormat("italic");
        back.setCreatedDate(now);
        back.setModifiedDate(now);
        pageRepo.save(back);

        book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        return book;
    }

    public Book getBook(Long id) throws IOException {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isEmpty()) throw new RuntimeException("Book not found");
        Book book = bookOpt.get();
        book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(id));
        return book;
    }

    public Book updateBook(Long id, String title, String status, Long requestUserId) throws IOException {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isEmpty()) throw new RuntimeException("Book not found");
        Book book = bookOpt.get();
        if (requestUserId != null && !requestUserId.equals(book.getUserId())) {
            throw new RuntimeException("Only the author can edit this book");
        }
        if (title != null) book.setTitle(title);
        if (status != null) book.setStatus(status);
        book.setModifiedDate(LocalDateTime.now().format(DTF));
        return bookRepo.save(book);
    }

    public Book publishBook(Long id, Long requestUserId) throws IOException {
        return updateBook(id, null, "PUBLISHED", requestUserId);
    }

    public Book saveDraft(Long id, Long requestUserId) throws IOException {
        return updateBook(id, null, "DRAFT", requestUserId);
    }

    public void deleteBook(Long id, Long requestUserId) throws IOException {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            if (requestUserId != null && !requestUserId.equals(book.getUserId())) {
                throw new RuntimeException("Only the author can delete this book");
            }
            book.setStatus("DELETED");
            book.setModifiedDate(LocalDateTime.now().format(DTF));
            bookRepo.save(book);
        }
    }

    public List<Book> getBooksByUser(Long userId) throws IOException {
        List<Book> books = bookRepo.findByUserId(userId).stream()
                .filter(b -> !"DELETED".equalsIgnoreCase(b.getStatus()))
                .collect(Collectors.toList());
        for (Book book : books) {
            book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        }
        return books;
    }

    public List<Book> getDraftsByUser(Long userId) throws IOException {
        return bookRepo.findByUserIdAndStatus(userId, "DRAFT");
    }

    public List<Book> searchBooks(Long id, String title, String author, String status, Long requestUserId) throws IOException {
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
                .collect(Collectors.toList());

        // Enrich with author name
        for (Book book : filtered) {
            if (book.getUserId() != null && userMap.containsKey(book.getUserId())) {
                User u = userMap.get(book.getUserId());
                String name = (u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "");
                book.setAuthorName(name.trim());
            }
        }

        return filtered;
    }

    public Book createBookFromDocument(String title, Long userId, List<String> pageTexts) throws IOException {
        String now = LocalDateTime.now().format(DTF);
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

        // Back page
        Page back = new Page();
        back.setBookId(book.getId());
        back.setPageNumber(99);
        back.setContent("The End");
        back.setFormat("italic");
        back.setCreatedDate(now);
        back.setModifiedDate(now);
        pageRepo.save(back);

        book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        return book;
    }

    public Book createBookFromPdfImages(String title, Long userId, List<String> imageUrls) throws IOException {
        String now = LocalDateTime.now().format(DTF);
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

        // Back page
        Page back = new Page();
        back.setBookId(book.getId());
        back.setPageNumber(99);
        back.setContent("The End");
        back.setFormat("italic");
        back.setCreatedDate(now);
        back.setModifiedDate(now);
        pageRepo.save(back);

        book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        return book;
    }

    public List<Page> getPagesByBookId(Long bookId) throws IOException {
        return pageRepo.findByBookIdOrderByPageNumberAsc(bookId);
    }

    public Page addPage(Long bookId, Page page, Long requestUserId) throws IOException {
        Optional<Book> bookOpt = bookRepo.findById(bookId);
        if (bookOpt.isPresent() && requestUserId != null && !requestUserId.equals(bookOpt.get().getUserId())) {
            throw new RuntimeException("Only the author can add pages to this book");
        }
        String now = LocalDateTime.now().format(DTF);
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

    public Page updatePage(Long pageId, Page updated, Long requestUserId) throws IOException {
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
        page.setModifiedDate(LocalDateTime.now().format(DTF));
        return pageRepo.save(page);
    }

    public void deletePage(Long pageId, Long requestUserId) throws IOException {
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
