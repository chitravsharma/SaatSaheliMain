package com.SaatSaheli.spring.service;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

import com.SaatSaheli.spring.model.Page;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PathVariable;


import com.SaatSaheli.spring.model.Book;
import com.SaatSaheli.spring.repository.BookRepository;
import com.SaatSaheli.spring.repository.PageRepository;

@Service
public class BookService {

    @Autowired
    private BookRepository bookRepo;

    @Autowired
    private PageRepository pageRepo;

    public List<Page> getPagesByBookId(Long bookId) {
        return pageRepo.findByBookIdOrderByPageNumberAsc(bookId);
    }

    public Book getBook(Long id) {
        return bookRepo.findById(id).orElseThrow(() -> new RuntimeException("Book not found"));
    }
    
    public ResponseEntity<?> uploadImage(@PathVariable Long pageId, @org.springframework.web.bind.annotation.RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        Page page = pageRepo.findById(pageId).orElseThrow();
        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        java.nio.file.Path filePath = Paths.get("uploads", fileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        
        page.setImageUrl("/uploads/" + fileName);
        pageRepo.save(page);

        return ResponseEntity.ok("Image uploaded");
    }

}

