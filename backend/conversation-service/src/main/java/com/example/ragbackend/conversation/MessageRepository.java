package com.example.ragbackend.conversation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<MessageEntity, UUID> {

    List<MessageEntity> findAllByConversationIdOrderByCreatedAtAscIdAsc(UUID conversationId);

    @Query("select avg(m.confidence) from MessageEntity m where m.role = 'ASSISTANT' and m.confidence is not null")
    Double findAverageAssistantConfidence();
}
