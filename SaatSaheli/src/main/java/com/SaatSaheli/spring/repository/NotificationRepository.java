package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Windowed reads: only notifications newer than the retention cutoff are shown.
    List<Notification> findTop50ByRecipientUserIdAndCreatedDateAfterOrderByCreatedDateDesc(
            Long recipientUserId, LocalDateTime cutoff);

    long countByRecipientUserIdAndReadFalseAndCreatedDateAfter(Long recipientUserId, LocalDateTime cutoff);

    // Idempotency guard for the backfill — has this comment already produced notifications?
    boolean existsByCommentId(Long commentId);

    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipientUserId = :userId AND n.read = false")
    int markAllRead(@Param("userId") Long userId);

    // Retention cleanup — remove notifications older than the cutoff.
    @Modifying
    @Transactional
    @Query("DELETE FROM Notification n WHERE n.createdDate < :cutoff")
    int deleteByCreatedDateBefore(@Param("cutoff") LocalDateTime cutoff);
}
