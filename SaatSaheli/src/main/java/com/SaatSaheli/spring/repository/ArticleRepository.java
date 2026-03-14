package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findByUserIdOrderByCreatedDateDesc(Long userId);
    List<Article> findByStatusOrderByCreatedDateDesc(String status);
    List<Article> findAllByOrderByCreatedDateDesc();
}
