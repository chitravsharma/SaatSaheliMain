package com.SaatSaheli.spring.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.SaatSaheli.spring.model.Book;

public interface BookRepository extends JpaRepository<Book, Long> {
	
}
