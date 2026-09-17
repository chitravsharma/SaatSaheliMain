package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.ConversationMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, Long> {
    List<ConversationMessage> findByConversationIdOrderByIdAsc(Long conversationId);
    List<ConversationMessage> findByConversationIdAndIdGreaterThanOrderByIdAsc(Long conversationId, Long afterId);
    long countByConversationId(Long conversationId);
}
