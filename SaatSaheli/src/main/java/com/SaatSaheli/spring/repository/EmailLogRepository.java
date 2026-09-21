package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.EmailLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    List<EmailLog> findAllByOrderBySentDateDesc(Pageable pageable);
    List<EmailLog> findByRelatedTypeAndRelatedIdOrderBySentDateDesc(String relatedType, Long relatedId);
}
