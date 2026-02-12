package com.SaatSaheli.spring.controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.SaatSaheli.spring.model.Page;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.service.BookService;

@RestController
@RequestMapping("/api/books")
@CrossOrigin(origins = "*")
public class BookController {

    @Autowired
    private BookService bookService;

    @GetMapping("/search")
    public ResponseEntity<?> searchBooks(
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long userId) {
        try {
            return ResponseEntity.ok(bookService.searchBooks(id, title, author, status, userId));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to search books: " + e.getMessage()));
        }
    }

    @PostMapping("/create")
    public ResponseEntity<?> createBook(@RequestBody Map<String, Object> body) {
        try {
            String title = (String) body.get("title");
            Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId").toString()) : null;
            if (title == null || title.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Title is required"));
            }
            Book book = bookService.createBook(title, userId);
            return ResponseEntity.ok(book);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create book: " + e.getMessage()));
        }
    }

    @GetMapping("/{bookId}")
    public ResponseEntity<?> getBook(@PathVariable Long bookId) {
        try {
            return ResponseEntity.ok(bookService.getBook(bookId));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get book: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
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
        } catch (IOException e) {
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
        } catch (IOException e) {
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
        } catch (IOException e) {
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
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete book: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getBooksByUser(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(bookService.getBooksByUser(userId));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get books: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}/drafts")
    public ResponseEntity<?> getDraftsByUser(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(bookService.getDraftsByUser(userId));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get drafts: " + e.getMessage()));
        }
    }

    @GetMapping("/{bookId}/pages")
    public ResponseEntity<?> getPages(@PathVariable Long bookId) {
        try {
            return ResponseEntity.ok(bookService.getPagesByBookId(bookId));
        } catch (IOException e) {
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
        } catch (IOException e) {
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
        } catch (IOException e) {
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
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete page: " + e.getMessage()));
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
