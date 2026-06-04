package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface PageRepository extends JpaRepository<Page, Long> {
    List<Page> findByBookIdOrderByPageNumberAsc(Long bookId);

    long countByBookId(Long bookId);

    @Transactional
    void deleteByBookId(Long bookId);
}
