package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    Optional<Conversation> findBySellerIdAndBuyerIdAndTargetTypeAndTargetId(Long sellerId, Long buyerId, String targetType, Long targetId);

    @Query("SELECT c FROM Conversation c WHERE c.sellerId = :uid OR c.buyerId = :uid ORDER BY c.lastMessageAt DESC NULLS LAST, c.id DESC")
    List<Conversation> findMine(@Param("uid") Long userId);

    @Query("SELECT COALESCE(SUM(CASE WHEN c.sellerId = :uid THEN c.sellerUnread ELSE c.buyerUnread END), 0) FROM Conversation c WHERE c.sellerId = :uid OR c.buyerId = :uid")
    long unreadFor(@Param("uid") Long userId);

    List<Conversation> findAllByOrderByLastMessageAtDesc();

    Optional<Conversation> findFirstBySellerIdAndTargetTypeAndTargetIdAndGuestEmailIgnoreCase(
            Long sellerId, String targetType, Long targetId, String guestEmail);
}
