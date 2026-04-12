package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Podcast;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PodcastRepository extends JpaRepository<Podcast, Long> {
    List<Podcast> findByUserIdOrderByCreatedDateDesc(Long userId);
    List<Podcast> findByStatusOrderByCreatedDateDesc(String status);
    List<Podcast> findByLanguageAndStatusOrderByCreatedDateDesc(String language, String status);
    List<Podcast> findByCategoryAndStatusOrderByCreatedDateDesc(String category, String status);
    List<Podcast> findAllByOrderByCreatedDateDesc();
}
