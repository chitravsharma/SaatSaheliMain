package com.SaatSaheli.spring.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.SaatSaheli.spring.model.Article;
import com.SaatSaheli.spring.service.ArticleService;

@RestController
@RequestMapping("/api/articles")
@CrossOrigin(origins = "*")
public class ArticleController {

    @Autowired
    private ArticleService articleService;

    @PostMapping
    public ResponseEntity<?> createArticle(@RequestBody Map<String, Object> body) {
        try {
            Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId").toString()) : null;
            String headline = (String) body.get("headline");
            String content = (String) body.get("content");
            String imageUrl = (String) body.get("imageUrl");
            String contentType = (String) body.get("contentType");
            if (userId == null) {
                return ResponseEntity.badRequest().body(errorMap("userId is required"));
            }
            if (headline == null || headline.isEmpty()) {
                return ResponseEntity.badRequest().body(errorMap("Headline is required"));
            }
            String status = (String) body.get("status");
            Article article = articleService.createArticle(userId, headline, content, imageUrl, contentType, status);
            return ResponseEntity.ok(article);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to create article: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateArticle(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Long userId = body.get("userId") != null ? Long.parseLong(body.get("userId").toString()) : null;
            String headline = (String) body.get("headline");
            String content = (String) body.get("content");
            String imageUrl = (String) body.get("imageUrl");
            String contentType = (String) body.get("contentType");
            String status = (String) body.get("status");
            Article article = articleService.updateArticle(id, userId, headline, content, imageUrl, contentType, status);
            return ResponseEntity.ok(article);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to update article: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteArticle(@PathVariable Long id, @RequestParam(required = false) Long userId) {
        try {
            articleService.deleteArticle(id, userId);
            return ResponseEntity.ok(Map.of("message", "Article deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to delete article: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getArticlesByUser(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(articleService.getArticlesByUser(userId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get articles: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllArticles() {
        try {
            return ResponseEntity.ok(articleService.getAllArticles());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get articles: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getArticle(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(articleService.getArticle(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorMap(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorMap("Failed to get article: " + e.getMessage()));
        }
    }

    private Map<String, String> errorMap(String message) {
        Map<String, String> map = new HashMap<>();
        map.put("error", message);
        return map;
    }
}
