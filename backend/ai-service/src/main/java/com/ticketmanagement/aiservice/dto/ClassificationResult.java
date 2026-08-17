package com.ticketmanagement.aiservice.dto;

public record ClassificationResult(
    String category,
    Double confidence
) {}