package com.example.ragbackend.ai.dto;

import jakarta.validation.constraints.NotBlank;

public record SearchRequest(
    @NotBlank(message = "La question est obligatoire")
    String question
) {}
