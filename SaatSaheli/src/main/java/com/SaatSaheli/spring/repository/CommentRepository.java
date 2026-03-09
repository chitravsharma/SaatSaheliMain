package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByTargetTypeAndTargetIdOrderByCreatedDateDesc(String targetType, Long targetId);
    int countByTargetTypeAndTargetIdAndIsDeletedFalse(String targetType, Long targetId);
}
