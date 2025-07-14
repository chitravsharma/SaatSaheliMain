package com.SaatSaheli.spring.repository;

import java.util.List;

import com.SaatSaheli.spring.model.Page;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PageRepository extends JpaRepository<Page, Long> {
    List<Page> findByBookIdOrderByPageNumberAsc(Long bookId);
}
