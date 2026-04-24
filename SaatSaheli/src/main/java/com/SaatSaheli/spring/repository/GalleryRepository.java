package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Gallery;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GalleryRepository extends JpaRepository<Gallery, Long> {
    List<Gallery> findByUserId(Long userId);
    List<Gallery> findByStatusIgnoreCase(String status);
    List<Gallery> findAllByOrderByCreatedDateDesc();
}
