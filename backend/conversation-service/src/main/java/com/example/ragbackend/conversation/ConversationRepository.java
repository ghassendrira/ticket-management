package com.example.ragbackend.conversation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<ConversationEntity, UUID> {

    List<ConversationEntity> findAllByOrderByCreatedAtDesc();

    List<ConversationEntity> findAllByCustomerIdOrderByCreatedAtDesc(String customerId);

    long countByStatus(String status);
}
