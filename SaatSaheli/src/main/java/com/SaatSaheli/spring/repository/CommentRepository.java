package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByTargetTypeAndTargetIdOrderByCreatedDateDesc(String targetType, Long targetId);
    int countByTargetTypeAndTargetIdAndIsDeletedFalse(String targetType, Long targetId);
    List<Comment> findByCreatedDateAfterAndIsDeletedFalseOrderByCreatedDateAsc(LocalDateTime cutoff);
    // Admin feed — includes soft-deleted rows so moderators can see what was removed.
    List<Comment> findByCreatedDateAfterOrderByCreatedDateDesc(LocalDateTime cutoff);
}
