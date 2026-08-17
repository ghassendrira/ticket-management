package com.ticketmanagement.aiservice.dto;

import java.util.UUID;

public record AnalysisResult(
    UUID ticketId,
    String category,
    Double categoryConfidence,
    String sentiment,
    Double sentimentConfidence,
    AiExplanation explanation
) {}