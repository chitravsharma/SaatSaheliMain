package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByRoomId(Long roomId);
    List<ChatMessage> findByRoomIdAndIdGreaterThan(Long roomId, Long afterId);
}
