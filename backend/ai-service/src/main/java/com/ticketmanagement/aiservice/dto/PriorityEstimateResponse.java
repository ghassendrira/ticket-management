package com.ticketmanagement.aiservice.dto;

public record PriorityEstimateResponse(
    String ticketId,
    int finalScore,           // 0 - 100
    String priorityLevel,     // LOW / MEDIUM / HIGH / CRITICAL
    double modelScore,        // 0.0 - 100.0
    double businessScore,     // 0.0 - 100.0
    double sentimentScore,    // 0.0 - 100.0
    double ageSlaScore,       // 0.0 - 100.0
    String explanation        // Justification textuelle
) {}