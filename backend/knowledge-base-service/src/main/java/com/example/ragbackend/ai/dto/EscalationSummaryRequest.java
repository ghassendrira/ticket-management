package com.example.ragbackend.ai.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record EscalationSummaryRequest(
    @NotNull(message = "L'identifiant de conversation est obligatoire")
    UUID conversationId
) {}
