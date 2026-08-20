package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Gallery;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GalleryRepository extends JpaRepository<Gallery, Long> {
    List<Gallery> findByUserId(Long userId);

    /**
     * Only galleries the owner has explicitly published. Newest activity first, so
     * callers get a sensible order without having to re-sort. NOTE: this is an
     * equality match, so a row with a NULL status is deliberately excluded -- a
     * gallery is public only when it says so.
     */
    List<Gallery> findByStatusIgnoreCaseOrderByModifiedDateDesc(String status);

    /** A single user's galleries, newest activity first. Includes drafts -- callers must filter. */
    List<Gallery> findByUserIdOrderByModifiedDateDesc(Long userId);

    List<Gallery> findAllByOrderByCreatedDateDesc();
}
