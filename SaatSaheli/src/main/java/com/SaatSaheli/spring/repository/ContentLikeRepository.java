package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.ContentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ContentLikeRepository extends JpaRepository<ContentLike, Long> {
    Optional<ContentLike> findByUserIdAndTargetTypeAndTargetId(Long userId, String targetType, Long targetId);
    List<ContentLike> findByTargetTypeAndTargetId(String targetType, Long targetId);
    int countByTargetTypeAndTargetId(String targetType, Long targetId);
    void deleteByUserIdAndTargetTypeAndTargetId(Long userId, String targetType, Long targetId);
}
