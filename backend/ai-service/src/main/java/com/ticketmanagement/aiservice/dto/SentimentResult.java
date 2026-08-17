package com.ticketmanagement.aiservice.dto;

public record SentimentResult(
    String sentiment,
    Double confidence
) {}