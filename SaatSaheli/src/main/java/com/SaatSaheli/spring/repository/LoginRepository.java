package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Login;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LoginRepository extends JpaRepository<Login, Long> {
    Optional<Login> findByEmailIgnoreCase(String email);
    Optional<Login> findByUserId(Long userId);
}
