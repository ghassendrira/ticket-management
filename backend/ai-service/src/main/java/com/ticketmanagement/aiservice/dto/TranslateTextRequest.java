package com.ticketmanagement.aiservice.dto;

import jakarta.validation.constraints.NotBlank;

public record TranslateTextRequest(
    @NotBlank(message = "Text is required")
    String text,

    @NotBlank(message = "Target language code is required")
    String targetLanguageCode,

    @NotBlank(message = "Target language name is required")
    String targetLanguageName
) {}
