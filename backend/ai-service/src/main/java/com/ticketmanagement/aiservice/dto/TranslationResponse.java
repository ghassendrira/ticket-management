package com.ticketmanagement.aiservice.dto;

public record TranslationResponse(
    String translatedText,
    String targetLanguageCode,
    String targetLanguageName,
    String provider
) {}
