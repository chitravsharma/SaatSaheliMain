package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Article;
import com.SaatSaheli.spring.model.User;
import com.SaatSaheli.spring.repository.ArticleRepository;
import com.SaatSaheli.spring.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ArticleService {

    private static final Logger log = LoggerFactory.getLogger(ArticleService.class);

    @Autowired
    private ArticleRepository articleRepo;

    @Autowired
    private UserRepository userRepo;

    public Article createArticle(Long userId, String headline, String content, String imageUrl, String contentType, String status) {
        LocalDateTime now = LocalDateTime.now();
        Article article = new Article();
        article.setUserId(userId);
        article.setHeadline(headline);
        article.setContent(content);
        article.setImageUrl(imageUrl);
        article.setContentType(contentType != null ? contentType : "Article");
        article.setStatus(status != null ? status.toUpperCase() : "PUBLISHED");
        article.setCreatedDate(now);
        article.setModifiedDate(now);
        return articleRepo.save(article);
    }

    public Article createArticle(Long userId, String headline, String content, String imageUrl, String contentType) {
        return createArticle(userId, headline, content, imageUrl, contentType, null);
    }

    public Article createArticle(Long userId, String headline, String content, String imageUrl) {
        return createArticle(userId, headline, content, imageUrl, "Article", null);
    }

    public Article updateArticle(Long articleId, Long userId, String headline, String content, String imageUrl, String contentType, String status) {
        Optional<Article> articleOpt = articleRepo.findById(articleId);
        if (articleOpt.isEmpty()) throw new RuntimeException("Article not found");
        Article article = articleOpt.get();
        if (userId != null && !userId.equals(article.getUserId())) {
            throw new RuntimeException("Only the author can edit this article");
        }
        if (headline != null) article.setHeadline(headline);
        if (content != null) article.setContent(content);
        if (imageUrl != null) article.setImageUrl(imageUrl);
        if (contentType != null) article.setContentType(contentType);
        if (status != null) article.setStatus(status.toUpperCase());
        article.setModifiedDate(LocalDateTime.now());
        return articleRepo.save(article);
    }

    public Article updateArticle(Long articleId, Long userId, String headline, String content, String imageUrl, String contentType) {
        return updateArticle(articleId, userId, headline, content, imageUrl, contentType, null);
    }

    public Article updateArticle(Long articleId, Long userId, String headline, String content, String imageUrl) {
        return updateArticle(articleId, userId, headline, content, imageUrl, null, null);
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
        List<Article> articles = articleRepo.findByStatusOrderByCreatedDateDesc("PUBLISHED");
        enrichWithAuthorNames(articles);
        return articles;
    }

    private void enrichWithAuthorNames(List<Article> articles) {
        Map<Long, User> userMap = userRepo.findAll().stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        for (Article article : articles) {
            if (article.getUserId() != null && userMap.containsKey(article.getUserId())) {
                User u = userMap.get(article.getUserId());
                String name = (u.getDisplayName() != null && !u.getDisplayName().isEmpty())
                        ? u.getDisplayName()
                        : ((u.getFirstName() != null ? u.getFirstName() : "")
                        + (u.getLastName() != null ? " " + u.getLastName() : "")).trim();
                article.setAuthorName(name);
            }
        }
    }

    public Article getArticle(Long id) {
        Optional<Article> articleOpt = articleRepo.findById(id);
        if (articleOpt.isEmpty()) throw new RuntimeException("Article not found");
        return articleOpt.get();
    }
}
