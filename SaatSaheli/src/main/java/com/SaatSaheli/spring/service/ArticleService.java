package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Article;
import com.SaatSaheli.spring.repository.ArticleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ArticleService {

    private static final Logger log = LoggerFactory.getLogger(ArticleService.class);

    @Autowired
    private ArticleRepository articleRepo;

    public Article createArticle(Long userId, String headline, String content, String imageUrl) {
        LocalDateTime now = LocalDateTime.now();
        Article article = new Article();
        article.setUserId(userId);
        article.setHeadline(headline);
        article.setContent(content);
        article.setImageUrl(imageUrl);
        article.setStatus("PUBLISHED");
        article.setCreatedDate(now);
        article.setModifiedDate(now);
        return articleRepo.save(article);
    }

    public Article updateArticle(Long articleId, Long userId, String headline, String content, String imageUrl) {
        Optional<Article> articleOpt = articleRepo.findById(articleId);
        if (articleOpt.isEmpty()) throw new RuntimeException("Article not found");
        Article article = articleOpt.get();
        if (userId != null && !userId.equals(article.getUserId())) {
            throw new RuntimeException("Only the author can edit this article");
        }
        if (headline != null) article.setHeadline(headline);
        if (content != null) article.setContent(content);
        if (imageUrl != null) article.setImageUrl(imageUrl);
        article.setModifiedDate(LocalDateTime.now());
        return articleRepo.save(article);
    }

    public void deleteArticle(Long articleId, Long userId) {
        Optional<Article> articleOpt = articleRepo.findById(articleId);
        if (articleOpt.isEmpty()) throw new RuntimeException("Article not found");
        Article article = articleOpt.get();
        if (userId != null && !userId.equals(article.getUserId())) {
            throw new RuntimeException("Only the author can delete this article");
        }
        articleRepo.deleteById(articleId);
    }

    public List<Article> getArticlesByUser(Long userId) {
        return articleRepo.findByUserIdOrderByCreatedDateDesc(userId);
    }

    public List<Article> getAllArticles() {
        return articleRepo.findByStatusOrderByCreatedDateDesc("PUBLISHED");
    }

    public Article getArticle(Long id) {
        Optional<Article> articleOpt = articleRepo.findById(id);
        if (articleOpt.isEmpty()) throw new RuntimeException("Article not found");
        return articleOpt.get();
    }
}
