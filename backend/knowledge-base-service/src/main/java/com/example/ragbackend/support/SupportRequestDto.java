package com.example.ragbackend.support;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record SupportRequestDto(
    String eventVersion,
    String eventType,
    UUID requestId,
    UUID customerId,
    UUID conversationId,
    String title,
    String description,
    String predictedCategory,
    String predictedPriority,
    String sentiment,
    List<String> attemptedSolutions,
    LocalDateTime createdAt
) {
    public static final String EVENT_TYPE = "support.request.created";
    public static final String EVENT_VERSION = "v1";
}
