package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends JpaRepository<Book, Long> {
    List<Book> findByUserId(Long userId);
    List<Book> findByUserIdAndStatusIgnoreCase(Long userId, String status);
}
