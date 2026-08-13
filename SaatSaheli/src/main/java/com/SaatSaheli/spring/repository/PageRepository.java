package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface PageRepository extends JpaRepository<Page, Long> {
    List<Page> findByBookIdOrderByPageNumberAsc(Long bookId);

    /** First page only — used to derive a cover image without loading every page. */
    Optional<Page> findFirstByBookIdOrderByPageNumberAsc(Long bookId);

    long countByBookId(Long bookId);

    @Transactional
    void deleteByBookId(Long bookId);
}
