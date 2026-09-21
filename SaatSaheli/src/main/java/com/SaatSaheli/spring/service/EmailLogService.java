package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.EmailLog;
import com.SaatSaheli.spring.repository.EmailLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * Persists one EmailLog row per send attempt. Runs in its own transaction so the
 * row survives even when the caller's transaction later rolls back, and never
 * throws — an audit failure must not turn into a failed email or request.
 */
@Service
public class EmailLogService {

    private static final Logger log = LoggerFactory.getLogger(EmailLogService.class);

    @Autowired
    private EmailLogRepository emailLogRepo;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String kind, String recipient, String deliveredTo, String subject,
                       String relatedType, Long relatedId, String reference,
                       String status, String error) {
        try {
            EmailLog row = new EmailLog();
            row.setKind(kind != null ? kind : "OTHER");
            row.setRecipient(truncate(recipient, 255));
            row.setDeliveredTo(truncate(deliveredTo, 500));
            row.setSubject(truncate(subject, 500));
            row.setRelatedType(relatedType);
            row.setRelatedId(relatedId);
            row.setReference(truncate(reference, 64));
            row.setStatus(status);
            row.setError(truncate(error, 1000));
            row.setSentDate(LocalDateTime.now(ZoneOffset.UTC));
            emailLogRepo.save(row);
        } catch (Exception e) {
            log.warn("Could not write email_log row ({} → {}): {}", kind, recipient, e.getMessage());
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
