package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.GalleryImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GalleryImageRepository extends JpaRepository<GalleryImage, Long> {
    List<GalleryImage> findByGalleryIdOrderByOrderIndexAsc(Long galleryId);
    void deleteByGalleryId(Long galleryId);
}
