package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Optional<Favorite> findByUserIdAndTargetTypeAndTargetId(Long userId, String targetType, Long targetId);
    List<Favorite> findByUserIdAndTargetType(Long userId, String targetType);
    int countByTargetTypeAndTargetId(String targetType, Long targetId);
    void deleteByUserIdAndTargetTypeAndTargetId(Long userId, String targetType, Long targetId);
}
