package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.ContactMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {
    List<ContactMessage> findAllByOrderByCreatedDateDesc();
    List<ContactMessage> findByRatingIsNotNullAndStatusOrderByCreatedDateDesc(String status, org.springframework.data.domain.Pageable pageable);

    // Idempotency lookup: returns the most recent matching submission newer than `since`,
    // used to dedupe rapid duplicate POSTs (double-click, proxy retry, user re-submit on 5xx).
    Optional<ContactMessage> findFirstByEmailAndSubjectAndCreatedDateAfterOrderByCreatedDateDesc(
            String email, String subject, LocalDateTime since);
}
