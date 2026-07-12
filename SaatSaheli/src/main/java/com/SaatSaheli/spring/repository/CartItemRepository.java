package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    List<CartItem> findByUserIdOrderByAddedDateAsc(Long userId);
    Optional<CartItem> findByUserIdAndListingId(Long userId, Long listingId);
    boolean existsByUserIdAndListingId(Long userId, Long listingId);

    @Transactional
    void deleteByUserIdAndListingId(Long userId, Long listingId);

    @Transactional
    void deleteByUserId(Long userId);
}
