package com.ticketmanagement.aiservice.dto;

public record AiExplanation(
    String categoryReason,
    String sentimentReason
) {}