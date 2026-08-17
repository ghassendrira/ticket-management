package com.ticketmanagement.aiservice.dto;

public record StoreEmbeddingRequest(
        String ticketContent,
        String resolutionSummary
) {}
