package com.example.ragbackend.ai.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record AskRequest(
    @NotBlank(message = "La question est obligatoire")
    String question,
    UUID conversationId
) {}
