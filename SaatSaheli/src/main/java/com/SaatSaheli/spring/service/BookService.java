package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.model.Page;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.BookRepository;
import com.SaatSaheli.spring.repository.PageRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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

    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private BookRepository bookRepo;

    @Autowired
    private PageRepository pageRepo;

    @Autowired
    private UserRepository userRepo;

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

    public Book updateBook(Long id, String title, String status) throws IOException {
        Optional<Book> bookOpt = bookRepo.findById(id);
        if (bookOpt.isEmpty()) throw new RuntimeException("Book not found");
        Book book = bookOpt.get();
        if (title != null) book.setTitle(title);
        if (status != null) book.setStatus(status);
        book.setModifiedDate(LocalDateTime.now().format(DTF));
        return bookRepo.save(book);
    }

    public Book publishBook(Long id) throws IOException {
        return updateBook(id, null, "PUBLISHED");
    }

    public Book saveDraft(Long id) throws IOException {
        return updateBook(id, null, "DRAFT");
    }

    public void deleteBook(Long id) throws IOException {
        pageRepo.deleteByBookId(id);
        bookRepo.deleteById(id);
    }

    public List<Book> getBooksByUser(Long userId) throws IOException {
        List<Book> books = bookRepo.findByUserId(userId);
        for (Book book : books) {
            book.setPages(pageRepo.findByBookIdOrderByPageNumberAsc(book.getId()));
        }
        return books;
    }

    public List<Book> getDraftsByUser(Long userId) throws IOException {
        return bookRepo.findByUserIdAndStatus(userId, "DRAFT");
    }

    public List<Book> searchBooks(Long id, String title, String author, String status) throws IOException {
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

    public List<Page> getPagesByBookId(Long bookId) throws IOException {
        return pageRepo.findByBookIdOrderByPageNumberAsc(bookId);
    }

    public Page addPage(Long bookId, Page page) throws IOException {
        String now = LocalDateTime.now().format(DTF);
        page.setBookId(bookId);
        page.setCreatedDate(now);
        page.setModifiedDate(now);
        Page saved = pageRepo.save(page);
        // Update book modified date
        Optional<Book> bookOpt = bookRepo.findById(bookId);
        if (bookOpt.isPresent()) {
            Book book = bookOpt.get();
            book.setModifiedDate(now);
            bookRepo.save(book);
        }
        return saved;
    }

    public Page updatePage(Long pageId, Page updated) throws IOException {
        Optional<Page> pageOpt = pageRepo.findById(pageId);
        if (pageOpt.isEmpty()) throw new RuntimeException("Page not found");
        Page page = pageOpt.get();
        if (updated.getContent() != null) page.setContent(updated.getContent());
        if (updated.getImageUrl() != null) page.setImageUrl(updated.getImageUrl());
        if (updated.getImageUrl2() != null) page.setImageUrl2(updated.getImageUrl2());
        if (updated.getFormat() != null) page.setFormat(updated.getFormat());
        if (updated.getPageNumber() > 0) page.setPageNumber(updated.getPageNumber());
        page.setModifiedDate(LocalDateTime.now().format(DTF));
        return pageRepo.save(page);
    }

    public void deletePage(Long pageId) throws IOException {
        pageRepo.deleteById(pageId);
    }
}
