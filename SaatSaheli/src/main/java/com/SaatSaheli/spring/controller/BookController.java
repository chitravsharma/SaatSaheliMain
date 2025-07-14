package com.SaatSaheli.spring.controller;

import java.util.List;

import com.SaatSaheli.spring.model.Page;
import com.SaatSaheli.spring.repository.BookRepository;
import com.SaatSaheli.spring.repository.PageRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.service.BookService;

@RestController
@RequestMapping("/api/books")
@CrossOrigin(origins = "*")
public class BookController {

@Autowired
private BookService bookService;
@Autowired 
private BookRepository bookRepo;
@Autowired 
private PageRepository pageRepo;


@GetMapping("/{bookId}")
public ResponseEntity<Book> getBook(@PathVariable Long bookId) {
    return ResponseEntity.ok(bookService.getBook(bookId));
}

/*@GetMapping("/{bookId}/pages")
public ResponseEntity<List<Page>> getPages(@PathVariable Long bookId) {
    return ResponseEntity.ok(bookService.getPagesByBookId(bookId));
}*/
/*
  ResponseEntity<String> entity = template.getForEntity("https://example.com", String.class);
 String body = entity.getBody();
 MediaType contentType = entity.getHeaders().getContentType();
 HttpStatus statusCode = entity.getStatusCode();
 */

/*
 * @PostMapping("/create") public Book createFlipbook(@RequestParam String
 * title) { Book book = new Book(); book.setTitle(title);
 * 
 * List<Page> defaultPages = List.of( new Page((long) 111,1, "Cover Page",
 * "",null, "bold", book), // new Page(2, "Introduction", null, "", book), //
 * new Page(3, "Table of Contents", null, "", book), new Page(99, "The End",
 * null, "italic", book)
 * 
 * );
 * 
 * book.setPages(defaultPages); return bookRepo.save(book); }
 */
@PostMapping("/{bookId}/page")
public Page addPage(@PathVariable Long bookId, @RequestBody Page page) {
    Book book = bookRepo.findById(bookId).orElseThrow();
    page.setBook(book);
    return pageRepo.save(page);
}

@PutMapping("/page/{pageId}")
public Page updatePage(@PathVariable Long pageId, @RequestBody Page updated) {
    Page page = pageRepo.findById(pageId).orElseThrow();
    page.setContent(updated.getContent());
    page.setImageUrl(updated.getImageUrl());
    page.setFormat(updated.getFormat());
    return pageRepo.save(page);
}

@DeleteMapping("/page/{pageId}")
public void deletePage(@PathVariable Long pageId) {
    pageRepo.deleteById(pageId);
}

@GetMapping("/{bookId}/pages")
public List<Page> getPages(@PathVariable Long bookId) {
    return pageRepo.findByBookIdOrderByPageNumberAsc(bookId);
}
}

/*
 * @PostMapping("/pages/{pageId}/upload-image") public ResponseEntity<?>
 * uploadImage(@PathVariable Long pageId, @RequestParam("file") MultipartFile
 * file) throws IOException { Page page =
 * pageRepository.findById(pageId).orElseThrow(); String fileName =
 * UUID.randomUUID() + "_" + file.getOriginalFilename(); Path filePath =
 * Paths.get("uploads", fileName); Files.copy(file.getInputStream(), filePath,
 * StandardCopyOption.REPLACE_EXISTING);
 * 
 * page.setImageUrl("/uploads/" + fileName); pageRepository.save(page);
 * 
 * return ResponseEntity.ok("Image uploaded"); }
 */



