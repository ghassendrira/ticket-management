package com.example.ragbackend.conversation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ConversationDto(
    UUID id,
    String customerId,
    String status,
    LocalDateTime createdAt,
    List<MessageDto> messages
) {
}
